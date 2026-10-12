/**
 * Structure representing a fully decoded vertex from an interleaved buffer
 * conforming to STANDARD_VERTEX_LAYOUT (stride: 8 floats / 32 bytes).
 */
export interface DecodedVertex {
    /** X position coordinate */
    x: number;
    /** Y position coordinate */
    y: number;
    /** Z position coordinate */
    z: number;
    /** X normal vector component */
    nx: number;
    /** Y normal vector component */
    ny: number;
    /** Z normal vector component */
    nz: number;
    /** U texture coordinate (horizontal) */
    u: number;
    /** V texture coordinate (vertical) */
    v: number;
}
