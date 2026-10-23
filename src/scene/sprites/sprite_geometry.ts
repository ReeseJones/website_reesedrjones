import { MeshGeometry } from "../models/mesh_geometry";
import type { GeometryBufferData } from "../models/mesh_geometry_types";
import type { VertexLayoutSpec } from "../../webgl/geometry/vertex_layout_types";
import { GLDataType, GLPrimitive } from "../../webgl/core/webgl_constants_types";
import type { ISpriteGeometry } from "./sprite_geometry_types";
import { SPRITE_SHARED_QUAD_ID } from "./sprite_constants";

const SPRITE_VERTEX_STRIDE_BYTES = 16;
const SPRITE_POSITION_COMPONENTS = 2;
const SPRITE_UV_COMPONENTS = 2;
const SPRITE_VERTEX_COUNT = 4;

export const SPRITE_VERTEX_LAYOUT: VertexLayoutSpec = {
    attributes: [
        {
            nameOrLocation: 0,
            description: "a_position (vec2 float)",
            size: SPRITE_POSITION_COMPONENTS,
            type: GLDataType.Float,
        },
        {
            nameOrLocation: 1,
            description: "a_uv (vec2 float)",
            size: SPRITE_UV_COMPONENTS,
            type: GLDataType.Float,
        },
    ],
    stride: SPRITE_VERTEX_STRIDE_BYTES,
};

/**
 * Constructs interleaved vertex attributes and indices for a static unit quad [0, 1] x [0, 1].
 */
export function buildSpriteQuadBufferData(): GeometryBufferData {
    // 4 vertices * 4 floats per vertex: pos(2), uv(2)
    const attributes = new Float32Array([
        // Bottom-left
        0.0, 0.0, 0.0, 0.0,
        // Bottom-right
        1.0, 0.0, 1.0, 0.0,
        // Top-right
        1.0, 1.0, 1.0, 1.0,
        // Top-left
        0.0, 1.0, 0.0, 1.0,
    ]);

    // Two CCW triangles: (0, 1, 2) and (0, 2, 3)
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    return {
        attributes,
        layout: SPRITE_VERTEX_LAYOUT,
        vertexCount: SPRITE_VERTEX_COUNT,
        indices,
    };
}

/**
 * Concrete quad geometry representing a camera-facing billboard sprite.
 * Defaults to singleton shared allocation via `SpriteGeometry.getSharedQuad()`.
 */
export class SpriteGeometry extends MeshGeometry implements ISpriteGeometry {
    private static s_sharedQuad: SpriteGeometry | null = null;
    public readonly isShared: boolean;

    constructor(isShared: boolean = false, id?: string) {
        super(
            buildSpriteQuadBufferData(),
            GLPrimitive.Triangles,
            id ?? (isShared ? SPRITE_SHARED_QUAD_ID : undefined)
        );
        this.isShared = isShared;
    }

    /**
     * Singleton factory retrieving the globally shared static unit quad geometry.
     */
    public static getSharedQuad(): SpriteGeometry {
        if (!SpriteGeometry.s_sharedQuad || SpriteGeometry.s_sharedQuad.isDisposed) {
            SpriteGeometry.s_sharedQuad = new SpriteGeometry(true, SPRITE_SHARED_QUAD_ID);
        }
        return SpriteGeometry.s_sharedQuad;
    }

    /**
     * Explicit disposal hook for freeing the shared GPU buffer during full context teardown.
     */
    public static disposeSharedQuad(): void {
        if (SpriteGeometry.s_sharedQuad) {
            SpriteGeometry.s_sharedQuad.dispose(true);
            SpriteGeometry.s_sharedQuad = null;
        }
    }

    /**
     * Disposes geometry resources. If this is a shared instance and force is false,
     * disposal is safely ignored to protect concurrent billboard instances.
     */
    public override dispose(force: boolean = false): void {
        if (this.isShared && !force) {
            return;
        }
        super.dispose();
    }
}
