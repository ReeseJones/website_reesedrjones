import type { ShaderKey } from "../../webgl/shader_types";
import type { ITexture, TextureUnit } from "../../webgl/texture_types";

/**
 * WebGL blending mode presets for scene materials.
 */
export type BlendMode = "opaque" | "alpha" | "additive";

/**
 * Encapsulated WebGL pipeline rasterization and depth/blend state.
 */
export interface PipelineState {
    /** Blending mode preset */
    blendMode: BlendMode;
    /** Whether depth testing is enabled */
    depthTest: boolean;
    /** Whether writes to the depth buffer are enabled (depthMask) */
    depthWrite: boolean;
    /** Whether backface culling is enabled */
    cullFace: boolean;
}

/**
 * Construction options for initializing a Material.
 */
export interface MaterialOptions {
    /** Unique shader key registered with WebGLContextManager */
    shaderKey: ShaderKey;
    /** Pipeline state overrides */
    pipelineState?: Partial<PipelineState>;
    /** Initial material-specific uniform values */
    uniforms?: Record<string, unknown>;
    /** Initial texture assignments mapped by conventional unit index or TextureUnit enum */
    textures?: Partial<Record<TextureUnit | number, ITexture>>;
}

/**
 * Public contract for material appearance, shader association, and pipeline state.
 */
export interface IMaterial {
    /** Shader program identifier registered with WebGLContextManager */
    readonly shaderKey: ShaderKey;

    /** Active pipeline state settings */
    readonly pipelineState: PipelineState;

    /** Sets or updates an individual uniform value */
    setUniform(name: string, value: unknown): this;

    /** Sets multiple uniform values from a key-value dictionary */
    setUniforms(uniforms: Record<string, unknown>): this;

    /** Retrieves all currently assigned material uniform values */
    getUniforms(): Readonly<Record<string, unknown>>;

    /** Binds a texture resource to a specific hardware texture unit (e.g. TextureUnit.Color) */
    setTexture(unit: TextureUnit | number, texture: ITexture | null): this;

    /** Retrieves the texture bound to a specific hardware texture unit, if any */
    getTexture(unit: TextureUnit | number): ITexture | null;

    /** Retrieves all assigned textures mapped by hardware texture unit */
    getTextures(): ReadonlyMap<TextureUnit | number, ITexture>;

    /** Duplicates this material preserving pipeline state, uniforms, and texture bindings */
    clone(): IMaterial;
}
