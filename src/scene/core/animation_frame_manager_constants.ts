/**
 * Default execution priority for AnimationFrameManager subscribers.
 */
export const DEFAULT_FRAME_SUBSCRIBER_PRIORITY = 0;

/**
 * Conversion factor from milliseconds to seconds.
 */
export const MS_PER_SECOND = 1000;

/**
 * Minimum clamped simulation delta time in seconds (prevents zero/negative dt).
 */
export const MIN_SIMULATION_DT_SEC = 0.0001;

/**
 * Maximum clamped simulation delta time in seconds (prevents physics spikes after tab switches).
 */
export const MAX_SIMULATION_DT_SEC = 0.1;
