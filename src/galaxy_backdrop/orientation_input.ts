/**
 * Centralized orientation & pointer/touch input manager for 3D galaxy backdrop passes.
 * Handles device tilt via standard DeviceOrientationEvent with iOS 13+ requestPermission gating
 * on first user gesture (touchend / click) and touch/pointer fallbacks.
 */

import type { OrientationInputOptions } from "./orientation_types";

export class OrientationInputController {
    private onUpdate: (pitchOffset: number, yawOffset: number) => void;
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
        const hasTouch = typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0;
        this.isMobile = hasTouch || /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
        return this.isMobile;
    }

    public attach(): void {
        if (typeof window === "undefined") return;

        this.detectMobile();

        // Register orientation sensors on mobile/touch devices
        if (this.isMobile) {
            this.setupDeviceOrientation();
            window.addEventListener("touchmove", this.onTouchMove, { passive: true });
        }

        // Pointermove for mouse tracking on desktop or fallback when gyro is inactive
        window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    }

    private setupDeviceOrientation(): void {
        if (typeof window === "undefined") return;

        const DeviceOrientation = (window as unknown as {
            DeviceOrientationEvent?: typeof DeviceOrientationEvent & {
                requestPermission?: () => Promise<string>;
            };
        }).DeviceOrientationEvent;

        if (!DeviceOrientation) return;

        if (typeof DeviceOrientation.requestPermission === "function") {
            // iOS 13+ requires requestPermission() inside a transient user activation (touchend or click)
            this.gestureHandler = () => {
                void this.requestPermission();
            };
            this.addGestureListeners(this.gestureHandler);
        } else {
            // Android / Standard mobile browsers without permission gating
            window.addEventListener("deviceorientation", this.onDeviceOrientation, { passive: true });
        }
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

        const DeviceOrientation = (window as unknown as {
            DeviceOrientationEvent?: typeof DeviceOrientationEvent & {
                requestPermission?: () => Promise<string>;
            };
        }).DeviceOrientationEvent;

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

        window.removeEventListener("deviceorientation", this.onDeviceOrientation);
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("touchmove", this.onTouchMove);
        this.isSensorActive = false;
        this.permissionRequested = false;
    }
}
