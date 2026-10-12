import { MeshGeometry } from "./mesh_geometry";
import { GLPrimitive } from "../../webgl/core/webgl_constants_types";
import {
    SCREEN_QUAD_VERTEX_POSITIONS,
    SCREEN_QUAD_VERTEX_COUNT,
    DEFAULT_SCREEN_QUAD_ID,
} from "./screen_quad_geometry_constants";
import { SCREEN_QUAD_VERTEX_LAYOUT } from "./screen_quad_geometry_types";
import type { ScreenQuadGeometryOptions } from "./screen_quad_geometry_types";

/**
 * Fullscreen or screen-space 2D quad geometry drawn as a TRIANGLE_STRIP (4 vertices).
 * Matches vertex layout expected by screen-space / horizon shaders (vec2 aPosition).
 */
export class ScreenQuadGeometry extends MeshGeometry {
    constructor(options?: ScreenQuadGeometryOptions, id?: string) {
        const positions = options?.positions ?? SCREEN_QUAD_VERTEX_POSITIONS;
        const resolvedId = id ?? options?.id ?? DEFAULT_SCREEN_QUAD_ID;

        super(
            {
                attributes: positions,
                layout: SCREEN_QUAD_VERTEX_LAYOUT,
                vertexCount: SCREEN_QUAD_VERTEX_COUNT,
            },
            GLPrimitive.TriangleStrip,
            resolvedId
        );
    }
}
