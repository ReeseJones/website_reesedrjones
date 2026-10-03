import type { IMaterial, MaterialOptions, PipelineState } from "./material_types";
import type { ShaderKey } from "../../webgl/shaders/shader_types";
import type { ITexture, TextureUnit } from "../../webgl/textures/texture_types";
import type { ICubeTexture } from "../../webgl/textures/cube_texture_types";

/**
 * Base material class encapsulating shader selection, uniform parameters,
 * texture bindings, and WebGL rasterization pipeline state.
 */
export class Material implements IMaterial {
    private _shaderKey: ShaderKey;
    private _pipelineState: PipelineState;
    private readonly _uniforms: Map<string, unknown> = new Map();
    private readonly _textures: Map<TextureUnit | number, ITexture> = new Map();
    private readonly _cubeTextures: Map<TextureUnit | number, ICubeTexture> = new Map();

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
            for (const [unit, tex] of Object.entries(options.textures)) {
                if (tex !== undefined) {
                    this._textures.set(Number(unit), tex);
                }
            }
        }

        if (options.cubeTextures) {
            for (const [unit, cubeTex] of Object.entries(options.cubeTextures)) {
                if (cubeTex !== undefined) {
                    this._cubeTextures.set(Number(unit), cubeTex);
                }
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
     * Binds a cubemap resource to a specific hardware texture unit (e.g. TextureUnit.Environment).
     */
    public setCubeTexture(unit: TextureUnit | number, texture: ICubeTexture | null): this {
        if (texture) {
            this._cubeTextures.set(unit, texture);
        } else {
            this._cubeTextures.delete(unit);
        }
        return this;
    }

    /**
     * Retrieves the cubemap bound to a specific hardware texture unit, if any.
     */
    public getCubeTexture(unit: TextureUnit | number): ICubeTexture | null {
        return this._cubeTextures.get(unit) ?? null;
    }

    /**
     * Retrieves all assigned cubemaps mapped by hardware texture unit.
     */
    public getCubeTextures(): ReadonlyMap<TextureUnit | number, ICubeTexture> {
        return this._cubeTextures;
    }

    /**
     * Duplicates this material preserving pipeline state, uniforms, and texture bindings.
     */
    public clone(): Material {
        const clonedTextures: Record<number, ITexture> = {};
        for (const [unit, tex] of this._textures.entries()) {
            clonedTextures[unit] = tex;
        }

        const clonedCubeTextures: Record<number, ICubeTexture> = {};
        for (const [unit, cubeTex] of this._cubeTextures.entries()) {
            clonedCubeTextures[unit] = cubeTex;
        }

        return new Material({
            shaderKey: this._shaderKey,
            pipelineState: { ...this._pipelineState },
            uniforms: this.getUniforms(),
            textures: clonedTextures,
            cubeTextures: clonedCubeTextures,
        });
    }

    /**
     * Deterministic disposal: disposes assigned textures and clears uniforms.
     */
    public dispose(): void {
        for (const tex of this._textures.values()) {
            if (tex && typeof tex.dispose === "function") {
                tex.dispose();
            }
        }
        this._textures.clear();

        for (const cubeTex of this._cubeTextures.values()) {
            if (cubeTex && typeof cubeTex.dispose === "function") {
                cubeTex.dispose();
            }
        }
        this._cubeTextures.clear();
        this._uniforms.clear();
    }
}
