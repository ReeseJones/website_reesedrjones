import type { ShaderProgram } from "./shader_program";
import type { ShaderProgramOptions } from "./shader_program_types";
import type { VertexBuffer } from "./vertex_buffer";
import type { VertexLayoutSpec } from "./vertex_layout_types";

export interface ShaderEntry<TUniforms extends object = Record<string, unknown>> {
    shader: ShaderProgram<TUniforms>;
    refCount: number;
}

/**
 * Public contract for the central WebGL GPU resource manager and lifecycle allocator.
 * Manages context tracking, ref-counted ShaderProgram instances, managed VertexBuffers,
 * and automated context recovery.
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
        key: string,
        options: ShaderProgramOptions
    ): ShaderProgram<TUniforms>;

    /**
     * Release Pattern: Decrements a ShaderProgram's reference count and disposes it at 0.
     */
    releaseShader<TUniforms extends object = Record<string, unknown>>(
        keyOrInstance: string | ShaderProgram<TUniforms>
    ): void;

    /**
     * Factory Request: Allocates a new managed VertexBuffer tracking VBO and VAO handles.
     */
    createVertexBuffer<TUniforms extends object = Record<string, unknown>>(
        layout: VertexLayoutSpec,
        shader?: ShaderProgram<TUniforms> | WebGLProgram
    ): VertexBuffer;

    /**
     * Release Pattern: Deletes GPU resources associated with a VertexBuffer.
     */
    releaseVertexBuffer(buffer: VertexBuffer): void;

    /** Handlers invoked when a WebGL context lost event occurs. */
    handleContextLost(): void;

    /** Automated 2-Phase Context Loss Recovery. */
    handleContextRestored(newGl: WebGL2RenderingContext): void;

    /** Disposes all shader programs, vertex buffers, and context references. */
    destroy(): void;
}
