/**
 * Element counts for gl-matrix 3x3 and 4x4 matrix float buffers.
 */
export const MAT4_ELEMENT_COUNT = 16;
export const MAT3_ELEMENT_COUNT = 9;

/**
 * Column-major array indices for components of a 4x4 matrix (gl-matrix layout).
 *
 * WebGL / gl-matrix matrices are laid out in column-major order:
 * [ m00, m01, m02, m03,   // Column 0 (X basis)
 *   m10, m11, m12, m13,   // Column 1 (Y basis)
 *   m20, m21, m22, m23,   // Column 2 (Z basis)
 *   tx,  ty,  tz,  m33 ]  // Column 3 (Translation / W)
 */
export const Mat4Index = {
    TranslationX: 12,
    TranslationY: 13,
    TranslationZ: 14,
} as const;

export type Mat4Index = (typeof Mat4Index)[keyof typeof Mat4Index];
