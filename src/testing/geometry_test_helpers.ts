import type { DecodedVertex } from "./geometry_test_helpers_types";

/**
 * Standard vertex layout stride in 32-bit floats:
 * - Position: 3 floats (x, y, z)
 * - Normal: 3 floats (nx, ny, nz)
 * - UV: 2 floats (u, v)
 * Total: 8 floats (32 bytes).
 */
const STANDARD_STRIDE_FLOATS = 8;

const OFFSET_X = 0;
const OFFSET_Y = 1;
const OFFSET_Z = 2;
const OFFSET_NX = 3;
const OFFSET_NY = 4;
const OFFSET_NZ = 5;
const OFFSET_U = 6;
const OFFSET_V = 7;

/**
 * Decodes a single vertex from an interleaved Float32Array into a readable named structure.
 *
 * @param attributes Interleaved vertex attribute array conforming to STANDARD_VERTEX_LAYOUT.
 * @param vertexIndex Zero-based vertex index.
 * @returns DecodedVertex with named spatial (x, y, z), normal (nx, ny, nz), and texture (u, v) components.
 */
export function getVertex(attributes: Float32Array, vertexIndex: number): DecodedVertex {
    const base = vertexIndex * STANDARD_STRIDE_FLOATS;
    return {
        x: attributes[base + OFFSET_X],
        y: attributes[base + OFFSET_Y],
        z: attributes[base + OFFSET_Z],
        nx: attributes[base + OFFSET_NX],
        ny: attributes[base + OFFSET_NY],
        nz: attributes[base + OFFSET_NZ],
        u: attributes[base + OFFSET_U],
        v: attributes[base + OFFSET_V],
    };
}
