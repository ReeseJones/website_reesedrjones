import { Material } from "./material";
import type { UnlitMaterialOptions } from "./unlit_material_types";
import { TextureUnit, type ITexture } from "../../webgl/textures/texture_types";
import type { UnlitShaderKey } from "../../webgl/shaders/shader_types";

/**
 * Unlit material for rendering geometry with a solid/tinted color and optional 2D texture,
 * completely independent of scene lighting.
 */
export class UnlitMaterial extends Material {
    constructor(options?: UnlitMaterialOptions) {
        const colorVec4 = options?.color
            ? options.color.length === 3
                ? [options.color[0], options.color[1], options.color[2], 1.0]
                : options.color
            : [1.0, 1.0, 1.0, 1.0];

        const uniforms: Record<string, unknown> = {
            u_color: colorVec4,
            ...options?.uniforms,
        };

        const textures: Partial<Record<TextureUnit | number, ITexture>> = {
            ...(options?.texture ? { [TextureUnit.Color]: options.texture } : {}),
            ...options?.textures,
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
            textures: textures as Record<number, ITexture>,
        });
    }

    /**
     * Retrieves the 2D texture bound to Semantic Unit 0 (TextureUnit.Color / u_texture).
     */
    public get texture(): ITexture | null {
        return this.getTexture(TextureUnit.Color);
    }

    /**
     * Assigns or clears the 2D texture bound to Semantic Unit 0 (TextureUnit.Color / u_texture).
     */
    public setTexture(texture: ITexture | null): this;
    public setTexture(unit: TextureUnit | number, texture: ITexture | null): this;
    public setTexture(unitOrTexture: TextureUnit | number | ITexture | null, maybeTexture?: ITexture | null): this {
        if (typeof unitOrTexture === "number") {
            super.setTexture(unitOrTexture, maybeTexture ?? null);
        } else {
            super.setTexture(TextureUnit.Color, unitOrTexture);
        }
        return this;
    }

    /**
     * Updates the base tint color.
     */
    public setColor(color: [number, number, number] | [number, number, number, number]): this {
        const colorVec4 = color.length === 3 ? [color[0], color[1], color[2], 1.0] : color;
        return this.setUniform("u_color", colorVec4);
    }

    /**
     * Duplicates this UnlitMaterial preserving parameters and texture bindings.
     */
    public override clone(): UnlitMaterial {
        const clonedUniforms: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(this.getUniforms())) {
            if (val instanceof Float32Array) {
                clonedUniforms[key] = new Float32Array(val);
            } else if (Array.isArray(val)) {
                clonedUniforms[key] = [...val];
            } else if (typeof val === "object" && val !== null) {
                clonedUniforms[key] = { ...val };
            } else {
                clonedUniforms[key] = val;
            }
        }

        const clonedTextures: Record<number, ITexture> = {};
        for (const [unit, tex] of this.getTextures().entries()) {
            clonedTextures[unit] = tex;
        }

        return new UnlitMaterial({
            shaderKey: this.shaderKey as UnlitShaderKey,
            pipelineState: { ...this.pipelineState },
            uniforms: clonedUniforms,
            textures: clonedTextures,
            texture: this.getTexture(TextureUnit.Color),
        });
    }
}
