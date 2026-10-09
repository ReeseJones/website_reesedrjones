import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResizeCallbackRef } from "./use_resize_callback_ref";
import type { Dimensions, ResizeCallback } from "./use_resize_callback_ref_types";

describe("useResizeCallbackRef()", () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let capturedCallback: ((entries: ResizeObserverEntry[], observer: ResizeObserver) => void) | null = null;
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    mockUnobserve = vi.fn();
    capturedCallback = null;

    globalThis.ResizeObserver = class MockResizeObserver {
      constructor(callback: (entries: ResizeObserverEntry[], observer: ResizeObserver) => void) {
        capturedCallback = callback;
      }
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = mockDisconnect;
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it("returns a callback function", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() => useResizeCallbackRef(onResize));
    expect(typeof result.current).toBe("function");
  });

  it("observes the element when node is passed", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() => useResizeCallbackRef(onResize));
    const element = document.createElement("div");

    act(() => {
      result.current(element);
    });

    expect(mockObserve).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledWith(element);
  });

  it("dispatches resize callback with contentBoxSize dimensions", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() => useResizeCallbackRef(onResize));
    const element = document.createElement("div");

    act(() => {
      result.current(element);
    });

    expect(capturedCallback).not.toBeNull();

    act(() => {
      capturedCallback!([
        {
          target: element,
          contentBoxSize: [{ inlineSize: 800, blockSize: 600 }],
          contentRect: { width: 0, height: 0 } as DOMRectReadOnly,
        } as unknown as ResizeObserverEntry,
      ], {} as ResizeObserver);
    });

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith({ width: 800, height: 600 }, element);
  });

  it("falls back to contentRect when contentBoxSize is absent", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() => useResizeCallbackRef(onResize));
    const element = document.createElement("div");

    act(() => {
      result.current(element);
    });

    act(() => {
      capturedCallback!([
        {
          target: element,
          contentRect: { width: 450, height: 300 } as DOMRectReadOnly,
        } as unknown as ResizeObserverEntry,
      ], {} as ResizeObserver);
    });

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith({ width: 450, height: 300 }, element);
  });

  it("handles empty entries safely without invoking callback", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() => useResizeCallbackRef(onResize));
    const element = document.createElement("div");

    act(() => {
      result.current(element);
    });

    act(() => {
      capturedCallback!([], {} as ResizeObserver);
    });

    expect(onResize).not.toHaveBeenCalled();
  });

  it("disconnects when called with null node", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() => useResizeCallbackRef(onResize));
    const element = document.createElement("div");

    act(() => {
      result.current(element);
    });
    expect(mockDisconnect).not.toHaveBeenCalled();

    act(() => {
      result.current(null);
    });
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("disconnects when the returned cleanup function is invoked (React 19 ref cleanup)", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() => useResizeCallbackRef(onResize));
    const element = document.createElement("div");

    let cleanup: (() => void) | void = undefined;
    act(() => {
      cleanup = result.current(element);
    });

    expect(typeof cleanup).toBe("function");
    expect(mockDisconnect).not.toHaveBeenCalled();

    act(() => {
      if (cleanup) {
        cleanup();
      }
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("disconnects previous observer when switching to a different element", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() => useResizeCallbackRef(onResize));
    const element1 = document.createElement("div");
    const element2 = document.createElement("section");

    act(() => {
      result.current(element1);
    });
    expect(mockObserve).toHaveBeenCalledWith(element1);

    act(() => {
      result.current(element2);
    });
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledWith(element2);
  });

  it("disconnects observer upon hook unmount", () => {
    const onResize = vi.fn();
    const { result, unmount } = renderHook(() => useResizeCallbackRef(onResize));
    const element = document.createElement("div");

    act(() => {
      result.current(element);
    });
    expect(mockDisconnect).not.toHaveBeenCalled();

    unmount();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("maintains stable ref callback identity when onResize changes", () => {
    let callbackInstance: ResizeCallback = vi.fn();
    const { result, rerender } = renderHook(
      ({ cb }: { cb: ResizeCallback }) => useResizeCallbackRef(cb),
      { initialProps: { cb: callbackInstance } }
    );

    const initialRefCallback = result.current;

    callbackInstance = vi.fn();
    rerender({ cb: callbackInstance });

    expect(result.current).toBe(initialRefCallback);
  });

  it("calls the latest onResize callback after rerender without reconnecting", () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const { result, rerender } = renderHook(
      ({ cb }: { cb: ResizeCallback }) => useResizeCallbackRef(cb),
      { initialProps: { cb: firstCallback } }
    );

    const element = document.createElement("div");
    act(() => {
      result.current(element);
    });

    rerender({ cb: secondCallback });

    // Ensure observer wasn't re-created or disconnected during rerender
    expect(mockDisconnect).not.toHaveBeenCalled();

    act(() => {
      capturedCallback!([
        {
          target: element,
          contentRect: { width: 1024, height: 768 } as DOMRectReadOnly,
        } as unknown as ResizeObserverEntry,
      ], {} as ResizeObserver);
    });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith({ width: 1024, height: 768 }, element);
  });
});
