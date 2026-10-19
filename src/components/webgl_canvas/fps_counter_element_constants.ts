import type { FpsCounterDisplayMode, FpsCounterPosition } from "./fps_counter_element_types";

/**
 * Custom element tag name for the Lit FPS counter element.
 */
export const TAG_RJ_FPS_COUNTER = "rj-fps-counter";

/**
 * Default screen corner position for the FPS counter overlay.
 */
export const DEFAULT_FPS_COUNTER_POSITION: FpsCounterPosition = "top-left";

/**
 * Default display mode for the FPS counter overlay.
 */
export const DEFAULT_FPS_COUNTER_MODE: FpsCounterDisplayMode = "both";

/**
 * Decimal places used when displaying frame duration in milliseconds.
 */
export const DECIMAL_PLACES = 1;

/**
 * Conversion factor from seconds to milliseconds.
 */
export const MS_PER_SECOND = 1000;

/**
 * Placeholder text rendered when mode is 'both' before measurements finish.
 */
export const INITIAL_FPS_BOTH_TEXT = "-- FPS (-- ms)";

/**
 * Placeholder text rendered when mode is 'fps' before measurements finish.
 */
export const INITIAL_FPS_TEXT = "-- FPS";

/**
 * Placeholder text rendered when mode is 'frame-time' before measurements finish.
 */
export const INITIAL_FRAME_TIME_TEXT = "-- ms";
