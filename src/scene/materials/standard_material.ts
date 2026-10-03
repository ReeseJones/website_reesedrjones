import { Material } from "./material";
import type { StandardMaterialOptions } from "./standard_material_types";

/**
 * Standard Cartesian mesh material with default opaque pipeline state
 * and standard PBR/lit shader bindings.
 */
export class StandardMaterial extends Material {
    constructor(options?: StandardMaterialOptions) {
        const colorVec4 = options?.color
            ? options.color.length === 3
                ? [options.color[0], options.color[1], options.color[2], 1.0]
                : options.color
            : [1.0, 1.0, 1.0, 1.0];

        const uniforms: Record<string, unknown> = {
            u_color: colorVec4,
            u_useTexture: 0.0,
            ...options?.uniforms,
        };

        super({
            shaderKey: options?.shaderKey ?? "unlit",
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
