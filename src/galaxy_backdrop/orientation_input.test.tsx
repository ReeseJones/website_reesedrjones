import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OrientationInputController } from "./orientation_input";

describe("OrientationInputController", () => {
    let originalInnerWidth: number;
    let originalInnerHeight: number;

    beforeEach(() => {
        originalInnerWidth = window.innerWidth;
        originalInnerHeight = window.innerHeight;
        Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1000 });
        Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 1000 });
    });

    afterEach(() => {
        Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: originalInnerWidth });
        Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: originalInnerHeight });
    });

    describe(".attach() & .detach()", () => {
        it("listens to pointermove on window and emits normalized pitch and yaw on update", () => {
            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            controller.attach();

            // Center of screen: clientX = 500, clientY = 500 -> x = 0, y = 0
            const centerEvent = new PointerEvent("pointermove", {
                clientX: 500,
                clientY: 500,
            });
            window.dispatchEvent(centerEvent);

            expect(onUpdateSpy).toHaveBeenCalledWith(-0, 0);

            // Bottom-right: clientX = 1000, clientY = 1000 -> x = 1.0, y = 1.0
            // onUpdate(-y * 0.4, x * 0.5) -> pitch = -0.4, yaw = 0.5
            const bottomRightEvent = new PointerEvent("pointermove", {
                clientX: 1000,
                clientY: 1000,
            });
            window.dispatchEvent(bottomRightEvent);

            expect(onUpdateSpy).toHaveBeenLastCalledWith(-0.4, 0.5);

            controller.detach();
        });

        it("stops responding to pointermove after detach() is called", () => {
            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            controller.attach();
            controller.detach();

            const event = new PointerEvent("pointermove", {
                clientX: 1000,
                clientY: 1000,
            });
            window.dispatchEvent(event);

            expect(onUpdateSpy).not.toHaveBeenCalled();
        });

        it("ignores NaN coordinates gracefully", () => {
            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            controller.attach();

            const nanEvent = new PointerEvent("pointermove", {
                clientX: Number.NaN,
                clientY: Number.NaN,
            });
            window.dispatchEvent(nanEvent);

            expect(onUpdateSpy).not.toHaveBeenCalled();

            controller.detach();
        });
    });

    describe("DeviceOrientation handling", () => {
        it("suppresses pointermove once device orientation sensor becomes active", () => {
            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            // Force mobile UA
            Object.defineProperty(navigator, "userAgent", {
                value: "iPhone Mobile",
                configurable: true,
            });

            controller.attach();

            // Simulate device orientation event
            const orientationEvent = new Event("deviceorientation") as DeviceOrientationEvent;
            Object.defineProperty(orientationEvent, "beta", { value: 45.0 }); // center beta (45 - 45 = 0)
            Object.defineProperty(orientationEvent, "gamma", { value: 0.0 }); // center gamma (0)
            window.dispatchEvent(orientationEvent);

            expect(onUpdateSpy).toHaveBeenCalled();
            onUpdateSpy.mockClear();

            // Now pointermove should be suppressed because isSensorActive is true
            const pointerEvent = new PointerEvent("pointermove", {
                clientX: 1000,
                clientY: 1000,
            });
            window.dispatchEvent(pointerEvent);

            expect(onUpdateSpy).not.toHaveBeenCalled();

            controller.detach();
        });
    });
});
