export interface OrientationSensorLike {
    quaternion?: [number, number, number, number];
    start(): void;
    stop(): void;
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string, listener: () => void): void;
}

export interface SensorConstructor {
    new (options?: { frequency?: number }): OrientationSensorLike;
}

export interface SensorWindow extends Window {
    RelativeOrientationSensor?: SensorConstructor;
    AbsoluteOrientationSensor?: SensorConstructor;
    DeviceOrientationEvent?: typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<string>;
    };
}

declare global {
    interface WindowEventMap {
        deviceorientationabsolute: DeviceOrientationEvent;
    }
}

export interface OrientationInputOptions {
    onUpdate: (pitchOffset: number, yawOffset: number) => void;
}
