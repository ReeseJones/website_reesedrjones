import { Material } from "./material";
import type { StandardMaterialOptions } from "./standard_material_types";

/**
 * Standard Cartesian mesh material with default opaque pipeline state
 * and standard PBR/lit shader bindings.
 */
export class StandardMaterial extends Material {
    constructor(options?: StandardMaterialOptions) {
        const uniforms: Record<string, unknown> = {
            ...(options?.color !== undefined ? { u_color: options.color } : {}),
            ...(options?.roughness !== undefined ? { u_roughness: options.roughness } : {}),
            ...(options?.metallic !== undefined ? { u_metallic: options.metallic } : {}),
            ...options?.uniforms,
        };

        super({
            shaderKey: options?.shaderKey ?? "standard_pbr",
            pipelineState: {
                blendMode: options?.pipelineState?.blendMode ?? "opaque",
                depthTest: options?.pipelineState?.depthTest ?? true,
                depthWrite: options?.pipelineState?.depthWrite ?? true,
                cullFace: options?.pipelineState?.cullFace ?? true,
            },
            uniforms,
        });
    }
}
