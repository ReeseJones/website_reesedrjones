/**
 * Element counts for pre-allocated gl-matrix float buffers.
 */
export const MAT4_ELEMENT_COUNT = 16;
export const MAT3_ELEMENT_COUNT = 9;

/**
 * Column-major indices for translation components in a 4x4 matrix.
 */
export const MAT4_TRANSLATION_X_INDEX = 12;
export const MAT4_TRANSLATION_Y_INDEX = 13;
export const MAT4_TRANSLATION_Z_INDEX = 14;

/**
 * Default render ordering priority for instances that omit an explicit order.
 */
export const DEFAULT_RENDER_ORDER = 0;

/**
 * Byte offset passed to gl.drawElements for non-offset index buffers.
 */
export const DRAW_ELEMENTS_OFFSET = 0;

/**
 * Starting vertex index passed to gl.drawArrays for full-buffer draws.
 */
export const DRAW_ARRAYS_START_INDEX = 0;
