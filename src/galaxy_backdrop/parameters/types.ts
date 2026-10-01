export type StarRenderStyle = "pinprick" | "orb";

export interface GalaxyParameters {
    // Render Style ("pinprick" = crystalline micro-points, "orb" = soft volumetric bokeh discs)
    style: StarRenderStyle;

    // Galactic Center Offset in Eye Space (positive X = right, positive Y = top)
    centerOffsetX: number;
    centerOffsetY: number;

    // Stellar Population
    starCount: number;
    armCount: number;
    armWinding: number;
    armDispersion: number;
    spurFrequency: number;
    coreRadius: number;
    diskRadius: number;
    diskThickness: number;
    coreDensityRatio: number;

    // Colors (RGB normalized 0.0 - 1.0)
    coreColor: [number, number, number];
    coreBlazeColor: [number, number, number];
    armInnerColor: [number, number, number];
    armOuterColor: [number, number, number];
    accentColor: [number, number, number];

    // Luminosity & Point Sizes
    minPointSize: number;
    maxPointSize: number;
    pointScale: number;
    coreGlowBoost: number;

    // Dynamics
    rotationSpeed: number;
    differentialSpeed: number;
    driftSpeed: number;
    driftAmplitude: number;

    // Camera & 3D Orientation
    pitchAngle: number; // In radians: ~8 degrees tilt
    yawAngle: number;   // In radians: askew angle
    rollAngle: number;  // In radians: lateral cant
    cameraDistance: number;
    fov: number;        // In degrees
    nearPlane: number;
    farPlane: number;
    nearFadeDistance: number; // Distance at which foreground stars softly fade

    // Input & Interaction
    mouseSensitivity: number;
    gyroSensitivity: number;
    inputDamping: number;

    // Display
    dprCap: number;
}

export interface GalaxyPreset {
    id: string;
    name: string;
    params: Partial<GalaxyParameters>;
}
