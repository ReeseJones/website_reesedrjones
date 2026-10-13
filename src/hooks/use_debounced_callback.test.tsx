import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedCallback } from "./use_debounced_callback";

describe("useDebouncedCallback()", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it("defers callback execution until delay has elapsed", () => {
        const spy = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(spy, 200));

        act(() => {
            result.current("test-arg");
        });

        expect(spy).not.toHaveBeenCalled();
        expect(result.current.isPending()).toBe(true);

        act(() => {
            vi.advanceTimersByTime(199);
        });

        expect(spy).not.toHaveBeenCalled();
        expect(result.current.isPending()).toBe(true);

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith("test-arg");
        expect(result.current.isPending()).toBe(false);
    });

    it("coalesces rapid invocations and uses the latest arguments", () => {
        const spy = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(spy, 300));

        act(() => {
            result.current(1);
        });
        act(() => {
            vi.advanceTimersByTime(100);
            result.current(2);
        });
        act(() => {
            vi.advanceTimersByTime(100);
            result.current(3);
        });

        expect(spy).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(3);
        expect(result.current.isPending()).toBe(false);
    });

    it("cancel() clears pending execution and resets isPending state", () => {
        const spy = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(spy, 200));

        act(() => {
            result.current("cancel-me");
        });

        expect(result.current.isPending()).toBe(true);

        act(() => {
            result.current.cancel();
        });

        expect(result.current.isPending()).toBe(false);

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(spy).not.toHaveBeenCalled();
    });

    it("flush() immediately invokes the pending callback with latest args", () => {
        const spy = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(spy, 200));

        act(() => {
            result.current("flush-me");
        });

        expect(spy).not.toHaveBeenCalled();

        act(() => {
            result.current.flush();
        });

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith("flush-me");
        expect(result.current.isPending()).toBe(false);

        // Subsequent timer expiration should not trigger a second invocation
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("flush() is a no-op if no invocation is pending", () => {
        const spy = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(spy, 200));

        act(() => {
            result.current.flush();
        });

        expect(spy).not.toHaveBeenCalled();
    });

    it("cancels pending execution on unmount by default", () => {
        const spy = vi.fn();
        const { result, unmount } = renderHook(() => useDebouncedCallback(spy, 200));

        act(() => {
            result.current("unmount-arg");
        });

        unmount();

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(spy).not.toHaveBeenCalled();
    });

    it("flushes pending execution on unmount when flushOnUnmount option is true", () => {
        const spy = vi.fn();
        const { result, unmount } = renderHook(() =>
            useDebouncedCallback(spy, 200, { flushOnUnmount: true })
        );

        act(() => {
            result.current("saved-on-unmount");
        });

        expect(spy).not.toHaveBeenCalled();

        unmount();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith("saved-on-unmount");
    });

    it("always invokes the latest callback instance without resetting pending timer", () => {
        let currentPrefix = "v1:";
        const { result, rerender } = renderHook(
            ({ prefix }) =>
                useDebouncedCallback((val: string) => `${prefix}${val}`, 200),
            { initialProps: { prefix: currentPrefix } }
        );

        const spy = vi.fn();
        const { result: hookResult, rerender: hookRerender } = renderHook(
            ({ cb }) => useDebouncedCallback(cb, 200),
            { initialProps: { cb: spy } }
        );

        act(() => {
            hookResult.current("arg");
        });

        // Re-render with a new callback reference mid-timer
        const newSpy = vi.fn();
        hookRerender({ cb: newSpy });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(spy).not.toHaveBeenCalled();
        expect(newSpy).toHaveBeenCalledTimes(1);
        expect(newSpy).toHaveBeenCalledWith("arg");
    });
});
