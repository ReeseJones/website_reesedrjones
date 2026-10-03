import { MeshGeometry } from "../mesh_geometry";
import type { GeometryBufferData } from "../mesh_geometry_types";
import { STANDARD_VERTEX_LAYOUT } from "./standard_layout";
import type { CubeGeometryOptions } from "./primitive_types";

interface FaceSpec {
    normal: [number, number, number];
    corners: [
        [number, number, number],
        [number, number, number],
        [number, number, number],
        [number, number, number],
    ];
}

/**
 * Pure generator function constructing interleaved vertex data and indices
 * for a box centered at (0, 0, 0).
 */
export function buildCubeBufferData(
    width: number = 1.0,
    height: number = 1.0,
    depth: number = 1.0
): GeometryBufferData {
    const hx = width * 0.5;
    const hy = height * 0.5;
    const hz = depth * 0.5;

    const faces: FaceSpec[] = [
        // Front (+Z)
        {
            normal: [0, 0, 1],
            corners: [
                [-hx, -hy, hz],
                [hx, -hy, hz],
                [hx, hy, hz],
                [-hx, hy, hz],
            ],
        },
        // Back (-Z)
        {
            normal: [0, 0, -1],
            corners: [
                [hx, -hy, -hz],
                [-hx, -hy, -hz],
                [-hx, hy, -hz],
                [hx, hy, -hz],
            ],
        },
        // Top (+Y)
        {
            normal: [0, 1, 0],
            corners: [
                [-hx, hy, hz],
                [hx, hy, hz],
                [hx, hy, -hz],
                [-hx, hy, -hz],
            ],
        },
        // Bottom (-Y)
        {
            normal: [0, -1, 0],
            corners: [
                [-hx, -hy, -hz],
                [hx, -hy, -hz],
                [hx, -hy, hz],
                [-hx, -hy, hz],
            ],
        },
        // Right (+X)
        {
            normal: [1, 0, 0],
            corners: [
                [hx, -hy, hz],
                [hx, -hy, -hz],
                [hx, hy, -hz],
                [hx, hy, hz],
            ],
        },
        // Left (-X)
        {
            normal: [-1, 0, 0],
            corners: [
                [-hx, -hy, -hz],
                [-hx, -hy, hz],
                [-hx, hy, hz],
                [-hx, hy, -hz],
            ],
        },
    ];

    const uvs: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
    ];

    // 6 faces * 4 vertices = 24 vertices. Each vertex has 8 floats: pos(3), norm(3), uv(2).
    const attributes = new Float32Array(24 * 8);
    const indices = new Uint16Array(6 * 6); // 6 faces * 2 triangles * 3 indices = 36 indices

    let vOffset = 0;
    let iOffset = 0;

    for (let f = 0; f < faces.length; f++) {
        const face = faces[f];
        const baseIndex = f * 4;

        for (let c = 0; c < 4; c++) {
            const pos = face.corners[c];
            const uv = uvs[c];

            // Position (x, y, z)
            attributes[vOffset++] = pos[0];
            attributes[vOffset++] = pos[1];
            attributes[vOffset++] = pos[2];

            // Normal (nx, ny, nz)
            attributes[vOffset++] = face.normal[0];
            attributes[vOffset++] = face.normal[1];
            attributes[vOffset++] = face.normal[2];

            // UV (u, v)
            attributes[vOffset++] = uv[0];
            attributes[vOffset++] = uv[1];
        }

        // Two counter-clockwise triangles per face: (0, 1, 2) and (0, 2, 3)
        indices[iOffset++] = baseIndex;
        indices[iOffset++] = baseIndex + 1;
        indices[iOffset++] = baseIndex + 2;

        indices[iOffset++] = baseIndex;
        indices[iOffset++] = baseIndex + 2;
        indices[iOffset++] = baseIndex + 3;
    }

    return {
        attributes,
        layout: STANDARD_VERTEX_LAYOUT,
        vertexCount: 24,
        indices,
    };
}

/**
 * Standard unit or dimensioned 3D box geometry centered at (0, 0, 0).
 */
export class CubeGeometry extends MeshGeometry {
    public readonly width: number;
    public readonly height: number;
    public readonly depth: number;

    constructor(options?: CubeGeometryOptions, id?: string) {
        const width = options?.width ?? 1.0;
        const height = options?.height ?? 1.0;
        const depth = options?.depth ?? 1.0;

        super(buildCubeBufferData(width, height, depth), 0x0004, id);

        this.width = width;
        this.height = height;
        this.depth = depth;
    }
}
