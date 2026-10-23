/**
 * Default render ordering priority for instances that omit an explicit order.
 */
export const DEFAULT_RENDER_ORDER = 0;

/**
 * Render order threshold distinguishing opaque objects from transparent or overlay objects.
 * Renderables with renderOrder >= TRANSPARENT_RENDER_ORDER_THRESHOLD undergo back-to-front
 * camera-depth sorting.
 */
export const TRANSPARENT_RENDER_ORDER_THRESHOLD = 1000;

/**
 * Minimum floating-point depth difference required to differentiate view-space depths during sort.
 */
export const DEPTH_SORT_EPSILON = 1e-6;

/**
 * Byte offset passed to gl.drawElements for non-offset index buffers.
 */
export const DRAW_ELEMENTS_OFFSET = 0;

/**
 * Starting vertex index passed to gl.drawArrays for full-buffer draws.
 */
export const DRAW_ARRAYS_START_INDEX = 0;
