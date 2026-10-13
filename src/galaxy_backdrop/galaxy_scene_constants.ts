/**
 * Default compositor pass execution priority for <GalaxyScene />.
 */
export const DEFAULT_GALAXY_SCENE_PRIORITY = 0;

/**
 * Default exponential damping factor for pointer/orientation parallax smoothing.
 */
export const DEFAULT_GALAXY_INPUT_DAMPING = 5.0;

/**
 * Reference aspect ratio used to scale horizontal galaxy center offset on narrow viewports.
 */
export const GALAXY_ASPECT_SCALE_REFERENCE = 1.5;

/**
 * Maximum aspect ratio multiplier for horizontal galaxy center offset.
 */
export const MAX_GALAXY_ASPECT_SCALE = 1.0;

/**
 * Simulation frame priority for <GalaxyCameraRig /> (executes before default 0-priority models).
 */
export const CAMERA_RIG_FRAME_PRIORITY = -10;
