import type { VertexLayoutSpec } from "../../../webgl/geometry/vertex_layout_types";
import type { GalaxyParameters } from "../../../galaxy_backdrop/parameters/types";

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
            nameOrLocation: 0,
            description: "a_radius (float)",
            size: 1,
            type: 0x1406, // gl.FLOAT
        },
        {
            nameOrLocation: 1,
            description: "a_baseAngle (float)",
            size: 1,
            type: 0x1406, // gl.FLOAT
        },
        {
            nameOrLocation: 2,
            description: "a_zOffset (float)",
            size: 1,
            type: 0x1406, // gl.FLOAT
        },
        {
            nameOrLocation: 3,
            description: "a_size (float)",
            size: 1,
            type: 0x1406, // gl.FLOAT
        },
        {
            nameOrLocation: 4,
            description: "a_spectralType (float)",
            size: 1,
            type: 0x1406, // gl.FLOAT
        },
        {
            nameOrLocation: 5,
            description: "a_driftPhase (float)",
            size: 1,
            type: 0x1406, // gl.FLOAT
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
