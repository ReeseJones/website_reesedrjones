import type { IMaterial, MaterialOptions, PipelineState } from "./material_types";
import type { ShaderKey } from "../../webgl/shader_types";
import type { ITexture, TextureUnit } from "../../webgl/texture_types";

/**
 * Base material class encapsulating shader selection, uniform parameters,
 * texture bindings, and WebGL rasterization pipeline state.
 */
export class Material implements IMaterial {
    private _shaderKey: ShaderKey;
    private _pipelineState: PipelineState;
    private readonly _uniforms: Map<string, unknown> = new Map();
    private readonly _textures: Map<TextureUnit | number, ITexture> = new Map();

    constructor(options: MaterialOptions) {
        this._shaderKey = options.shaderKey;
        this._pipelineState = {
            blendMode: options.pipelineState?.blendMode ?? "opaque",
            depthTest: options.pipelineState?.depthTest ?? true,
            depthWrite: options.pipelineState?.depthWrite ?? true,
            cullFace: options.pipelineState?.cullFace ?? true,
        };

        if (options.uniforms) {
            for (const [key, value] of Object.entries(options.uniforms)) {
                this._uniforms.set(key, value);
            }
        }

        if (options.textures) {
            for (const [unitStr, tex] of Object.entries(options.textures)) {
                this._textures.set(Number(unitStr), tex);
            }
        }
    }

    public get shaderKey(): ShaderKey {
        return this._shaderKey;
    }

    public set shaderKey(key: ShaderKey) {
        this._shaderKey = key;
    }

    public get pipelineState(): PipelineState {
        return this._pipelineState;
    }

    /**
     * Sets or updates an individual uniform value.
     */
    public setUniform(name: string, value: unknown): this {
        this._uniforms.set(name, value);
        return this;
    }

    /**
     * Sets multiple uniform values from a key-value record.
     */
    public setUniforms(uniforms: Record<string, unknown>): this {
        for (const [key, value] of Object.entries(uniforms)) {
            this._uniforms.set(key, value);
        }
        return this;
    }

    /**
     * Returns an immutable snapshot of all assigned uniform values.
     */
    public getUniforms(): Readonly<Record<string, unknown>> {
        return Object.fromEntries(this._uniforms.entries());
    }

    /**
     * Binds a texture resource to a specific hardware texture unit (e.g. TextureUnit.Color).
     */
    public setTexture(unit: TextureUnit | number, texture: ITexture | null): this {
        if (texture) {
            this._textures.set(unit, texture);
        } else {
            this._textures.delete(unit);
        }
        return this;
    }

    /**
     * Retrieves the texture bound to a specific hardware texture unit, if any.
     */
    public getTexture(unit: TextureUnit | number): ITexture | null {
        return this._textures.get(unit) ?? null;
    }

    /**
     * Retrieves all assigned textures mapped by hardware texture unit.
     */
    public getTextures(): ReadonlyMap<TextureUnit | number, ITexture> {
        return this._textures;
    }

    /**
     * Duplicates this material preserving pipeline state, uniforms, and texture bindings.
     */
    public clone(): Material {
        const clonedTextures: Record<number, ITexture> = {};
        for (const [unit, tex] of this._textures.entries()) {
            clonedTextures[unit] = tex;
        }

        return new Material({
            shaderKey: this._shaderKey,
            pipelineState: { ...this._pipelineState },
            uniforms: this.getUniforms(),
            textures: clonedTextures,
        });
    }
}
