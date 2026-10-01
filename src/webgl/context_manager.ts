import { ShaderProgram, ShaderProgramOptions } from "./shader_program";
import { VertexBuffer } from "./vertex_buffer";
import { VertexLayoutSpec } from "./vertex_layout";

export interface ShaderEntry {
    shader: ShaderProgram;
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
    private shaderRegistry = new Map<string, ShaderEntry>();
    private activeBuffers = new Set<VertexBuffer>();

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
    }

    /**
     * Retrieves the current WebGL2 rendering context.
     */
    public getContext(): WebGL2RenderingContext | null {
        return this.gl;
    }

    /**
     * Factory & Registry: Retrieves a shared ShaderProgram (incrementing refCount) or
     * compiles and caches a new one (refCount = 1).
     */
    public getOrCreateShader(key: string, options: ShaderProgramOptions): ShaderProgram {
        let entry = this.shaderRegistry.get(key);
        if (!entry) {
            if (!this.gl) {
                throw new Error(`WebGLContextManager: Cannot create shader '${key}' before context is set.`);
            }
            const shader = new ShaderProgram(this.gl, options);
            entry = { shader, refCount: 0 };
            this.shaderRegistry.set(key, entry);
        }
        entry.refCount++;
        return entry.shader;
    }

    /**
     * Release Pattern: Decrements a ShaderProgram's reference count.
     * When refCount reaches 0 (no renderers are using it), destroys the GPU program and unregisters it.
     */
    public releaseShader(keyOrInstance: string | ShaderProgram): void {
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
            entry.shader.destroy();
            this.shaderRegistry.delete(targetKey);
        }
    }

    /**
     * Factory Request: Allocates a new managed VertexBuffer tracking VBO and VAO GPU resources.
     * Optionally accepts an associated ShaderProgram or WebGLProgram for dynamic symbol location lookups.
     */
    public createVertexBuffer(
        layout: VertexLayoutSpec,
        shader?: ShaderProgram | WebGLProgram
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

        this.gl = null;
    }
}
