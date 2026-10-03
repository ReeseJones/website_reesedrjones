import type { ISceneNode } from "../core/scene_node_types";
import type { IMeshGeometry } from "./mesh_geometry_types";
import type { IMaterial } from "../materials/material_types";

/**
 * Public interface for a renderable scene graph entity that pairs
 * geometry data with an appearance material and transform hierarchy.
 */
export interface IModelInstance extends ISceneNode {
    /** Mesh geometry defining vertex buffer data and attribute layout */
    geometry: IMeshGeometry;

    /** Material defining shader key, uniforms, and pipeline state */
    material: IMaterial;

    /** Render queue ordering priority (lower renders first; transparent objects typically higher) */
    renderOrder: number;
}
