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
    shaderKey: string;
    /** Pipeline state overrides */
    pipelineState?: Partial<PipelineState>;
    /** Initial material-specific uniform values */
    uniforms?: Record<string, unknown>;
}

/**
 * Public contract for material appearance, shader association, and pipeline state.
 */
export interface IMaterial {
    /** Shader program identifier registered with WebGLContextManager */
    readonly shaderKey: string;

    /** Active pipeline state settings */
    readonly pipelineState: PipelineState;

    /** Sets or updates an individual uniform value */
    setUniform(name: string, value: unknown): this;

    /** Sets multiple uniform values from a key-value dictionary */
    setUniforms(uniforms: Record<string, unknown>): this;

    /** Retrieves all currently assigned material uniform values */
    getUniforms(): Readonly<Record<string, unknown>>;

    /** Directly applies configured pipeline state (blendFunc, depthMask, etc.) to the WebGL context */
    applyPipelineState(gl: WebGL2RenderingContext): void;
}
