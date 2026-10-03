import type { VertexLayoutSpec } from "../../../webgl/geometry/vertex_layout_types";

/**
 * Standard interleaved 3D Cartesian mesh vertex layout specification.
 * - location 0: a_position (Float32x3)
 * - location 1: a_normal (Float32x3)
 * - location 2: a_uv (Float32x2)
 * Total vertex stride = 8 floats (32 bytes).
 */
export const STANDARD_VERTEX_LAYOUT: VertexLayoutSpec = {
    attributes: [
        {
            nameOrLocation: 0,
            description: "a_position (vec3)",
            size: 3,
            type: WebGLRenderingContext.FLOAT,
        },
        {
            nameOrLocation: 1,
            description: "a_normal (vec3)",
            size: 3,
            type: WebGLRenderingContext.FLOAT,
        },
        {
            nameOrLocation: 2,
            description: "a_uv (vec2)",
            size: 2,
            type: WebGLRenderingContext.FLOAT,
        },
    ],
    stride: 8 * Float32Array.BYTES_PER_ELEMENT,
};
