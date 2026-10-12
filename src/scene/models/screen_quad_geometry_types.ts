import type { VertexLayoutSpec } from "../../webgl/geometry/vertex_layout_types";
import { GLDataType } from "../../webgl/core/webgl_constants_types";
import { SCREEN_QUAD_POSITION_COMPONENTS, SCREEN_QUAD_VERTEX_STRIDE_BYTES } from "./screen_quad_geometry_constants";

/**
 * Standard attribute location slot indices for screen-space quad geometry.
 */
export const ScreenQuadAttributeLocation = {
    Position: 0,
} as const;

export type ScreenQuadAttributeLocation =
    (typeof ScreenQuadAttributeLocation)[keyof typeof ScreenQuadAttributeLocation];

/**
 * 2D vertex layout for fullscreen quads:
 * - location 0: aPosition (vec2 float)
 * Total vertex stride = 2 floats (8 bytes).
 */
export const SCREEN_QUAD_VERTEX_LAYOUT: VertexLayoutSpec = {
    attributes: [
        {
            nameOrLocation: ScreenQuadAttributeLocation.Position,
            description: "aPosition (vec2 float)",
            size: SCREEN_QUAD_POSITION_COMPONENTS,
            type: GLDataType.Float,
        },
    ],
    stride: SCREEN_QUAD_VERTEX_STRIDE_BYTES,
};

/**
 * Configuration options for ScreenQuadGeometry.
 */
export interface ScreenQuadGeometryOptions {
    /** Optional custom vertex positions (Float32Array) */
    positions?: Float32Array;
    /** Optional unique identifier */
    id?: string;
}
