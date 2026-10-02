/**
 * Centralized orientation & pointer/touch input manager for 3D galaxy backdrop passes.
 * Handles device tilt via DeviceOrientationEvent with iOS requestPermission gating and touch/pointer fallbacks.
 *
 * Scoped behavior:
 * - On desktop devices, device orientation listeners are bypassed completely, preventing Chromium deprecation warnings.
 * - On mobile devices, device orientation sensor data (or touch gesture fallbacks) are used for camera parallax.
 */

export interface OrientationInputOptions {
    onUpdate: (pitchOffset: number, yawOffset: number) => void;
}

export class OrientationInputController {
    private onUpdate: (pitchOffset: number, yawOffset: number) => void;
    private relativeSensor: any = null;
    private isSensorActive = false;
    private isMobile = false;
    private permissionRequested = false;

    constructor(options: OrientationInputOptions) {
        this.onUpdate = options.onUpdate;
        this.detectMobile();
    }

    private detectMobile(): boolean {
        if (typeof window === "undefined") return false;
        const ua = navigator.userAgent || "";
        this.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
        return this.isMobile;
    }

    public attach(): void {
        if (typeof window === "undefined") return;

        this.detectMobile();

        // Only register orientation sensors on mobile devices to avoid desktop Chrome deprecation logs
        if (this.isMobile) {
            this.setupDeviceOrientation();
            window.addEventListener("touchmove", this.onTouchMove, { passive: true });
        }

        // Pointermove for mouse tracking on desktop (or fallback when gyro is inactive)
        window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    }

    private setupDeviceOrientation(): void {
        if (typeof window === "undefined") return;

        const win = window as any;

        // Try Generic Sensor API first on modern mobile browsers
        if ("RelativeOrientationSensor" in win || "AbsoluteOrientationSensor" in win) {
            try {
                const SensorClass = win.RelativeOrientationSensor || win.AbsoluteOrientationSensor;
                this.relativeSensor = new SensorClass({ frequency: 60 });
                this.relativeSensor.addEventListener("reading", this.onSensorReading);
                this.relativeSensor.addEventListener("error", this.onSensorError);
                this.relativeSensor.start();
                return;
            } catch {}
        }

        // Fallback to DeviceOrientationEvent
        const DeviceOrientation = win.DeviceOrientationEvent;
        if (DeviceOrientation) {
            if (typeof DeviceOrientation.requestPermission === "function") {
                // iOS 13+ requires DeviceOrientationEvent.requestPermission() inside a user gesture
                const handleUserGesture = () => {
                    if (this.permissionRequested) return;
                    this.permissionRequested = true;

                    DeviceOrientation.requestPermission()
                        .then((permissionState: string) => {
                            if (permissionState === "granted") {
                                window.addEventListener("deviceorientation", this.onDeviceOrientation, { passive: true });
                            }
                        })
                        .catch(() => {})
                        .finally(() => {
                            this.removeGestureListeners(handleUserGesture);
                        });
                };

                this.addGestureListeners(handleUserGesture);
            } else {
                // Android / Standard mobile browsers without permission gating
                try {
                    window.addEventListener("deviceorientation", this.onDeviceOrientation, { passive: true });
                    window.addEventListener("deviceorientationabsolute" as any, this.onDeviceOrientation, { passive: true });
                } catch {}
            }
        }
    }

    private addGestureListeners(handler: () => void): void {
        window.addEventListener("touchstart", handler, { passive: true, once: true });
        window.addEventListener("pointerdown", handler, { passive: true, once: true });
        window.addEventListener("click", handler, { passive: true, once: true });
    }

    private removeGestureListeners(handler: () => void): void {
        window.removeEventListener("touchstart", handler);
        window.removeEventListener("pointerdown", handler);
        window.removeEventListener("click", handler);
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
        if (this.relativeSensor) {
            try {
                this.relativeSensor.removeEventListener("reading", this.onSensorReading);
                this.relativeSensor.removeEventListener("error", this.onSensorError);
                this.relativeSensor.stop();
            } catch {}
            this.relativeSensor = null;
        }
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

        if (this.relativeSensor) {
            try {
                this.relativeSensor.removeEventListener("reading", this.onSensorReading);
                this.relativeSensor.removeEventListener("error", this.onSensorError);
                this.relativeSensor.stop();
            } catch {}
            this.relativeSensor = null;
        }

        window.removeEventListener("deviceorientation", this.onDeviceOrientation);
        window.removeEventListener("deviceorientationabsolute" as any, this.onDeviceOrientation);
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("touchmove", this.onTouchMove);
        this.isSensorActive = false;
        this.permissionRequested = false;
    }
}

