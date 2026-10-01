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

export const DEFAULT_ORB_PARAMETERS: GalaxyParameters = {
    style: "orb",
    centerOffsetX: 4.2,
    centerOffsetY: 1.6,
    starCount: 220000,
    armCount: 4,
    armWinding: 0.4,
    armDispersion: 0.21,
    spurFrequency: 0.28,
    coreRadius: 2.2,
    diskRadius: 30,
    diskThickness: 0.5,
    coreDensityRatio: 0.29,
    coreColor: [1, 0.996, 0.984],
    coreBlazeColor: [1, 0.69, 0.69],
    armInnerColor: [0.945, 0.471, 0.471],
    armOuterColor: [0.06, 0.38, 0.98],
    accentColor: [0.65, 0.22, 0.92],
    minPointSize: 3,
    maxPointSize: 5,
    pointScale: 3,
    coreGlowBoost: 0.5,
    rotationSpeed: -0.045,
    differentialSpeed: 0,
    driftSpeed: 0.08,
    driftAmplitude: 0.14,
    pitchAngle: 0.24,
    yawAngle: 0.14,
    rollAngle: 0.3,
    cameraDistance: 10.5,
    fov: 36,
    nearPlane: 0.06,
    farPlane: 75,
    nearFadeDistance: 4.9,
    mouseSensitivity: 0.05,
    gyroSensitivity: 0.5,
    inputDamping: 4.5,
    dprCap: 1.5,
};

export const DEFAULT_PINPRICK_PARAMETERS: GalaxyParameters = {
    style: "pinprick",
    centerOffsetX: 7,
    centerOffsetY: 2.8,
    starCount: 300000,
    armCount: 3,
    armWinding: 0.55,
    armDispersion: 0.28,
    spurFrequency: 0.22,
    coreRadius: 1.8,
    diskRadius: 21,
    diskThickness: 0.95,
    coreDensityRatio: 0.18,
    coreColor: [0.09, 0, 0.925],
    coreBlazeColor: [1, 0.88, 0.68],
    armInnerColor: [0.89, 0.992, 0.325],
    armOuterColor: [0.06, 0.38, 0.98],
    accentColor: [0.65, 0.22, 0.92],
    minPointSize: 1,
    maxPointSize: 5,
    pointScale: 4,
    coreGlowBoost: 0.5,
    rotationSpeed: -0.045,
    differentialSpeed: 0.015,
    driftSpeed: 0.18,
    driftAmplitude: 0.14,
    pitchAngle: 0.58,
    yawAngle: 0.66,
    rollAngle: 0.08,
    cameraDistance: 15.4,
    fov: 50,
    nearPlane: 0.06,
    farPlane: 75,
    nearFadeDistance: 1.3,
    mouseSensitivity: 0.15,
    gyroSensitivity: 0.5,
    inputDamping: 4.5,
    dprCap: 1.5,
};

// Default active parameters (volumetric orb style active by default)
export const DEFAULT_GALAXY_PARAMETERS: GalaxyParameters = DEFAULT_ORB_PARAMETERS;

export const MOBILE_GALAXY_PARAMETERS: Partial<GalaxyParameters> = {
    starCount: 110000,
    pointScale: 1.0,
    centerOffsetX: 2.0,
    centerOffsetY: 3.0,
    dprCap: 1.25,
};


export interface GalaxyPreset {
    id: string;
    name: string;
    params: Partial<GalaxyParameters>;
}

export const GALAXY_PRESETS: GalaxyPreset[] = [
    {
        id: "orb_default",
        name: "Volumetric Orb (Default)",
        params: DEFAULT_ORB_PARAMETERS,
    },
    {
        id: "pinprick",
        name: "Pin-prick Crystalline",
        params: DEFAULT_PINPRICK_PARAMETERS,
    },
    {
        id: "dense_core",
        name: "Hyper-Dense Nucleus",
        params: {
            ...DEFAULT_PINPRICK_PARAMETERS,
            starCount: 380000,
            coreDensityRatio: 0.30,
            coreGlowBoost: 2.0,
            rotationSpeed: -0.055,
        },
    },
    {
        id: "deep_nebula",
        name: "Deep Interstellar Nebula",
        params: {
            ...DEFAULT_ORB_PARAMETERS,
            accentColor: [0.85, 0.18, 0.78],
            armInnerColor: [0.15, 0.95, 0.88],
            armOuterColor: [0.08, 0.22, 0.88],
            coreBlazeColor: [1.0, 0.95, 0.75],
            pointScale: 48.0,
        },
    },
    {
        id: "slow_majestic",
        name: "Slow Majestic Spiral",
        params: {
            ...DEFAULT_PINPRICK_PARAMETERS,
            rotationSpeed: -0.018,
            armWinding: 0.65,
            spurFrequency: 0.28,
            driftSpeed: 0.10,
        },
    },
];

