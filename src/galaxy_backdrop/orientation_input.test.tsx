import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OrientationInputController } from "./orientation_input";
import type { OrientationSensorLike } from "./orientation_types";

describe("OrientationInputController", () => {
    let originalInnerWidth: number;
    let originalInnerHeight: number;
    let originalUserAgent: string;
    let originalMaxTouchPoints: number;

    beforeEach(() => {
        originalInnerWidth = window.innerWidth;
        originalInnerHeight = window.innerHeight;
        originalUserAgent = navigator.userAgent;
        originalMaxTouchPoints = navigator.maxTouchPoints;

        Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1000 });
        Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 1000 });
        Object.defineProperty(navigator, "userAgent", { writable: true, configurable: true, value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" });
        Object.defineProperty(navigator, "maxTouchPoints", { writable: true, configurable: true, value: 10 });
    });

    afterEach(() => {
        Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: originalInnerWidth });
        Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: originalInnerHeight });
        Object.defineProperty(navigator, "userAgent", { writable: true, configurable: true, value: originalUserAgent });
        Object.defineProperty(navigator, "maxTouchPoints", { writable: true, configurable: true, value: originalMaxTouchPoints });
        delete (window as unknown as Record<string, unknown>).RelativeOrientationSensor;
        delete (window as unknown as Record<string, unknown>).AbsoluteOrientationSensor;
    });

    describe(".attach() & .detach() on Desktop", () => {
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

        it("does not attach deviceorientation on Windows desktop even when maxTouchPoints > 0", () => {
            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            controller.attach();

            const orientationEvent = new Event("deviceorientation") as DeviceOrientationEvent;
            Object.defineProperty(orientationEvent, "beta", { value: 60.0 });
            Object.defineProperty(orientationEvent, "gamma", { value: 20.0 });
            window.dispatchEvent(orientationEvent);

            expect(onUpdateSpy).not.toHaveBeenCalled();

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

    describe("Tier 1: iOS 13+ Permission Gating", () => {
        it("requests iOS permission upon the first touchend user gesture", async () => {
            const requestPermissionSpy = vi.fn().mockResolvedValue("granted");
            const originalDeviceOrientation = (window as unknown as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent;

            const mockDeviceOrientation = function () {} as unknown as typeof DeviceOrientationEvent & {
                requestPermission: () => Promise<string>;
            };
            mockDeviceOrientation.requestPermission = requestPermissionSpy;
            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: mockDeviceOrientation,
                configurable: true,
                writable: true,
            });

            Object.defineProperty(navigator, "userAgent", {
                value: "iPhone Mobile",
                configurable: true,
            });

            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            controller.attach();

            // Dispatch touchend user gesture
            const touchEvent = new Event("touchend");
            window.dispatchEvent(touchEvent);

            await Promise.resolve();

            expect(requestPermissionSpy).toHaveBeenCalledTimes(1);

            // Simulate orientation event now that permission was granted
            const orientationEvent = new Event("deviceorientation") as DeviceOrientationEvent;
            Object.defineProperty(orientationEvent, "beta", { value: 80.0 });
            Object.defineProperty(orientationEvent, "gamma", { value: 35.0 });
            window.dispatchEvent(orientationEvent);

            expect(onUpdateSpy).toHaveBeenCalled();

            controller.detach();

            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: originalDeviceOrientation,
                configurable: true,
                writable: true,
            });
        });

        it("recognizes iPadOS (Macintosh userAgent with maxTouchPoints > 1) as mobile", async () => {
            const requestPermissionSpy = vi.fn().mockResolvedValue("granted");
            const originalDeviceOrientation = (window as unknown as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent;

            const mockDeviceOrientation = function () {} as unknown as typeof DeviceOrientationEvent & {
                requestPermission: () => Promise<string>;
            };
            mockDeviceOrientation.requestPermission = requestPermissionSpy;
            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: mockDeviceOrientation,
                configurable: true,
                writable: true,
            });

            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                configurable: true,
            });
            Object.defineProperty(navigator, "maxTouchPoints", {
                value: 5,
                configurable: true,
            });

            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            controller.attach();

            window.dispatchEvent(new Event("click"));
            await Promise.resolve();

            expect(requestPermissionSpy).toHaveBeenCalledTimes(1);

            controller.detach();

            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: originalDeviceOrientation,
                configurable: true,
                writable: true,
            });
        });
    });

    describe("Tier 2: W3C Generic Sensor API (RelativeOrientationSensor)", () => {
        it("reads quaternion from RelativeOrientationSensor and converts to pitch and yaw", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile",
                configurable: true,
            });

            let readingHandler: (() => void) | null = null;
            const startSpy = vi.fn();
            const stopSpy = vi.fn();

            const mockSensorInstance: OrientationSensorLike = {
                quaternion: [0, 0, 0, 1], // Identity quaternion -> pitch = 0, yaw = 0
                start: startSpy,
                stop: stopSpy,
                addEventListener: vi.fn((type: string, listener: () => void) => {
                    if (type === "reading") readingHandler = listener;
                }),
                removeEventListener: vi.fn(),
            };

            class MockRelativeOrientationSensor {
                constructor() {
                    return mockSensorInstance;
                }
            }

            Object.defineProperty(window, "RelativeOrientationSensor", {
                value: MockRelativeOrientationSensor,
                configurable: true,
                writable: true,
            });

            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            controller.attach();

            expect(startSpy).toHaveBeenCalledTimes(1);
            expect(readingHandler).not.toBeNull();

            // Trigger sensor reading
            readingHandler!();
            expect(onUpdateSpy).toHaveBeenCalledWith(-0, 0);

            controller.detach();
            expect(stopSpy).toHaveBeenCalledTimes(1);
        });

        it("falls back to DeviceOrientationEvent when RelativeOrientationSensor emits an error", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile",
                configurable: true,
            });

            let errorHandler: (() => void) | null = null;
            const stopSpy = vi.fn();

            const mockSensorInstance: OrientationSensorLike = {
                quaternion: undefined,
                start: vi.fn(),
                stop: stopSpy,
                addEventListener: vi.fn((type: string, listener: () => void) => {
                    if (type === "error") errorHandler = listener;
                }),
                removeEventListener: vi.fn(),
            };

            class MockRelativeOrientationSensor {
                constructor() {
                    return mockSensorInstance;
                }
            }

            Object.defineProperty(window, "RelativeOrientationSensor", {
                value: MockRelativeOrientationSensor,
                configurable: true,
                writable: true,
            });
            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: function () {},
                configurable: true,
                writable: true,
            });

            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            controller.attach();

            expect(errorHandler).not.toBeNull();
            // Simulate sensor error (e.g. blocked by Permissions-Policy)
            errorHandler!();

            expect(stopSpy).toHaveBeenCalledTimes(1);

            // Verify fallback DeviceOrientationEvent listener is now active
            const orientationEvent = new Event("deviceorientation") as DeviceOrientationEvent;
            Object.defineProperty(orientationEvent, "beta", { value: 80.0 });
            Object.defineProperty(orientationEvent, "gamma", { value: 35.0 });
            window.dispatchEvent(orientationEvent);

            expect(onUpdateSpy).toHaveBeenCalledWith(-0.45, 0.55);

            controller.detach();
        });
    });

    describe("Tier 3: Standard DeviceOrientationEvent Fallback", () => {
        it("suppresses pointermove once device orientation sensor becomes active", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Android Mobile",
                configurable: true,
            });
            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: function () {},
                configurable: true,
                writable: true,
            });

            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });

            controller.attach();

            const orientationEvent = new Event("deviceorientation") as DeviceOrientationEvent;
            Object.defineProperty(orientationEvent, "beta", { value: 45.0 });
            Object.defineProperty(orientationEvent, "gamma", { value: 0.0 });
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

    describe("Environment Precedence & Selection Exclusivity", () => {
        it("Desktop Environment: ignores all orientation sensors even when all APIs exist on window, using only pointermove", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0",
                configurable: true,
            });
            Object.defineProperty(navigator, "maxTouchPoints", {
                value: 10,
                configurable: true,
            });

            const relativeConstructorSpy = vi.fn();
            const absoluteConstructorSpy = vi.fn();
            const requestPermissionSpy = vi.fn();

            Object.defineProperty(window, "RelativeOrientationSensor", {
                value: relativeConstructorSpy,
                configurable: true,
                writable: true,
            });
            Object.defineProperty(window, "AbsoluteOrientationSensor", {
                value: absoluteConstructorSpy,
                configurable: true,
                writable: true,
            });
            const mockDeviceOrientation = function () {} as unknown as typeof DeviceOrientationEvent & {
                requestPermission: () => Promise<string>;
            };
            mockDeviceOrientation.requestPermission = requestPermissionSpy;
            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: mockDeviceOrientation,
                configurable: true,
                writable: true,
            });

            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });
            controller.attach();

            // Verify no orientation sensor was instantiated or requested
            expect(relativeConstructorSpy).not.toHaveBeenCalled();
            expect(absoluteConstructorSpy).not.toHaveBeenCalled();
            window.dispatchEvent(new Event("click"));
            expect(requestPermissionSpy).not.toHaveBeenCalled();

            // Verify raw deviceorientation is ignored
            const orientationEvent = new Event("deviceorientation") as DeviceOrientationEvent;
            Object.defineProperty(orientationEvent, "beta", { value: 60.0 });
            Object.defineProperty(orientationEvent, "gamma", { value: 20.0 });
            window.dispatchEvent(orientationEvent);
            expect(onUpdateSpy).not.toHaveBeenCalled();

            // Verify pointermove works
            window.dispatchEvent(new PointerEvent("pointermove", { clientX: 1000, clientY: 1000 }));
            expect(onUpdateSpy).toHaveBeenCalledWith(-0.4, 0.5);

            controller.detach();
        });

        it("iOS Environment (Tier 1 > Tier 2 & 3): chooses requestPermission over RelativeOrientationSensor when both exist", async () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
                configurable: true,
            });

            const relativeConstructorSpy = vi.fn();
            const absoluteConstructorSpy = vi.fn();
            const requestPermissionSpy = vi.fn().mockResolvedValue("granted");
            const originalDeviceOrientation = (window as unknown as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent;

            Object.defineProperty(window, "RelativeOrientationSensor", {
                value: relativeConstructorSpy,
                configurable: true,
                writable: true,
            });
            Object.defineProperty(window, "AbsoluteOrientationSensor", {
                value: absoluteConstructorSpy,
                configurable: true,
                writable: true,
            });
            const mockDeviceOrientation = function () {} as unknown as typeof DeviceOrientationEvent & {
                requestPermission: () => Promise<string>;
            };
            mockDeviceOrientation.requestPermission = requestPermissionSpy;
            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: mockDeviceOrientation,
                configurable: true,
                writable: true,
            });

            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });
            controller.attach();

            // Relative and Absolute sensors must NOT be constructed when iOS requestPermission is present
            expect(relativeConstructorSpy).not.toHaveBeenCalled();
            expect(absoluteConstructorSpy).not.toHaveBeenCalled();

            // Trigger user gesture -> invokes iOS requestPermission
            window.dispatchEvent(new Event("touchend"));
            await Promise.resolve();
            expect(requestPermissionSpy).toHaveBeenCalledTimes(1);

            controller.detach();
            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: originalDeviceOrientation,
                configurable: true,
                writable: true,
            });
        });

        it("Android Environment (Tier 2 Relative > Absolute > Tier 3): chooses RelativeOrientationSensor over Absolute and DeviceOrientationEvent", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile",
                configurable: true,
            });

            let readingHandler: (() => void) | null = null;
            const relativeStartSpy = vi.fn();
            const absoluteConstructorSpy = vi.fn();

            const mockRelativeInstance: OrientationSensorLike = {
                quaternion: [0, 0, 0, 1],
                start: relativeStartSpy,
                stop: vi.fn(),
                addEventListener: vi.fn((type: string, listener: () => void) => {
                    if (type === "reading") readingHandler = listener;
                }),
                removeEventListener: vi.fn(),
            };

            const relativeConstructorSpy = vi.fn(function () {
                return mockRelativeInstance;
            });

            Object.defineProperty(window, "RelativeOrientationSensor", {
                value: relativeConstructorSpy,
                configurable: true,
                writable: true,
            });
            Object.defineProperty(window, "AbsoluteOrientationSensor", {
                value: absoluteConstructorSpy,
                configurable: true,
                writable: true,
            });
            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: function () {},
                configurable: true,
                writable: true,
            });

            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });
            controller.attach();

            // RelativeOrientationSensor must win
            expect(relativeConstructorSpy).toHaveBeenCalledTimes(1);
            expect(relativeStartSpy).toHaveBeenCalledTimes(1);
            // AbsoluteOrientationSensor must NOT be instantiated
            expect(absoluteConstructorSpy).not.toHaveBeenCalled();

            // Tier 3 deviceorientation must NOT be attached while RelativeOrientationSensor is active
            const orientationEvent = new Event("deviceorientation") as DeviceOrientationEvent;
            Object.defineProperty(orientationEvent, "beta", { value: 80.0 });
            Object.defineProperty(orientationEvent, "gamma", { value: 35.0 });
            window.dispatchEvent(orientationEvent);
            expect(onUpdateSpy).not.toHaveBeenCalled();

            // Reading from RelativeOrientationSensor updates pitch and yaw
            readingHandler!();
            expect(onUpdateSpy).toHaveBeenCalledWith(-0, 0);

            controller.detach();
        });

        it("Android Environment (Tier 2 Absolute > Tier 3): chooses AbsoluteOrientationSensor when RelativeOrientationSensor is absent", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile",
                configurable: true,
            });

            let readingHandler: (() => void) | null = null;
            const absoluteStartSpy = vi.fn();

            const mockAbsoluteInstance: OrientationSensorLike = {
                quaternion: [0, 0, 0, 1],
                start: absoluteStartSpy,
                stop: vi.fn(),
                addEventListener: vi.fn((type: string, listener: () => void) => {
                    if (type === "reading") readingHandler = listener;
                }),
                removeEventListener: vi.fn(),
            };

            const absoluteConstructorSpy = vi.fn(function () {
                return mockAbsoluteInstance;
            });

            // RelativeOrientationSensor is undefined, AbsoluteOrientationSensor is present
            delete (window as unknown as Record<string, unknown>).RelativeOrientationSensor;
            Object.defineProperty(window, "AbsoluteOrientationSensor", {
                value: absoluteConstructorSpy,
                configurable: true,
                writable: true,
            });
            Object.defineProperty(window, "DeviceOrientationEvent", {
                value: function () {},
                configurable: true,
                writable: true,
            });

            const onUpdateSpy = vi.fn();
            const controller = new OrientationInputController({ onUpdate: onUpdateSpy });
            controller.attach();

            expect(absoluteConstructorSpy).toHaveBeenCalledTimes(1);
            expect(absoluteStartSpy).toHaveBeenCalledTimes(1);

            // Tier 3 deviceorientation must NOT be attached
            const orientationEvent = new Event("deviceorientation") as DeviceOrientationEvent;
            Object.defineProperty(orientationEvent, "beta", { value: 80.0 });
            Object.defineProperty(orientationEvent, "gamma", { value: 35.0 });
            window.dispatchEvent(orientationEvent);
            expect(onUpdateSpy).not.toHaveBeenCalled();

            // Reading from AbsoluteOrientationSensor updates pitch and yaw
            readingHandler!();
            expect(onUpdateSpy).toHaveBeenCalledWith(-0, 0);

            controller.detach();
        });
    });
});
