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
    // Position: Center offset to top-right quadrant so it doesn't collide with page content
    centerOffsetX: 6.0,
    centerOffsetY: 3.5,

    // Stellar Population: 5 spiral arms with spur bridges
    starCount: 300000,
    armCount: 5,
    armWinding: 0.55,       // Logarithmic pitch factor
    armDispersion: 0.28,    // Cloud thickness around arms
    spurFrequency: 0.22,    // Minor spur bridges between arms
    coreRadius: 1.8,        // Compact, dense nuclear core
    diskRadius: 16.0,       // Broad stellar disk
    diskThickness: 1.1,     // Flared scale height
    coreDensityRatio: 0.18, // Reduced from 0.35 to 0.18: core is delicate and airy, letting arms shine

    // Colors: Warm celestial amber, toned down to be gentle as a background
    coreColor: [1.0, 0.80, 0.50],        // Warm golden peach
    coreBlazeColor: [1.0, 0.88, 0.68],   // Soft champagne amber (toned down from blazing white)
    armInnerColor: [0.12, 0.82, 1.0],    // Electric cyan
    armOuterColor: [0.06, 0.38, 0.98],   // Cobalt blue
    accentColor: [0.65, 0.22, 0.92],     // Deep interstellar violet

    // Luminosity & Discs
    minPointSize: 1.2,
    maxPointSize: 96.0,     // Dramatic large soft glowing discs for foreground flybys
    pointScale: 42.0,
    coreGlowBoost: 1.25,    // Toned down from 2.8 to 1.25 for a gentle background presence

    // Dynamics: slow, majestic rotation with subtle differential spin
    rotationSpeed: -0.045,     // Rad/sec (~140s per full rotation)
    differentialSpeed: 0.015,  // Inner regions slightly lead outer arms
    driftSpeed: 0.18,          // Micro-turbulence
    driftAmplitude: 0.14,

    // 3D Perspective & Orientation (8-degree ultra-shallow canted askew view)
    pitchAngle: 0.140,         // ~8 degrees tilt (arms sweep right into camera)
    yawAngle: 0.16,            // ~9 degrees askew azimuth
    rollAngle: 0.05,           // ~3 degrees cant
    cameraDistance: 15.4,      // Vantage point
    fov: 65.0,                 // Wide angle for cinematic depth
    nearPlane: 0.06,
    farPlane: 75.0,
    nearFadeDistance: 2.2,     // Smooth dissolve as stars sweep within 2.2 units of lens

    // Input responsiveness
    mouseSensitivity: 0.35,
    gyroSensitivity: 0.5,
    inputDamping: 4.5,         // Smooth exponential lerp

    // Retina / 4K safeguard
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

// Default active parameters (pin-prick experiment active by default)
export const DEFAULT_GALAXY_PARAMETERS: GalaxyParameters = DEFAULT_PINPRICK_PARAMETERS;

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
        id: "pinprick_default",
        name: "Pin-prick Crystalline (Default)",
        params: DEFAULT_PINPRICK_PARAMETERS,
    },
    {
        id: "orb_bokeh",
        name: "Volumetric Orb Bokeh",
        params: DEFAULT_ORB_PARAMETERS,
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

