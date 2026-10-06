/**
 * Normalized device coordinates for a fullscreen triangle strip quad:
 * (-1, -1), (1, -1), (-1, 1), (1, 1)
 */
export const SCREEN_QUAD_VERTEX_POSITIONS = new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
     1.0,  1.0,
]);

export const SCREEN_QUAD_VERTEX_COUNT = 4;
export const SCREEN_QUAD_POSITION_COMPONENTS = 2;
export const SCREEN_QUAD_VERTEX_STRIDE_BYTES = 2 * Float32Array.BYTES_PER_ELEMENT;
export const DEFAULT_SCREEN_QUAD_ID = "ScreenQuadGeometry";
