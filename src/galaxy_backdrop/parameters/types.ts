import type { RgbLike } from "../../helpers/colors_types";

export type StarRenderStyle = "pinprick" | "orb";

export interface GalacticCloudParameters {
    /** Whether the background cloud/horizon pass is active */
    cloudEnabled: boolean;
    /** Density threshold and contrast multiplier for background nebula gas */
    cloudDensity: number;
    /** Spatial scale/frequency of procedural cloud noise */
    cloudScale: number;
    /** Speed multiplier for slow background gas animation drift */
    cloudSpeed: number;
    /** Parallax scale factor relative to camera pitch/yaw offset (0.0 to 1.0) */
    cloudParallaxFactor: number;
    /** Brightness intensity of the infinite horizon line band */
    horizonIntensity: number;
    /** Vertical spread/thickness of the celestial horizon glow */
    horizonThickness: number;
    /** RGB triplet for the central equator horizon line */
    horizonColorCenter: RgbLike;
    /** RGB triplet for the outer horizon atmospheric band */
    horizonColorOuter: RgbLike;


    /** RGB triplet for dense inner nebula clouds */
    cloudColorPrimary: RgbLike;
    /** RGB triplet for outer diffuse dust clouds */
    cloudColorSecondary: RgbLike;
}

export interface GalaxyParameters extends GalacticCloudParameters {
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
    coreColor: RgbLike;
    coreBlazeColor: RgbLike;
    armInnerColor: RgbLike;
    armOuterColor: RgbLike;
    accentColor: RgbLike;

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

