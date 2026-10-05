import type { ShaderProgram } from "../shaders/shader_program";
import type { ShaderProgramOptions } from "../shaders/shader_program_types";
import type { PipelineState } from "../../scene/materials/material_types";
import type { ShaderKey } from "../shaders/shader_types";
import type { IGeometryManager } from "../geometry/geometry_manager_types";
import type { ITextureManager } from "../textures/texture_manager_types";
import type { IShaderManager } from "../shaders/shader_manager_types";
import type { IContextSubsystem, SubsystemDiagnostics } from "./subsystem_types";

/**
 * Public contract for the central WebGL GPU resource manager and microkernel coordinator.
 * Coordinates priority-based context recovery across registered subsystems (Shaders, Textures, Geometries),
 * and caches pipeline state.
 */
export interface IWebGLContextManager {
    /** Sets or updates the active WebGL2 rendering context. */
    setContext(gl: WebGL2RenderingContext): void;

    /** Retrieves the current WebGL2 rendering context. */
    getContext(): WebGL2RenderingContext | null;

    /** Retrieves the currently active WebGLProgram without querying GPU state. */
    getCurrentProgram(): WebGLProgram | null;

    /** Retrieves the currently active ShaderProgram instance, if any. */
    getCurrentShader(): ShaderProgram<never> | null;

    /** Binds the specified ShaderProgram to the WebGL context with redundant-call skipping. */
    useShader<TUniforms extends object = never>(shader: ShaderProgram<TUniforms> | null): void;

    /** Low-level bind for a raw WebGLProgram. */
    useProgram(program: WebGLProgram | null): void;

    /**
     * Factory & Registry: Retrieves a shared ShaderProgram (incrementing refCount) or
     * compiles and caches a new one (refCount = 1).
     */
    getOrCreateShader<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey,
        options: ShaderProgramOptions
    ): ShaderProgram<TUniforms>;

    /**
     * Registry Query: Retrieves an existing compiled ShaderProgram if registered, without altering refCount.
     */
    getShader<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey
    ): ShaderProgram<TUniforms> | null;

    /** Asserts desired WebGL pipeline state; skips redundant driver calls. */
    applyPipelineState(state: PipelineState): void;

    /** Resets cached pipeline state to default or canvas baseline. */
    resetPipelineState(): void;

    /** Forces depth mask true or false (e.g. before clearing depth buffer). */
    setDepthMask(enabled: boolean): void;

    /** Binds a WebGLTexture to a hardware texture unit with redundant call skipping. */
    bindTexture(unit: number, texture: WebGLTexture | null): void;

    /** Binds a WebGLTexture cubemap to a hardware texture unit with redundant call skipping. */
    bindCubeTexture(unit: number, texture: WebGLTexture | null): void;

    /** Retrieves the shared 1x1 solid white fallback texture handle. */
    getDefaultWhiteTexture(): WebGLTexture | null;

    /** Retrieves the shared 1x1 solid black fallback cubemap texture handle. */
    getDefaultBlackCubeTexture(): WebGLTexture | null;

    /** Primary subsystem accessors */
    readonly shaders: IShaderManager;
    readonly textures: ITextureManager;
    readonly geometries: IGeometryManager;

    /** Subsystems registry & microkernel registration */
    registerSubsystem<T extends IContextSubsystem>(subsystem: T): T;
    getSubsystem<T extends IContextSubsystem>(name: string): T | null;

    /** Aggregated diagnostics report across all registered subsystems */
    getDiagnostics(): Record<string, SubsystemDiagnostics>;

    /** Maximum hardware texture units supported in fragment shaders. */
    readonly maxTextureUnits: number;

    /** Handlers invoked when a WebGL context lost event occurs. */
    handleContextLost(): void;

    /** Automated Priority-based Context Loss Recovery. */
    handleContextRestored(newGl: WebGL2RenderingContext): void;

    /** Disposes all subsystems, vertex buffers, and context references. */
    destroy(): void;
}
