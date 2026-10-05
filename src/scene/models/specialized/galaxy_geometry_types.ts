import type { VertexLayoutSpec } from "../../../webgl/geometry/vertex_layout_types";
import type { GalaxyParameters } from "../../../galaxy_backdrop/parameters/types";
import { GLDataType } from "../../../webgl/core/webgl_constants_types";

/**
 * Standard attribute location slot indices for procedural galaxy starfields.
 */
export const GalaxyAttributeLocation = {
    Radius: 0,
    BaseAngle: 1,
    ZOffset: 2,
    Size: 3,
    SpectralType: 4,
    DriftPhase: 5,
} as const;

export type GalaxyAttributeLocation =
    (typeof GalaxyAttributeLocation)[keyof typeof GalaxyAttributeLocation];

/**
 * 6-attribute interleaved vertex layout for the procedural spiral galaxy starfield.
 * - location 0: a_radius (float)
 * - location 1: a_baseAngle (float)
 * - location 2: a_zOffset (float)
 * - location 3: a_size (float)
 * - location 4: a_spectralType (float)
 * - location 5: a_driftPhase (float)
 * Total vertex stride = 6 floats (24 bytes).
 */
export const GALAXY_VERTEX_LAYOUT: VertexLayoutSpec = {
    attributes: [
        {
            nameOrLocation: GalaxyAttributeLocation.Radius,
            description: "a_radius (float)",
            size: 1,
            type: GLDataType.Float,
        },
        {
            nameOrLocation: GalaxyAttributeLocation.BaseAngle,
            description: "a_baseAngle (float)",
            size: 1,
            type: GLDataType.Float,
        },
        {
            nameOrLocation: GalaxyAttributeLocation.ZOffset,
            description: "a_zOffset (float)",
            size: 1,
            type: GLDataType.Float,
        },
        {
            nameOrLocation: GalaxyAttributeLocation.Size,
            description: "a_size (float)",
            size: 1,
            type: GLDataType.Float,
        },
        {
            nameOrLocation: GalaxyAttributeLocation.SpectralType,
            description: "a_spectralType (float)",
            size: 1,
            type: GLDataType.Float,
        },
        {
            nameOrLocation: GalaxyAttributeLocation.DriftPhase,
            description: "a_driftPhase (float)",
            size: 1,
            type: GLDataType.Float,
        },
    ],
    stride: 6 * Float32Array.BYTES_PER_ELEMENT,
};

/**
 * Configuration options for generating GalaxyGeometry.
 */
export interface GalaxyGeometryOptions {
    /** Override specific galaxy simulation parameters */
    params?: Partial<GalaxyParameters>;
}
