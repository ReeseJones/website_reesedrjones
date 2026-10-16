// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ReactiveControllerHost } from "lit";
import { VisibilityController } from "./visibility_controller";
import type {
    IIntersectionObserverLike,
    IIntersectionObserverFactory,
    IntersectionObserverCallbackLike,
} from "./visibility_controller_types";
import {
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
    let observerInstances: Array<{
        callback: IntersectionObserverCallbackLike;
        observer: IIntersectionObserverLike;
    }> = [];
    let mockObserverFactory: IIntersectionObserverFactory;

    beforeEach(() => {
        host = new MockElementHost();
        document.body.appendChild(host);
        targetElement = document.createElement("div");
        document.body.appendChild(targetElement);

        observerInstances = [];
        mockObserverFactory = {
            create: vi.fn((cb: IntersectionObserverCallbackLike): IIntersectionObserverLike => {
                const instanceObserver: IIntersectionObserverLike = {
                    observe: vi.fn(),
                    unobserve: vi.fn(),
                    disconnect: vi.fn(),
                };
                observerInstances.push({ callback: cb, observer: instanceObserver });
                return instanceObserver;
            }),
        };

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
        vi.restoreAllMocks();
    });

    describe("constructor", () => {
        it("should register controller with host via host.addController()", () => {
            const controller = new VisibilityController(host, { observerFactory: mockObserverFactory });
            expect(host.controllers).toContain(controller);
        });

        it("should initialize default visibility states", () => {
            const controller = new VisibilityController(host, { observerFactory: mockObserverFactory });
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

            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                pauseWhenHidden: true,
            });
            expect(controller.isHidden).toBe(true);
            expect(controller.isVisible).toBe(false);
        });

        it("should ignore document.hidden in constructor if pauseWhenHidden is false", () => {
            Object.defineProperty(document, "hidden", {
                value: true,
                writable: true,
                configurable: true,
            });

            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                pauseWhenHidden: false,
            });
            expect(controller.isHidden).toBe(false);
            expect(controller.isVisible).toBe(true);
        });
    });

    describe("hostConnected() and hostDisconnected()", () => {
        it("should attach IntersectionObserver and observe target element upon connection", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
            });
            controller.hostConnected();

            expect(mockObserverFactory.create).toHaveBeenCalledTimes(1);
            expect(observerInstances).toHaveLength(1);
            expect(observerInstances[0].observer.observe).toHaveBeenCalledWith(targetElement);
        });

        it("should fallback to host when options.target is omitted", () => {
            const controller = new VisibilityController(host, { observerFactory: mockObserverFactory });
            controller.hostConnected();

            expect(mockObserverFactory.create).toHaveBeenCalledTimes(1);
            expect(observerInstances).toHaveLength(1);
            expect(observerInstances[0].observer.observe).toHaveBeenCalledWith(host);
        });

        it("should listen to visibilitychange on document upon connection", () => {
            const addSpy = vi.spyOn(document, "addEventListener");
            const controller = new VisibilityController(host, { observerFactory: mockObserverFactory });
            controller.hostConnected();

            expect(addSpy).toHaveBeenCalledWith(EVENT_VISIBILITY_CHANGE, expect.any(Function));
        });

        it("should disconnect observer and remove event listener upon disconnection", () => {
            const removeSpy = vi.spyOn(document, "removeEventListener");
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
            });

            controller.hostConnected();
            const observerRecord = observerInstances[0];

            controller.hostDisconnected();
            expect(observerRecord.observer.disconnect).toHaveBeenCalledTimes(1);
            expect(removeSpy).toHaveBeenCalledWith(EVENT_VISIBILITY_CHANGE, expect.any(Function));
        });

        it("should not create IntersectionObserver when pauseWhenOffscreen is false", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
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
                observerFactory: mockObserverFactory,
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
                observerFactory: mockObserverFactory,
                target: targetElement,
                onChange,
            });
            controller.hostConnected();

            const observerRecord = observerInstances[0];

            // Target intersects viewport
            observerRecord.callback([{ isIntersecting: true, intersectionRatio: 1 }]);
            expect(controller.isOffscreen).toBe(false);
            expect(controller.isVisible).toBe(true);

            // Target moves offscreen
            observerRecord.callback([{ isIntersecting: false, intersectionRatio: 0 }]);
            expect(controller.isOffscreen).toBe(true);
            expect(controller.isVisible).toBe(false);
            expect(onChange).toHaveBeenCalledWith(false);
            expect(host.requestUpdate).toHaveBeenCalled();
        });

        it("should update isOffscreen and isVisible when target re-enters viewport", () => {
            const onChange = vi.fn();
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
                onChange,
            });
            controller.hostConnected();

            const observerRecord = observerInstances[0];

            // Move offscreen first
            observerRecord.callback([{ isIntersecting: false, intersectionRatio: 0 }]);
            expect(controller.isVisible).toBe(false);
            onChange.mockClear();

            // Move onscreen
            observerRecord.callback([{ isIntersecting: true, intersectionRatio: 0.5 }]);
            expect(controller.isOffscreen).toBe(false);
            expect(controller.isVisible).toBe(true);
            expect(onChange).toHaveBeenCalledWith(true);
        });

        it("should treat intersectionRatio <= 0 as offscreen even if isIntersecting is ambiguous", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
            });
            controller.hostConnected();

            const observerRecord = observerInstances[0];
            observerRecord.callback([{ isIntersecting: true, intersectionRatio: 0 }]);

            expect(controller.isOffscreen).toBe(true);
            expect(controller.isVisible).toBe(false);
        });

        it("should ignore empty entries list without crashing", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
            });
            controller.hostConnected();

            const observerRecord = observerInstances[0];
            expect(() => {
                observerRecord.callback([]);
            }).not.toThrow();
        });
    });

    describe("document visibility change handling", () => {
        it("should update isHidden and isVisible when document hidden state changes", () => {
            const onChange = vi.fn();
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                onChange,
            });
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
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                onChange,
            });
            controller.hostConnected();

            // Document already not hidden; dispatching change without state flip
            document.dispatchEvent(new Event(EVENT_VISIBILITY_CHANGE));
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    describe("combined visibility logic", () => {
        it("should require both onscreen AND tab visible for isVisible to be true", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
            });
            controller.hostConnected();

            const observerRecord = observerInstances[0];

            // 1. Both active: onscreen + tab visible
            observerRecord.callback([{ isIntersecting: true, intersectionRatio: 1 }]);
            expect(controller.isVisible).toBe(true);

            // 2. Offscreen + tab visible -> false
            observerRecord.callback([{ isIntersecting: false, intersectionRatio: 0 }]);
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
            observerRecord.callback([{ isIntersecting: true, intersectionRatio: 1 }]);
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

    describe("reconfigure()", () => {
        it("should dynamically disconnect observer and reset isOffscreen when pauseWhenOffscreen is toggled to false", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
                pauseWhenOffscreen: true,
            });
            controller.hostConnected();

            expect(observerInstances).toHaveLength(1);
            const observerRecord = observerInstances[0];

            // Simulate moving offscreen
            observerRecord.callback([{ isIntersecting: false, intersectionRatio: 0 }]);
            expect(controller.isOffscreen).toBe(true);
            expect(controller.isVisible).toBe(false);

            // Reconfigure to disable offscreen pausing
            controller.reconfigure({ pauseWhenOffscreen: false });

            expect(observerRecord.observer.disconnect).toHaveBeenCalled();
            expect(controller.isOffscreen).toBe(false);
            expect(controller.isVisible).toBe(true);
        });

        it("should dynamically create observer and observe target when pauseWhenOffscreen is toggled to true", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
                pauseWhenOffscreen: false,
            });
            controller.hostConnected();

            expect(observerInstances).toHaveLength(0);

            // Reconfigure to enable offscreen pausing
            controller.reconfigure({ pauseWhenOffscreen: true });

            expect(observerInstances).toHaveLength(1);
            expect(observerInstances[0].observer.observe).toHaveBeenCalledWith(targetElement);
        });

        it("should dynamically remove visibilitychange listener and reset isHidden when pauseWhenHidden is toggled to false", () => {
            const removeSpy = vi.spyOn(document, "removeEventListener");
            Object.defineProperty(document, "hidden", {
                value: true,
                writable: true,
                configurable: true,
            });

            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                pauseWhenHidden: true,
            });
            controller.hostConnected();

            expect(controller.isHidden).toBe(true);
            expect(controller.isVisible).toBe(false);

            // Reconfigure to disable hidden pausing
            controller.reconfigure({ pauseWhenHidden: false });

            expect(removeSpy).toHaveBeenCalledWith(EVENT_VISIBILITY_CHANGE, expect.any(Function));
            expect(controller.isHidden).toBe(false);
            expect(controller.isVisible).toBe(true);
        });

        it("should dynamically attach visibilitychange listener and sync state when pauseWhenHidden is toggled to true", () => {
            const addSpy = vi.spyOn(document, "addEventListener");
            Object.defineProperty(document, "hidden", {
                value: true,
                writable: true,
                configurable: true,
            });

            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                pauseWhenHidden: false,
            });
            controller.hostConnected();

            expect(controller.isHidden).toBe(false);

            // Reconfigure to enable hidden pausing while tab is hidden
            controller.reconfigure({ pauseWhenHidden: true });

            expect(addSpy).toHaveBeenCalledWith(EVENT_VISIBILITY_CHANGE, expect.any(Function));
            expect(controller.isHidden).toBe(true);
            expect(controller.isVisible).toBe(false);
        });

        it("should disconnect old observer and observe new target when target is changed", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
                pauseWhenOffscreen: true,
            });
            controller.hostConnected();

            const firstObserver = observerInstances[0].observer;
            const newTarget = document.createElement("section");
            document.body.appendChild(newTarget);

            controller.reconfigure({ target: newTarget });

            expect(firstObserver.disconnect).toHaveBeenCalled();
            expect(observerInstances).toHaveLength(2);
            expect(observerInstances[1].observer.observe).toHaveBeenCalledWith(newTarget);

            newTarget.remove();
        });

        it("should safely update options without attaching DOM observers if host is not connected", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
                pauseWhenOffscreen: false,
            });

            // Reconfigure while disconnected
            controller.reconfigure({ pauseWhenOffscreen: true });
            expect(observerInstances).toHaveLength(0);

            // Observers attach once hostConnected is called
            controller.hostConnected();
            expect(observerInstances).toHaveLength(1);
            expect(observerInstances[0].observer.observe).toHaveBeenCalledWith(targetElement);
        });

        it("should support reconfigure() without arguments to resynchronize active state", () => {
            const controller = new VisibilityController(host, {
                observerFactory: mockObserverFactory,
                target: targetElement,
                pauseWhenOffscreen: true,
            });
            controller.hostConnected();

            expect(() => controller.reconfigure()).not.toThrow();
        });
    });
});
