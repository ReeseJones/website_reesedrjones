import { MeshGeometry } from "../mesh_geometry";
import type { GeometryBufferData } from "../mesh_geometry_types";
import { STANDARD_VERTEX_LAYOUT } from "./standard_layout";
import type { QuadGeometryOptions } from "./primitive_types";
import { GLPrimitive } from "../../../webgl/core/webgl_constants_types";

/**
 * Pure generator constructing interleaved vertex attributes and indices
 * for a flat 2D rectangle in the XY plane centered at (0, 0, 0).
 */
export function buildQuadBufferData(
    width: number = 1.0,
    height: number = 1.0
): GeometryBufferData {
    const hx = width * 0.5;
    const hy = height * 0.5;

    // 4 vertices * 8 floats per vertex: pos(3), normal(3), uv(2)
    const attributes = new Float32Array([
        // Bottom-left
        -hx, -hy, 0.0,  0.0, 0.0, 1.0,  0.0, 0.0,
        // Bottom-right
        hx, -hy, 0.0,   0.0, 0.0, 1.0,  1.0, 0.0,
        // Top-right
        hx, hy, 0.0,    0.0, 0.0, 1.0,  1.0, 1.0,
        // Top-left
        -hx, hy, 0.0,   0.0, 0.0, 1.0,  0.0, 1.0,
    ]);

    // Two counter-clockwise triangles: (0, 1, 2) and (0, 2, 3)
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    return {
        attributes,
        layout: STANDARD_VERTEX_LAYOUT,
        vertexCount: 4,
        indices,
    };
}

/**
 * Standard unit or dimensioned 2D quad geometry on the XY plane with normal (0, 0, 1).
 */
export class QuadGeometry extends MeshGeometry {
    public readonly width: number;
    public readonly height: number;

    constructor(options?: QuadGeometryOptions, id?: string) {
        const width = options?.width ?? 1.0;
        const height = options?.height ?? 1.0;

        super(
            buildQuadBufferData(width, height),
            GLPrimitive.Triangles,
            id
        );

        this.width = width;
        this.height = height;
    }
}
