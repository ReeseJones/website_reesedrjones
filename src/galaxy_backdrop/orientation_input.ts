/**
 * Centralized orientation & pointer input manager for 3D galaxy backdrop passes.
 * Uses W3C Generic Sensor API (RelativeOrientationSensor / AbsoluteOrientationSensor)
 * with graceful fallback to DeviceOrientationEvent and iOS requestPermission gating.
 *
 * Enforces mutual exclusion:
 * - On mobile devices with active rotation sensors, pointer events are suppressed so only rotation sensors are used.
 * - On desktop, mouse movement works by default, and mouse/rotation sensors do not mix simultaneously.
 */

export interface OrientationInputOptions {
    onUpdate: (pitchOffset: number, yawOffset: number) => void;
}

export class OrientationInputController {
    private onUpdate: (pitchOffset: number, yawOffset: number) => void;
    private relativeSensor: any = null;
    private isSensorActive = false;
    private isMobile = false;

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

        // 1. Attempt Generic Sensor API (RelativeOrientationSensor or AbsoluteOrientationSensor)
        let sensorStarted = false;
        const win = window as any;

        if ("RelativeOrientationSensor" in win || "AbsoluteOrientationSensor" in win) {
            try {
                const SensorClass = win.RelativeOrientationSensor || win.AbsoluteOrientationSensor;
                this.relativeSensor = new SensorClass({ frequency: 60 });
                this.relativeSensor.addEventListener("reading", this.onSensorReading);
                this.relativeSensor.addEventListener("error", this.onSensorError);
                this.relativeSensor.start();
                sensorStarted = true;
            } catch {
                this.isSensorActive = false;
                if (this.relativeSensor) {
                    try {
                        this.relativeSensor.stop();
                    } catch {}
                    this.relativeSensor = null;
                }
            }
        }

        // 2. Fallback to DeviceOrientationEvent if Generic Sensor API is unavailable or failed
        if (!sensorStarted) {
            this.fallbackDeviceOrientation();
        }

        // 3. Attach pointermove for mouse interaction
        window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    }

    private fallbackDeviceOrientation(): void {
        if (typeof window === "undefined" || !window.DeviceOrientationEvent) return;

        const DeviceOrientation = window.DeviceOrientationEvent as any;
        if (typeof DeviceOrientation.requestPermission === "function") {
            // iOS 13+ requires explicit permission request triggered by user gesture.
            const requestPermissionOnGesture = () => {
                DeviceOrientation.requestPermission()
                    .then((permissionState: string) => {
                        if (permissionState === "granted") {
                            window.addEventListener("deviceorientation", this.onDeviceOrientation, { passive: true });
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        window.removeEventListener("pointerdown", requestPermissionOnGesture);
                        window.removeEventListener("touchstart", requestPermissionOnGesture);
                    });
            };

            window.addEventListener("pointerdown", requestPermissionOnGesture, { passive: true, once: true });
            window.addEventListener("touchstart", requestPermissionOnGesture, { passive: true, once: true });
        } else {
            // Standard DeviceOrientation without explicit permission requirement
            try {
                window.addEventListener("deviceorientation", this.onDeviceOrientation, { passive: true });
            } catch {
                this.isSensorActive = false;
            }
        }
    }

    private onSensorReading = (): void => {
        if (!this.relativeSensor || !this.relativeSensor.quaternion) return;
        const [x, y, z, w] = this.relativeSensor.quaternion;

        // Convert quaternion [x, y, z, w] to Euler pitch and yaw
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
        this.fallbackDeviceOrientation();
    };

    private onDeviceOrientation = (e: DeviceOrientationEvent): void => {
        if (e.beta === null || e.gamma === null) return;

        this.isSensorActive = true;
        const normalizedBeta = Math.max(-1.0, Math.min(1.0, (e.beta - 45.0) / 35.0));
        const normalizedGamma = Math.max(-1.0, Math.min(1.0, e.gamma / 35.0));

        this.onUpdate(-normalizedBeta * 0.45, normalizedGamma * 0.55);
    };

    private onPointerMove = (e: PointerEvent): void => {
        // Mutual Exclusion Rule:
        // On mobile with active rotation sensors OR on desktop with active rotation sensors,
        // ignore pointer move events to prevent mixing mouse and rotation sensors.
        if (this.isSensorActive) return;

        const x = (e.clientX / window.innerWidth) * 2.0 - 1.0;
        const y = (e.clientY / window.innerHeight) * 2.0 - 1.0;

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
        window.removeEventListener("pointermove", this.onPointerMove);
        this.isSensorActive = false;
    }
}
