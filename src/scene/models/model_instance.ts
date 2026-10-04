import { mat3, mat4 } from "gl-matrix";
import { SceneNode } from "../core/scene_node";
import type { IMeshGeometry } from "./mesh_geometry_types";
import type { IMaterial } from "../materials/material_types";
import type { IModelInstance } from "./model_instance_types";
import type { RenderContext } from "../core/renderable_types";
import { applyMaterial } from "../materials/material_binder";

const MAT4_TRANSLATION_X_INDEX = 12;
const MAT4_TRANSLATION_Y_INDEX = 13;
const MAT4_TRANSLATION_Z_INDEX = 14;

const s_modelViewMatrix = new Float32Array(16);
const s_normalMatrix = new Float32Array(9);
const s_cameraPosition: [number, number, number] = [0, 0, 0];

/**
 * Concrete scene graph citizen marrying geometry data and material styling
 * with spatial hierarchy and world transformations.
 */
export class ModelInstance extends SceneNode implements IModelInstance {
    public override readonly isRenderable: true = true;
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

    /**
     * Executes material binding, uniform distribution, and geometry drawing
     * for this model instance.
     */
    public render(context: RenderContext): void {
        if (!this.geometry || !this.material) {
            return;
        }

        const { contextManager, camera, dimensions, time } = context;

        // 1. Configure pipeline state, activate shader program, bind textures, and upload material uniforms
        const shader = applyMaterial(this.material, contextManager);

        // 2. Compute model-view and normal matrices
        mat4.multiply(
            s_modelViewMatrix as unknown as mat4,
            camera.viewMatrix as unknown as mat4,
            this.worldMatrix as unknown as mat4
        );

        if (!mat3.normalFromMat4(s_normalMatrix as unknown as mat3, this.worldMatrix as unknown as mat4)) {
            mat3.identity(s_normalMatrix as unknown as mat3);
        }

        s_cameraPosition[0] = camera.worldMatrix[MAT4_TRANSLATION_X_INDEX];
        s_cameraPosition[1] = camera.worldMatrix[MAT4_TRANSLATION_Y_INDEX];
        s_cameraPosition[2] = camera.worldMatrix[MAT4_TRANSLATION_Z_INDEX];

        // 3. Upload frame and camera uniforms
        shader.setMat4("u_viewProjectionMatrix", camera.viewProjectionMatrix);
        shader.setMat4("u_viewMatrix", camera.viewMatrix);
        shader.setMat4("u_projectionMatrix", camera.projectionMatrix);
        shader.setVec3("u_cameraPosition", s_cameraPosition);
        shader.setFloat("u_time", time);
        shader.setFloat("u_viewportHeight", dimensions.height);

        // 4. Upload instance transform uniforms
        shader.setMat4("u_modelMatrix", this.worldMatrix);
        shader.setMat4("u_modelViewMatrix", s_modelViewMatrix);
        shader.setMat3("u_normalMatrix", s_normalMatrix);

        // 5. Execute draw call via geometry manager
        contextManager.geometries.draw(this.geometry);
    }
}
