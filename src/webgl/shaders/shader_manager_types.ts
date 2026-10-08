import type { ShaderProgram } from "./shader_program";
import type { VertexShader } from "./vertex_shader";
import type { FragmentShader } from "./fragment_shader";
import type {
    ShaderKey,
    ShaderUniformsOf,
    VertexShaderKey,
    FragmentShaderKey,
    ShaderStageDef,
    ShaderProgramDef,
} from "./shader_types";
import type { IContextSubsystem, SubsystemDiagnostics } from "../core/subsystem_types";

/**
 * Public contract for the WebGL Shader Manager subsystem.
 * Manages reusable VertexShader and FragmentShader stages, context-scoped ShaderProgram instances,
 * program binding deduplication, and automated Phase 1 context restoration.
 */
export interface IShaderManager extends IContextSubsystem {
    /** The currently active ShaderProgram instance, if any */
    readonly activeShader: ShaderProgram<never> | null;

    /** The currently active raw WebGLProgram handle, if any */
    readonly activeProgram: WebGLProgram | null;

    /** Total number of unique shader programs registered in memory */
    readonly programCount: number;

    /** Total number of unique vertex shader stages registered in memory */
    readonly vertexShaderCount: number;

    /** Total number of unique fragment shader stages registered in memory */
    readonly fragmentShaderCount: number;

    /**
     * Factory & Registry: Retrieves an existing cached VertexShader or compiles and caches a new one.
     */
    getOrCreateVertexShader(
        key: VertexShaderKey,
        def?: ShaderStageDef
    ): VertexShader;

    /**
     * Factory & Registry: Retrieves an existing cached FragmentShader or compiles and caches a new one.
     */
    getOrCreateFragmentShader(
        key: FragmentShaderKey,
        def?: ShaderStageDef
    ): FragmentShader;

    /**
     * Registry Query: Retrieves an existing compiled VertexShader if registered.
     */
    getVertexShader(key: VertexShaderKey): VertexShader | null;

    /**
     * Registry Query: Retrieves an existing compiled FragmentShader if registered.
     */
    getFragmentShader(key: FragmentShaderKey): FragmentShader | null;

    /**
     * Factory & Registry: Retrieves an existing cached ShaderProgram or links and caches a new one.
     */
    getOrCreate<K extends ShaderKey>(
        key: K,
        def?: ShaderProgramDef<K>
    ): ShaderProgram<ShaderUniformsOf<K>>;

    /**
     * Registry Query: Retrieves an existing compiled ShaderProgram if registered.
     */
    get<K extends ShaderKey>(key: K): ShaderProgram<ShaderUniformsOf<K>> | null;

    /**
     * Checks if a shader program with the given key is currently registered.
     */
    has(key: ShaderKey): boolean;

    /**
     * Binds the specified ShaderProgram to the WebGL context with redundant-call skipping.
     */
    bind<TUniforms extends object = never>(shader: ShaderProgram<TUniforms> | null): void;

    /**
     * Activates a ShaderProgram by canonical key, lazily compiling stages and linking programs if needed.
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

    /**
     * Disposes all registered shader programs and stages, clearing internal caches.
     */
    destroy(): void;

    /**
     * Telemetry query returning active counts and binding state.
     */
    getDiagnostics(): SubsystemDiagnostics;
}
