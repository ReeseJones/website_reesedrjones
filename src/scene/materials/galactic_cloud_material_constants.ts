/**
 * Default horizon intensity falloff multiplier.
 */
export const DEFAULT_HORIZON_INTENSITY = 0.85;

/**
 * Default vertical horizon thickness factor.
 */
export const DEFAULT_HORIZON_THICKNESS = 0.22;

/**
 * Default celestial horizon center color (warm cream).
 */
export const DEFAULT_HORIZON_COLOR_CENTER: [number, number, number] = [1.0, 0.84, 0.66];

/**
 * Default celestial horizon outer color (deep space navy blue).
 */
export const DEFAULT_HORIZON_COLOR_OUTER: [number, number, number] = [0.15, 0.25, 0.85];

/**
 * Default render order for the background galactic cloud quad.
 * Set to -10 to draw behind default scene models (renderOrder 0).
 */
export const GALACTIC_CLOUD_RENDER_ORDER = -10;

/**
 * Default parallax motion multiplier for background cloud horizon.
 */
export const DEFAULT_CLOUD_PARALLAX_FACTOR = 0.25;

/**
 * Default aspect ratio.
 */
export const DEFAULT_CLOUD_ASPECT = 1.0;

/**
 * Default FOV scale factor.
 */
export const DEFAULT_CLOUD_FOV_SCALE = 1.0;

/**
 * Default Euler angles (pitch, yaw, roll) in radians.
 */
export const DEFAULT_CLOUD_PITCH = 0.0;
export const DEFAULT_CLOUD_YAW = 0.0;
export const DEFAULT_CLOUD_ROLL = 0.0;

/**
 * Default pitch and yaw offset angles in radians.
 */
export const DEFAULT_CLOUD_PITCH_OFFSET = 0.0;
export const DEFAULT_CLOUD_YAW_OFFSET = 0.0;

/**
 * Degree to radian conversion factor.
 */
export const DEG_TO_RAD = Math.PI / 180.0;

/**
 * FOV half-angle multiplier.
 */
export const HALF_FOV_FACTOR = 0.5;
