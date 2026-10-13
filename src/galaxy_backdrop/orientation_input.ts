/**
 * Centralized orientation & pointer/touch input manager for 3D galaxy backdrop passes.
 * Uses a 3-tier mobile orientation pipeline:
 * 1. iOS 13+ DeviceOrientationEvent.requestPermission() on first user gesture (touchend / click)
 * 2. Modern W3C Generic Sensor API (RelativeOrientationSensor / AbsoluteOrientationSensor)
 * 3. Standard DeviceOrientationEvent fallback (if Generic Sensor API is unavailable or errors out)
 *
 * On desktop browsers, orientation listeners are bypassed completely to prevent deprecation warnings.
 */

import type {
    OrientationSensorLike,
    SensorWindow,
    OrientationInputOptions,
} from "./orientation_types";

export class OrientationInputController {
    private onUpdate: (pitchOffset: number, yawOffset: number) => void;
    private relativeSensor: OrientationSensorLike | null = null;
    private isSensorActive = false;
    private isMobile = false;
    private permissionRequested = false;
    private gestureHandler: (() => void) | null = null;

    constructor(options: OrientationInputOptions) {
        this.onUpdate = options.onUpdate;
        this.detectMobile();
    }

    private detectMobile(): boolean {
        if (typeof window === "undefined") return false;
        const ua = navigator.userAgent || "";
        // Modern iPadOS reports Macintosh userAgent with multi-touch (> 1 touch points)
        const isIpadOS =
            /Macintosh/i.test(ua) &&
            typeof navigator.maxTouchPoints === "number" &&
            navigator.maxTouchPoints > 1;
        this.isMobile = isIpadOS || /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
        return this.isMobile;
    }

    public attach(): void {
        if (typeof window === "undefined") return;

        this.detectMobile();

        // Only register orientation sensors on mobile/tablet devices to avoid desktop Chrome warnings
        if (this.isMobile) {
            this.setupDeviceOrientation();
            window.addEventListener("touchmove", this.onTouchMove, { passive: true });
        }

        // Pointermove for mouse tracking on desktop or fallback when gyro is inactive
        window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    }

    private setupDeviceOrientation(): void {
        if (typeof window === "undefined") return;

        const win = window as unknown as SensorWindow;
        const DeviceOrientation = win.DeviceOrientationEvent;

        // Tier 1: iOS 13+ Explicit Permission API (must be triggered by user activation gesture)
        if (DeviceOrientation && typeof DeviceOrientation.requestPermission === "function") {
            this.gestureHandler = () => {
                void this.requestPermission();
            };
            this.addGestureListeners(this.gestureHandler);
            return;
        }

        // Tier 2: Modern W3C Generic Sensor API (RelativeOrientationSensor / AbsoluteOrientationSensor)
        if ("RelativeOrientationSensor" in win || "AbsoluteOrientationSensor" in win) {
            try {
                const SensorClass = win.RelativeOrientationSensor || win.AbsoluteOrientationSensor;
                if (SensorClass) {
                    this.relativeSensor = new SensorClass({ frequency: 60 });
                    this.relativeSensor.addEventListener("reading", this.onSensorReading);
                    this.relativeSensor.addEventListener("error", this.onSensorError);
                    this.relativeSensor.start();
                    return;
                }
            } catch {
                this.cleanupRelativeSensor();
            }
        }

        // Tier 3: Standard DeviceOrientationEvent fallback
        this.attachFallbackDeviceOrientation();
    }

    private attachFallbackDeviceOrientation(): void {
        if (typeof window === "undefined") return;
        const win = window as unknown as SensorWindow;
        if (!win.DeviceOrientationEvent) return;

        try {
            window.addEventListener("deviceorientation", this.onDeviceOrientation, { passive: true });
            window.addEventListener("deviceorientationabsolute", this.onDeviceOrientation, { passive: true });
        } catch {}
    }

    private cleanupRelativeSensor(): void {
        if (!this.relativeSensor) return;
        try {
            this.relativeSensor.removeEventListener("reading", this.onSensorReading);
            this.relativeSensor.removeEventListener("error", this.onSensorError);
            this.relativeSensor.stop();
        } catch {}
        this.relativeSensor = null;
    }

    /**
     * Explicitly requests device orientation permission on iOS.
     * Must be invoked during a user activation gesture (click or touchend).
     */
    public async requestPermission(): Promise<boolean> {
        if (this.permissionRequested) return false;
        this.permissionRequested = true;

        if (this.gestureHandler) {
            this.removeGestureListeners(this.gestureHandler);
            this.gestureHandler = null;
        }

        const win = window as unknown as SensorWindow;
        const DeviceOrientation = win.DeviceOrientationEvent;

        if (DeviceOrientation && typeof DeviceOrientation.requestPermission === "function") {
            try {
                const permissionState = await DeviceOrientation.requestPermission();
                if (permissionState === "granted") {
                    window.addEventListener("deviceorientation", this.onDeviceOrientation, { passive: true });
                    return true;
                }
            } catch (err) {
                console.warn("[OrientationInputController] Permission request error:", err);
            }
        }
        return false;
    }

    private addGestureListeners(handler: () => void): void {
        // Capture phase ensures we receive the user activation even if children stop propagation
        window.addEventListener("touchend", handler, { capture: true, passive: true });
        window.addEventListener("click", handler, { capture: true, passive: true });
    }

    private removeGestureListeners(handler: () => void): void {
        window.removeEventListener("touchend", handler, { capture: true });
        window.removeEventListener("click", handler, { capture: true });
    }

    private onSensorReading = (): void => {
        if (!this.relativeSensor || !this.relativeSensor.quaternion) return;
        const [x, y, z, w] = this.relativeSensor.quaternion;

        if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z) || Number.isNaN(w)) return;

        const sinPitch = 2 * (w * x - y * z);
        const pitch = Math.asin(Math.max(-1.0, Math.min(1.0, sinPitch)));
        const yaw = Math.atan2(2 * (w * y + z * x), 1 - 2 * (x * x + y * y));

        const normalizedPitch = Math.max(-1.0, Math.min(1.0, pitch / (Math.PI / 4)));
        const normalizedYaw = Math.max(-1.0, Math.min(1.0, yaw / (Math.PI / 4)));

        this.isSensorActive = true;
        this.onUpdate(-normalizedPitch * 0.45, normalizedYaw * 0.55);
    };

    private onSensorError = (): void => {
        this.isSensorActive = false;
        this.cleanupRelativeSensor();
        this.attachFallbackDeviceOrientation();
    };

    private onDeviceOrientation = (e: DeviceOrientationEvent): void => {
        if (
            typeof e.beta !== "number" ||
            typeof e.gamma !== "number" ||
            Number.isNaN(e.beta) ||
            Number.isNaN(e.gamma)
        ) {
            return;
        }

        this.isSensorActive = true;
        const normalizedBeta = Math.max(-1.0, Math.min(1.0, (e.beta - 45.0) / 35.0));
        const normalizedGamma = Math.max(-1.0, Math.min(1.0, e.gamma / 35.0));

        this.onUpdate(-normalizedBeta * 0.45, normalizedGamma * 0.55);
    };

    private onPointerMove = (e: PointerEvent): void => {
        if (this.isSensorActive) return;

        const x = (e.clientX / window.innerWidth) * 2.0 - 1.0;
        const y = (e.clientY / window.innerHeight) * 2.0 - 1.0;

        if (Number.isNaN(x) || Number.isNaN(y)) return;

        this.onUpdate(-y * 0.4, x * 0.5);
    };

    private onTouchMove = (e: TouchEvent): void => {
        if (this.isSensorActive || e.touches.length === 0) return;

        const touch = e.touches[0];
        const x = (touch.clientX / window.innerWidth) * 2.0 - 1.0;
        const y = (touch.clientY / window.innerHeight) * 2.0 - 1.0;

        if (Number.isNaN(x) || Number.isNaN(y)) return;

        this.onUpdate(-y * 0.4, x * 0.5);
    };

    public detach(): void {
        if (typeof window === "undefined") return;

        if (this.gestureHandler) {
            this.removeGestureListeners(this.gestureHandler);
            this.gestureHandler = null;
        }

        this.cleanupRelativeSensor();

        window.removeEventListener("deviceorientation", this.onDeviceOrientation);
        window.removeEventListener("deviceorientationabsolute", this.onDeviceOrientation);
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("touchmove", this.onTouchMove);
        this.isSensorActive = false;
        this.permissionRequested = false;
    }
}
