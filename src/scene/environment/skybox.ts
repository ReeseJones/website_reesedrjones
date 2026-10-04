import { ModelInstance } from "../models/model_instance";
import { CubeGeometry } from "../models/primitives/cube_geometry";
import { SkyboxMaterial } from "./skybox_material";
import type { ICubeTexture } from "../../webgl/textures/cube_texture_types";
import type { ISkybox, SkyboxOptions } from "./skybox_types";

/**
 * Scene graph citizen representing a background environment cubemap skybox.
 *
 * Inherits ModelInstance with unit CubeGeometry and SkyboxMaterial.
 * Completely decoupled from IWebGLContextManager: GPU buffer allocation
 * is handled lazily when rendered by SceneRenderer.
 */
export class Skybox extends ModelInstance implements ISkybox {
    public readonly skyboxMaterial: SkyboxMaterial;

    constructor(options: SkyboxOptions = {}) {
        const geometry = options.geometry ?? new CubeGeometry();
        const material = new SkyboxMaterial(options);

        super(geometry, material, options.name ?? "Skybox", options.id);

        this.skyboxMaterial = material;
        this.renderOrder = options.renderOrder ?? -100;
    }

    public get exposure(): number {
        return this.skyboxMaterial.exposure;
    }

    public set exposure(value: number) {
        this.skyboxMaterial.exposure = value;
    }

    public get tint(): [number, number, number] {
        return this.skyboxMaterial.tint;
    }

    public set tint(value: [number, number, number]) {
        this.skyboxMaterial.tint = value;
    }

    public get rotationY(): number {
        return this.skyboxMaterial.rotationY;
    }

    public set rotationY(value: number) {
        this.skyboxMaterial.rotationY = value;
    }

    public get cubeTexture(): ICubeTexture | null {
        return this.skyboxMaterial.cubeTexture;
    }

    public set cubeTexture(texture: ICubeTexture | null | undefined) {
        this.skyboxMaterial.cubeTexture = texture;
    }
}
