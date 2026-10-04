import { Material } from "../materials/material";
import { TextureUnit } from "../../webgl/textures/texture_types";
import type { ICubeTexture } from "../../webgl/textures/cube_texture_types";
import type { SkyboxShaderKey } from "../../webgl/shaders/shader_types";
import type { SkyboxMaterialOptions } from "./skybox_material_types";

/**
 * Specialized material for background cubemap skyboxes.
 *
 * Automatically binds the environment cubemap to TextureUnit.Environment (Unit 11)
 * and configures the GPU pipeline with depthWrite: false and cullFace: false.
 */
export class SkyboxMaterial extends Material {
    constructor(options: SkyboxMaterialOptions = {}) {
        super({
            shaderKey: options.shaderKey ?? "skybox",
            pipelineState: {
                blendMode: options.pipelineState?.blendMode ?? "opaque",
                depthTest: options.pipelineState?.depthTest ?? true,
                depthWrite: options.pipelineState?.depthWrite ?? false,
                cullFace: options.pipelineState?.cullFace ?? false,
            },
            cubeTextures: options.cubeTexture ? { [TextureUnit.Environment]: options.cubeTexture } : undefined,
            uniforms: {
                u_tint: options.tint ?? [1.0, 1.0, 1.0],
                u_exposure: options.exposure ?? 1.0,
                u_rotationY: options.rotationY ?? 0.0,
                ...options.uniforms,
            },
        });
    }

    public override get shaderKey(): SkyboxShaderKey {
        return super.shaderKey as SkyboxShaderKey;
    }

    public override set shaderKey(key: SkyboxShaderKey) {
        super.shaderKey = key;
    }

    public get exposure(): number {
        return (this.getUniforms().u_exposure as number) ?? 1.0;
    }

    public set exposure(value: number) {
        this.setUniform("u_exposure", value);
    }

    public get tint(): [number, number, number] {
        return (this.getUniforms().u_tint as [number, number, number]) ?? [1.0, 1.0, 1.0];
    }

    public set tint(value: [number, number, number]) {
        this.setUniform("u_tint", value);
    }

    public get rotationY(): number {
        return (this.getUniforms().u_rotationY as number) ?? 0.0;
    }

    public set rotationY(value: number) {
        this.setUniform("u_rotationY", value);
    }

    public get cubeTexture(): ICubeTexture | null {
        return this.getCubeTexture(TextureUnit.Environment);
    }

    public set cubeTexture(texture: ICubeTexture | null | undefined) {
        this.setCubeTexture(TextureUnit.Environment, texture ?? null);
    }

    /**
     * Duplicates this SkyboxMaterial preserving parameters and cube texture bindings.
     */
    public override clone(): SkyboxMaterial {
        return new SkyboxMaterial({
            shaderKey: this.shaderKey,
            pipelineState: { ...this.pipelineState },
            cubeTexture: this.cubeTexture,
            exposure: this.exposure,
            tint: [...this.tint],
            rotationY: this.rotationY,
            uniforms: this.getUniforms(),
        });
    }
}
