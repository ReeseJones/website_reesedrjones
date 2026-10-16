// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ReactiveControllerHost } from "lit";
import { VisibilityController } from "./visibility_controller";
import {
    DEFAULT_PAUSE_WHEN_HIDDEN,
    DEFAULT_PAUSE_WHEN_OFFSCREEN,
    EVENT_VISIBILITY_CHANGE,
} from "./visibility_controller_constants";

class MockElementHost extends HTMLElement implements ReactiveControllerHost {
    public updateComplete = Promise.resolve(true);
    public readonly controllers: unknown[] = [];
    public requestUpdate = vi.fn();

    public addController(controller: unknown): void {
        this.controllers.push(controller);
    }

    public removeController(controller: unknown): void {
        const index = this.controllers.indexOf(controller);
        if (index !== -1) {
            this.controllers.splice(index, 1);
        }
    }
}

if (!customElements.get("mock-visibility-element-host")) {
    customElements.define("mock-visibility-element-host", MockElementHost);
}

describe("VisibilityController", () => {
    let host: MockElementHost;
    let targetElement: HTMLDivElement;
    let originalIntersectionObserver: typeof IntersectionObserver | undefined;
    let observerInstances: Array<{
        callback: IntersectionObserverCallback;
        observe: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
        unobserve: ReturnType<typeof vi.fn>;
    }> = [];

    beforeEach(() => {
        host = new MockElementHost();
        document.body.appendChild(host);
        targetElement = document.createElement("div");
        document.body.appendChild(targetElement);

        observerInstances = [];
        originalIntersectionObserver = globalThis.IntersectionObserver;

        class FakeIntersectionObserver implements IntersectionObserver {
            public callback: IntersectionObserverCallback;
            public root = null;
            public rootMargin = "0px";
            public scrollMargin = "";
            public thresholds = [0];
            public observe = vi.fn();
            public disconnect = vi.fn();
            public unobserve = vi.fn();
            public takeRecords = vi.fn(() => []);

            public constructor(cb: IntersectionObserverCallback) {
                this.callback = cb;
                observerInstances.push(this);
            }
        }

        globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;

        // Default document.hidden to false
        Object.defineProperty(document, "hidden", {
            value: false,
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        host.remove();
        targetElement.remove();
        document.body.innerHTML = "";
        globalThis.IntersectionObserver = originalIntersectionObserver as typeof IntersectionObserver;
        vi.restoreAllMocks();
    });

    describe("constructor", () => {
        it("should register controller with host via host.addController()", () => {
            const controller = new VisibilityController(host);
            expect(host.controllers).toContain(controller);
        });

        it("should initialize default visibility states", () => {
            const controller = new VisibilityController(host);
            expect(controller.isOffscreen).toBe(false);
            expect(controller.isHidden).toBe(false);
            expect(controller.isVisible).toBe(true);
        });

        it("should initialize isHidden based on document.hidden if pauseWhenHidden is true", () => {
            Object.defineProperty(document, "hidden", {
                value: true,
                writable: true,
                configurable: true,
            });

            const controller = new VisibilityController(host, { pauseWhenHidden: true });
            expect(controller.isHidden).toBe(true);
            expect(controller.isVisible).toBe(false);
        });

        it("should ignore document.hidden in constructor if pauseWhenHidden is false", () => {
            Object.defineProperty(document, "hidden", {
                value: true,
                writable: true,
                configurable: true,
            });

            const controller = new VisibilityController(host, { pauseWhenHidden: false });
            expect(controller.isHidden).toBe(false);
            expect(controller.isVisible).toBe(true);
        });
    });

    describe("hostConnected() and hostDisconnected()", () => {
        it("should attach IntersectionObserver and observe target element upon connection", () => {
            const controller = new VisibilityController(host, { target: targetElement });
            controller.hostConnected();

            expect(observerInstances).toHaveLength(1);
            expect(observerInstances[0].observe).toHaveBeenCalledWith(targetElement);
        });

        it("should fallback to host when options.target is omitted", () => {
            const controller = new VisibilityController(host);
            controller.hostConnected();

            expect(observerInstances).toHaveLength(1);
            expect(observerInstances[0].observe).toHaveBeenCalledWith(host);
        });

        it("should listen to visibilitychange on document upon connection", () => {
            const addSpy = vi.spyOn(document, "addEventListener");
            const controller = new VisibilityController(host);
            controller.hostConnected();

            expect(addSpy).toHaveBeenCalledWith(EVENT_VISIBILITY_CHANGE, expect.any(Function));
        });

        it("should disconnect observer and remove event listener upon disconnection", () => {
            const removeSpy = vi.spyOn(document, "removeEventListener");
            const controller = new VisibilityController(host, { target: targetElement });

            controller.hostConnected();
            const observer = observerInstances[0];

            controller.hostDisconnected();
            expect(observer.disconnect).toHaveBeenCalledTimes(1);
            expect(removeSpy).toHaveBeenCalledWith(EVENT_VISIBILITY_CHANGE, expect.any(Function));
        });

        it("should not create IntersectionObserver when pauseWhenOffscreen is false", () => {
            const controller = new VisibilityController(host, {
                target: targetElement,
                pauseWhenOffscreen: false,
            });
            controller.hostConnected();

            expect(observerInstances).toHaveLength(0);
            expect(controller.isOffscreen).toBe(false);
        });

        it("should not listen to visibilitychange when pauseWhenHidden is false", () => {
            const addSpy = vi.spyOn(document, "addEventListener");
            const controller = new VisibilityController(host, {
                pauseWhenHidden: false,
            });
            controller.hostConnected();

            expect(addSpy).not.toHaveBeenCalledWith(EVENT_VISIBILITY_CHANGE, expect.any(Function));
            expect(controller.isHidden).toBe(false);
        });
    });

    describe("intersection change handling", () => {
        it("should update isOffscreen and isVisible when target moves offscreen", () => {
            const onChange = vi.fn();
            const controller = new VisibilityController(host, {
                target: targetElement,
                onChange,
            });
            controller.hostConnected();

            const observer = observerInstances[0];

            // Target intersects viewport
            observer.callback(
                [{ isIntersecting: true, intersectionRatio: 1 } as unknown as IntersectionObserverEntry],
                observer as unknown as IntersectionObserver
            );
            expect(controller.isOffscreen).toBe(false);
            expect(controller.isVisible).toBe(true);

            // Target moves offscreen
            observer.callback(
                [{ isIntersecting: false, intersectionRatio: 0 } as unknown as IntersectionObserverEntry],
                observer as unknown as IntersectionObserver
            );
            expect(controller.isOffscreen).toBe(true);
            expect(controller.isVisible).toBe(false);
            expect(onChange).toHaveBeenCalledWith(false);
            expect(host.requestUpdate).toHaveBeenCalled();
        });

        it("should update isOffscreen and isVisible when target re-enters viewport", () => {
            const onChange = vi.fn();
            const controller = new VisibilityController(host, {
                target: targetElement,
                onChange,
            });
            controller.hostConnected();

            const observer = observerInstances[0];

            // Move offscreen first
            observer.callback(
                [{ isIntersecting: false, intersectionRatio: 0 } as unknown as IntersectionObserverEntry],
                observer as unknown as IntersectionObserver
            );
            expect(controller.isVisible).toBe(false);
            onChange.mockClear();

            // Move onscreen
            observer.callback(
                [{ isIntersecting: true, intersectionRatio: 0.5 } as unknown as IntersectionObserverEntry],
                observer as unknown as IntersectionObserver
            );
            expect(controller.isOffscreen).toBe(false);
            expect(controller.isVisible).toBe(true);
            expect(onChange).toHaveBeenCalledWith(true);
        });

        it("should treat intersectionRatio <= 0 as offscreen even if isIntersecting is ambiguous", () => {
            const controller = new VisibilityController(host, { target: targetElement });
            controller.hostConnected();

            const observer = observerInstances[0];
            observer.callback(
                [{ isIntersecting: true, intersectionRatio: 0 } as unknown as IntersectionObserverEntry],
                observer as unknown as IntersectionObserver
            );

            expect(controller.isOffscreen).toBe(true);
            expect(controller.isVisible).toBe(false);
        });

        it("should ignore empty entries list without crashing", () => {
            const controller = new VisibilityController(host, { target: targetElement });
            controller.hostConnected();

            const observer = observerInstances[0];
            expect(() => {
                observer.callback([], observer as unknown as IntersectionObserver);
            }).not.toThrow();
        });
    });

    describe("document visibility change handling", () => {
        it("should update isHidden and isVisible when document hidden state changes", () => {
            const onChange = vi.fn();
            const controller = new VisibilityController(host, { onChange });
            controller.hostConnected();

            // Simulate tab hidden
            Object.defineProperty(document, "hidden", {
                value: true,
                writable: true,
                configurable: true,
            });
            document.dispatchEvent(new Event(EVENT_VISIBILITY_CHANGE));

            expect(controller.isHidden).toBe(true);
            expect(controller.isVisible).toBe(false);
            expect(onChange).toHaveBeenCalledWith(false);
            expect(host.requestUpdate).toHaveBeenCalled();

            // Simulate tab visible again
            Object.defineProperty(document, "hidden", {
                value: false,
                writable: true,
                configurable: true,
            });
            document.dispatchEvent(new Event(EVENT_VISIBILITY_CHANGE));

            expect(controller.isHidden).toBe(false);
            expect(controller.isVisible).toBe(true);
            expect(onChange).toHaveBeenCalledWith(true);
        });

        it("should not fire onChange if document visibility event fired with identical state", () => {
            const onChange = vi.fn();
            const controller = new VisibilityController(host, { onChange });
            controller.hostConnected();

            // Document already not hidden; dispatching change without state flip
            document.dispatchEvent(new Event(EVENT_VISIBILITY_CHANGE));
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    describe("combined visibility logic", () => {
        it("should require both onscreen AND tab visible for isVisible to be true", () => {
            const controller = new VisibilityController(host, { target: targetElement });
            controller.hostConnected();

            const observer = observerInstances[0];

            // 1. Both active: onscreen + tab visible
            observer.callback(
                [{ isIntersecting: true, intersectionRatio: 1 } as unknown as IntersectionObserverEntry],
                observer as unknown as IntersectionObserver
            );
            expect(controller.isVisible).toBe(true);

            // 2. Offscreen + tab visible -> false
            observer.callback(
                [{ isIntersecting: false, intersectionRatio: 0 } as unknown as IntersectionObserverEntry],
                observer as unknown as IntersectionObserver
            );
            expect(controller.isVisible).toBe(false);

            // 3. Offscreen + tab hidden -> false
            Object.defineProperty(document, "hidden", {
                value: true,
                writable: true,
                configurable: true,
            });
            document.dispatchEvent(new Event(EVENT_VISIBILITY_CHANGE));
            expect(controller.isVisible).toBe(false);

            // 4. Onscreen + tab hidden -> false
            observer.callback(
                [{ isIntersecting: true, intersectionRatio: 1 } as unknown as IntersectionObserverEntry],
                observer as unknown as IntersectionObserver
            );
            expect(controller.isVisible).toBe(false);

            // 5. Back to tab visible + onscreen -> true
            Object.defineProperty(document, "hidden", {
                value: false,
                writable: true,
                configurable: true,
            });
            document.dispatchEvent(new Event(EVENT_VISIBILITY_CHANGE));
            expect(controller.isVisible).toBe(true);
        });
    });
});
