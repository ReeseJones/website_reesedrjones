import { SceneNode } from "../core/scene_node";
import type { IMeshGeometry } from "./mesh_geometry_types";
import type { IMaterial } from "../materials/material_types";
import type { IModelInstance } from "./model_instance_types";

/**
 * Concrete scene graph citizen marrying geometry data and material styling
 * with spatial hierarchy and world transformations.
 */
export class ModelInstance extends SceneNode implements IModelInstance {
    public geometry: IMeshGeometry;
    public material: IMaterial;
    public renderOrder: number;

    /**
     * @param geometry MeshGeometry defining vertex buffer data and attribute layout.
     * @param material Material defining shader program, uniforms, and pipeline state.
     * @param name Descriptive scene node label (defaults to "ModelInstance").
     * @param id Optional unique identifier.
     */
    constructor(
        geometry: IMeshGeometry,
        material: IMaterial,
        name: string = "ModelInstance",
        id?: string
    ) {
        super(name, id);
        this.geometry = geometry;
        this.material = material;
        this.renderOrder = 0;
    }
}
