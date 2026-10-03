import { Material } from "./material";
import type { UnlitMaterialOptions } from "./unlit_material_types";

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

        const useTex = options?.useTexture ?? (options?.texture !== undefined && options?.texture !== null);

        const uniforms: Record<string, unknown> = {
            u_color: colorVec4,
            u_useTexture: useTex ? 1.0 : 0.0,
            ...options?.uniforms,
        };

        const textures: Record<number, ITexture> = {
            ...(options?.texture ? { 0: options.texture } : {}),
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
            textures,
        });
    }

    /**
     * Retrieves the 2D texture bound to Semantic Unit 0 (u_texture).
     */
    public get texture(): ITexture | null {
        return this.getTexture(0);
    }

    /**
     * Assigns or clears the 2D texture bound to Semantic Unit 0 (u_texture).
     */
    public setTexture(texture: ITexture | null): this;
    public setTexture(unit: number, texture: ITexture | null): this;
    public setTexture(unitOrTexture: number | ITexture | null, maybeTexture?: ITexture | null): this {
        if (typeof unitOrTexture === "number") {
            super.setTexture(unitOrTexture, maybeTexture ?? null);
            if (unitOrTexture === 0) {
                this.setUniform("u_useTexture", maybeTexture ? 1.0 : 0.0);
            }
        } else {
            super.setTexture(0, unitOrTexture);
            this.setUniform("u_useTexture", unitOrTexture ? 1.0 : 0.0);
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
     * Toggles texture sampling on or off.
     */
    public setUseTexture(useTexture: boolean): this {
        return this.setUniform("u_useTexture", useTexture ? 1.0 : 0.0);
    }

    /**
     * Duplicates this UnlitMaterial preserving parameters and texture bindings.
     */
    public override clone(): UnlitMaterial {
        const currentUniforms = this.getUniforms();
        const clonedTextures: Record<number, ITexture> = {};
        for (const [unit, tex] of this.getTextures().entries()) {
            clonedTextures[unit] = tex;
        }

        return new UnlitMaterial({
            shaderKey: this.shaderKey,
            pipelineState: { ...this.pipelineState },
            uniforms: currentUniforms,
            textures: clonedTextures,
            texture: this.getTexture(0),
            useTexture: (currentUniforms.u_useTexture as number) > 0.5,
        });
    }
}

