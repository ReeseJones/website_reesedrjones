/**
 * Window extension for iOS 13+ DeviceOrientationEvent permission API.
 */
export interface DeviceOrientationEventWithPermission {
    requestPermission?: () => Promise<string>;
}

export interface OrientationInputOptions {
    onUpdate: (pitchOffset: number, yawOffset: number) => void;
}
