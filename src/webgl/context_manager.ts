import { ShaderProgram } from "./shader_program";
import type { ShaderProgramOptions } from "./shader_program_types";
import { VertexBuffer } from "./vertex_buffer";
import type { VertexLayoutSpec } from "./vertex_layout_types";
import type { ShaderEntry, IWebGLContextManager } from "./context_manager_types";
import type { PipelineState } from "../scene/materials/material_types";

/**
 * Central WebGL GPU resource manager and lifecycle allocator.
 * Manages ref-counted persistent ShaderProgram instances, tracks managed VertexBuffers via a
 * request/release pattern, and executes a 2-phase automated context restoration sequence
 * upon receiving webglcontextrestored events.
 */
export class WebGLContextManager implements IWebGLContextManager {
    private gl: WebGL2RenderingContext | null = null;
    private shaderRegistry = new Map<string, ShaderEntry<never>>();
    private activeBuffers = new Set<VertexBuffer>();
    private currentProgram: WebGLProgram | null = null;
    private currentShader: ShaderProgram<never> | null = null;
    private currentPipelineState: PipelineState | null = null;

    constructor(gl?: WebGL2RenderingContext) {
        if (gl) {
            this.gl = gl;
        }
    }

    /**
     * Sets or updates the active WebGL2 rendering context.
     */
    public setContext(gl: WebGL2RenderingContext): void {
        this.gl = gl;
        this.currentProgram = null;
        this.currentShader = null;
        this.currentPipelineState = null;
    }

    /**
     * Retrieves the current WebGL2 rendering context.
     */
    public getContext(): WebGL2RenderingContext | null {
        return this.gl;
    }

    /**
     * Retrieves the currently active WebGLProgram without querying the GPU (no pipeline stall).
     */
    public getCurrentProgram(): WebGLProgram | null {
        return this.currentProgram;
    }

    /**
     * Retrieves the currently active ShaderProgram instance, if any.
     */
    public getCurrentShader(): ShaderProgram<never> | null {
        return this.currentShader;
    }

    /**
     * Binds the specified ShaderProgram to the WebGL context and updates tracked state.
     * Skips redundant GPU driver calls if the shader is already active.
     */
    public useShader<TUniforms extends object = never>(shader: ShaderProgram<TUniforms> | null): void {
        if (this.currentShader === (shader as unknown as ShaderProgram<never>)) return;

        const program = shader ? shader.getProgram() : null;
        if (this.currentProgram !== program) {
            if (this.gl) {
                this.gl.useProgram(program);
            }
            this.currentProgram = program;
        }
        this.currentShader = shader as unknown as ShaderProgram<never>;
    }

    /**
     * Low-level bind for a raw WebGLProgram.
     */
    public useProgram(program: WebGLProgram | null): void {
        if (this.currentProgram === program) return;
        if (this.gl) {
            this.gl.useProgram(program);
        }
        this.currentProgram = program;
        this.currentShader = null;
    }

    /**
     * Factory & Registry: Retrieves a shared ShaderProgram (incrementing refCount) or
     * compiles and caches a new one (refCount = 1) with strong uniform typing.
     */
    public getOrCreateShader<TUniforms extends object = Record<string, unknown>>(
        key: string,
        options: ShaderProgramOptions
    ): ShaderProgram<TUniforms> {
        let entry = this.shaderRegistry.get(key);
        if (!entry) {
            if (!this.gl) {
                throw new Error(`WebGLContextManager: Cannot create shader '${key}' before context is set.`);
            }
            const shader = new ShaderProgram<TUniforms>(this, options);
            entry = { shader: shader as unknown as ShaderProgram<never>, refCount: 0 };
            this.shaderRegistry.set(key, entry);
        }
        entry.refCount++;
        return entry.shader as unknown as ShaderProgram<TUniforms>;
    }

    /**
     * Registry Query: Retrieves an existing compiled ShaderProgram if registered, without altering refCount.
     */
    public getShader<TUniforms extends object = Record<string, unknown>>(
        key: string
    ): ShaderProgram<TUniforms> | null {
        const entry = this.shaderRegistry.get(key);
        return entry ? (entry.shader as unknown as ShaderProgram<TUniforms>) : null;
    }

    /**
     * Release Pattern: Decrements a ShaderProgram's reference count.
     * When refCount reaches 0 (no renderers are using it), destroys the GPU program and unregisters it.
     */
    public releaseShader<TUniforms extends object = Record<string, unknown>>(
        keyOrInstance: string | ShaderProgram<TUniforms>
    ): void {
        let targetKey: string | null = null;
        if (typeof keyOrInstance === "string") {
            targetKey = keyOrInstance;
        } else {
            for (const [k, entry] of this.shaderRegistry.entries()) {
                if ((entry.shader as unknown) === keyOrInstance) {
                    targetKey = k;
                    break;
                }
            }
        }

        if (!targetKey) return;

        const entry = this.shaderRegistry.get(targetKey);
        if (!entry) return;

        entry.refCount--;
        if (entry.refCount <= 0) {
            if (this.currentShader === entry.shader) {
                this.useShader(null);
            }
            entry.shader.destroy();
            this.shaderRegistry.delete(targetKey);
        }
    }

    /**
     * Factory Request: Allocates a new managed VertexBuffer tracking VBO and VAO GPU resources.
     * Optionally accepts an associated ShaderProgram or WebGLProgram for dynamic symbol location lookups.
     */
    public createVertexBuffer<TUniforms extends object = Record<string, unknown>>(
        layout: VertexLayoutSpec,
        shader?: ShaderProgram<TUniforms> | WebGLProgram
    ): VertexBuffer {
        const buffer = new VertexBuffer(this.gl, layout, shader);
        this.activeBuffers.add(buffer);
        return buffer;
    }

    /**
     * Release Pattern: Deletes GPU resources associated with a VertexBuffer and removes it
     * from manager tracking.
     */
    public releaseVertexBuffer(buffer: VertexBuffer): void {
        buffer.destroy();
        this.activeBuffers.delete(buffer);
    }

    /**
     * Asserts desired WebGL pipeline state; skips redundant driver calls.
     */
    public applyPipelineState(state: PipelineState): void {
        const gl = this.gl;
        if (!gl) return;

        const prev = this.currentPipelineState;

        if (!prev || prev.depthTest !== state.depthTest) {
            if (state.depthTest) {
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL);
            } else {
                gl.disable(gl.DEPTH_TEST);
            }
        }

        if (!prev || prev.depthWrite !== state.depthWrite) {
            gl.depthMask(state.depthWrite);
        }

        if (!prev || prev.blendMode !== state.blendMode) {
            if (state.blendMode === "opaque") {
                gl.disable(gl.BLEND);
            } else if (state.blendMode === "alpha") {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            } else if (state.blendMode === "additive") {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE);
            }
        }

        if (!prev || prev.cullFace !== state.cullFace) {
            if (state.cullFace) {
                gl.enable(gl.CULL_FACE);
            } else {
                gl.disable(gl.CULL_FACE);
            }
        }

        this.currentPipelineState = { ...state };
    }

    /**
     * Resets cached pipeline state to null (forcing next applyPipelineState to re-assert all states).
     */
    public resetPipelineState(): void {
        this.currentPipelineState = null;
    }

    /**
     * Forces depth mask true or false (e.g. before clearing depth buffer).
     */
    public setDepthMask(enabled: boolean): void {
        if (this.gl) {
            this.gl.depthMask(enabled);
        }
        if (this.currentPipelineState) {
            this.currentPipelineState.depthWrite = enabled;
        }
    }

    /**
     * Handlers invoked when a WebGL context lost event occurs.
     */
    public handleContextLost(): void {
        this.gl = null;
        this.currentProgram = null;
        this.currentShader = null;
        this.currentPipelineState = null;
        for (const entry of this.shaderRegistry.values()) {
            entry.shader.destroy();
        }
    }

    /**
     * Automated 2-Phase Context Loss Recovery:
     * - Phase 1: Re-compiles all registered ShaderPrograms with active demand (refCount > 0)
     *            and re-queries uniform locations.
     * - Phase 2: Re-allocates GPU VBO/VAO handles for all active VertexBuffers and re-uploads cached CPU data.
     */
    public handleContextRestored(newGl: WebGL2RenderingContext): void {
        this.gl = newGl;
        this.currentProgram = null;
        this.currentShader = null;
        this.currentPipelineState = null;

        // Phase 1: Rebuild Shaders with active refCount > 0
        for (const entry of this.shaderRegistry.values()) {
            if (entry.refCount > 0) {
                entry.shader.rebuild();
            }
        }

        // Phase 2: Rebuild Buffers & VAOs
        for (const buffer of this.activeBuffers.values()) {
            buffer.rebuild(newGl);
        }
    }

    /**
     * Disposes all shader programs, vertex buffers, and context references.
     */
    public destroy(): void {
        for (const buffer of this.activeBuffers.values()) {
            buffer.destroy();
        }
        this.activeBuffers.clear();

        for (const entry of this.shaderRegistry.values()) {
            entry.shader.destroy();
        }
        this.shaderRegistry.clear();

        this.currentProgram = null;
        this.currentShader = null;
        this.currentPipelineState = null;
        this.gl = null;
    }
}
