import { ShaderProgram, ShaderProgramOptions } from "./shader_program";
import { VertexBuffer } from "./vertex_buffer";
import { VertexLayoutSpec } from "./vertex_layout";

export interface ShaderEntry<TUniforms extends Record<string, any> = Record<string, any>> {
    shader: ShaderProgram<TUniforms>;
    refCount: number;
}

/**
 * Central WebGL GPU resource manager and lifecycle allocator.
 * Manages ref-counted persistent ShaderProgram instances, tracks managed VertexBuffers via a
 * request/release pattern, and executes a 2-phase automated context restoration sequence
 * upon receiving webglcontextrestored events.
 */
export class WebGLContextManager {
    private gl: WebGL2RenderingContext | null = null;
    private shaderRegistry = new Map<string, ShaderEntry<any>>();
    private activeBuffers = new Set<VertexBuffer>();
    private currentProgram: WebGLProgram | null = null;
    private currentShader: ShaderProgram<any> | null = null;

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
    public getCurrentShader(): ShaderProgram<any> | null {
        return this.currentShader;
    }

    /**
     * Binds the specified ShaderProgram to the WebGL context and updates tracked state.
     * Skips redundant GPU driver calls if the shader is already active.
     */
    public useShader(shader: ShaderProgram<any> | null): void {
        if (this.currentShader === shader) return;

        const program = shader ? shader.getProgram() : null;
        if (this.currentProgram !== program) {
            if (this.gl) {
                this.gl.useProgram(program);
            }
            this.currentProgram = program;
        }
        this.currentShader = shader;
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
    public getOrCreateShader<TUniforms extends Record<string, any> = Record<string, any>>(
        key: string,
        options: ShaderProgramOptions
    ): ShaderProgram<TUniforms> {
        let entry = this.shaderRegistry.get(key);
        if (!entry) {
            if (!this.gl) {
                throw new Error(`WebGLContextManager: Cannot create shader '${key}' before context is set.`);
            }
            const shader = new ShaderProgram<TUniforms>(this.gl, options, this);
            entry = { shader, refCount: 0 };
            this.shaderRegistry.set(key, entry);
        }
        entry.refCount++;
        return entry.shader as ShaderProgram<TUniforms>;
    }

    /**
     * Release Pattern: Decrements a ShaderProgram's reference count.
     * When refCount reaches 0 (no renderers are using it), destroys the GPU program and unregisters it.
     */
    public releaseShader<TUniforms extends Record<string, any> = Record<string, any>>(
        keyOrInstance: string | ShaderProgram<TUniforms>
    ): void {
        let targetKey: string | null = null;
        if (typeof keyOrInstance === "string") {
            targetKey = keyOrInstance;
        } else {
            for (const [k, entry] of this.shaderRegistry.entries()) {
                if (entry.shader === keyOrInstance) {
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
    public createVertexBuffer<TUniforms extends Record<string, any> = Record<string, any>>(
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
     * Handlers invoked when a WebGL context lost event occurs.
     */
    public handleContextLost(): void {
        this.gl = null;
        this.currentProgram = null;
        this.currentShader = null;
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

        // Phase 1: Rebuild Shaders with active refCount > 0
        for (const entry of this.shaderRegistry.values()) {
            if (entry.refCount > 0) {
                entry.shader.rebuild(newGl);
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
        this.gl = null;
    }
}
