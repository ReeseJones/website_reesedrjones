import type { ShaderProgram } from "./shader_program";
import type { ShaderProgramOptions } from "./shader_program_types";
import type { ShaderKey, ShaderUniformsOf } from "./shader_types";
import type { IContextSubsystem, SubsystemDiagnostics } from "../core/subsystem_types";

/**
 * Public contract for the WebGL Shader Manager subsystem.
 * Manages context-scoped ShaderProgram instances, program binding deduplication,
 * and automated Phase 1 context restoration.
 */
export interface IShaderManager extends IContextSubsystem {
    /** The currently active ShaderProgram instance, if any */
    readonly activeShader: ShaderProgram<never> | null;

    /** The currently active raw WebGLProgram handle, if any */
    readonly activeProgram: WebGLProgram | null;

    /** Total number of unique shader programs registered in memory */
    readonly shaderCount: number;

    /**
     * Factory & Registry: Retrieves an existing cached ShaderProgram or compiles and caches a new one.
     */
    getOrCreate<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey,
        options: ShaderProgramOptions
    ): ShaderProgram<TUniforms>;

    /**
     * Registry Query: Retrieves an existing compiled ShaderProgram if registered.
     */
    get<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey
    ): ShaderProgram<TUniforms> | null;

    /**
     * Checks if a shader with the given key is currently registered.
     */
    has(key: ShaderKey): boolean;

    /**
     * Deterministic Disposal: Destroys the specified ShaderProgram and frees GPU driver handles.
     */
    dispose<TUniforms extends object = Record<string, unknown>>(
        keyOrInstance: ShaderKey | ShaderProgram<TUniforms>
    ): void;

    /**
     * Binds the specified ShaderProgram to the WebGL context with redundant-call skipping.
     */
    bind<TUniforms extends object = never>(shader: ShaderProgram<TUniforms> | null): void;

    /**
     * Activates a ShaderProgram by canonical key, lazily compiling standard shaders if needed.
     * Infers the strongly-typed uniform interface for the shader program.
     */
    bindKey<K extends ShaderKey>(key: K): ShaderProgram<ShaderUniformsOf<K>>;

    /**
     * Low-level bind for a raw WebGLProgram with redundant-call skipping.
     */
    bindProgram(program: WebGLProgram | null): void;

    /**
     * Unbinds the currently active shader program.
     */
    unbind(): void;

    /** Backwards-compatible aliases */
    useShader?<TUniforms extends object = never>(shader: ShaderProgram<TUniforms> | null): void;
    useProgram?(program: WebGLProgram | null): void;
    getOrCreateShader?<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey,
        options: ShaderProgramOptions
    ): ShaderProgram<TUniforms>;
    getShader?<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey
    ): ShaderProgram<TUniforms> | null;
    releaseShader?<TUniforms extends object = Record<string, unknown>>(
        keyOrInstance: ShaderKey | ShaderProgram<TUniforms>
    ): void;
}
