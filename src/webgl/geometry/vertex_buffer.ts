import { configureVAO } from "./vertex_layout";
import type { VertexLayoutSpec } from "./vertex_layout_types";
import { ShaderProgram } from "../shaders/shader_program";

import type { IWebGLContextManager } from "../core/context_manager_types";

/**
 * Managed GPU Vertex Buffer Object (VBO) and Vertex Array Object (VAO) wrapper.
 * Retains a CPU geometry data cache, optional associated ShaderProgram reference for symbol lookups,
 * and handles GPU memory allocation, VAO binding, and automated context restoration.
 */
export class VertexBuffer {
    public readonly layout: VertexLayoutSpec;
    public shader?: ShaderProgram | WebGLProgram;

    private readonly contextManager: IWebGLContextManager;
    private vbo: WebGLBuffer | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private cpuData: Float32Array | null = null;
    private usage: number;

    private get gl(): WebGL2RenderingContext | null {
        return this.contextManager.getContext();
    }

    constructor(
        contextManager: IWebGLContextManager,
        layout: VertexLayoutSpec,
        shader?: ShaderProgram | WebGLProgram
    ) {
        this.contextManager = contextManager;
        this.layout = layout;
        this.shader = shader;
        const currentGl = this.gl;
        this.usage = currentGl ? currentGl.STATIC_DRAW : WebGL2RenderingContext.STATIC_DRAW;

        if (currentGl && !currentGl.isContextLost()) {
            this.buildGPUResources();
        }
    }

    /**
     * Initializes or updates GPU resources when a context becomes available.
     */
    public init(_gl?: WebGL2RenderingContext): void {
        const currentGl = this.gl;
        if (currentGl) {
            this.usage = currentGl.STATIC_DRAW;
        }
        if (!this.vao || !this.vbo) {
            this.buildGPUResources();
        }
    }

    /**
     * Caches CPU geometry array data and uploads it to GPU memory via gl.bufferData().
     */
    public setData(data: Float32Array, usage?: number): void {
        this.cpuData = data;
        if (usage !== undefined) {
            this.usage = usage;
        }

        const currentGl = this.gl;
        if (currentGl && !currentGl.isContextLost() && this.vbo) {
            currentGl.bindBuffer(currentGl.ARRAY_BUFFER, this.vbo);
            currentGl.bufferData(currentGl.ARRAY_BUFFER, data, this.usage);
            currentGl.bindBuffer(currentGl.ARRAY_BUFFER, null);
        }
    }

    /**
     * Binds the underlying VAO for rendering (gl.bindVertexArray(this.vao)).
     */
    public bind(): void {
        const currentGl = this.gl;
        if (currentGl && !currentGl.isContextLost() && this.vao) {
            currentGl.bindVertexArray(this.vao);
        }
    }

    /**
     * Unbinds the VAO (gl.bindVertexArray(null)).
     */
    public unbind(): void {
        const currentGl = this.gl;
        if (currentGl && !currentGl.isContextLost()) {
            currentGl.bindVertexArray(null);
        }
    }

    /**
     * Returns true if GPU buffer and VAO handles are valid.
     */
    public isValid(): boolean {
        return this.vao !== null && this.vbo !== null;
    }

    /**
     * Re-allocates GPU VBO and VAO handles on a restored WebGL context,
     * re-uploads cached CPU array data, and re-configures layout attribute pointers.
     */
    public rebuild(_gl?: WebGL2RenderingContext, program?: WebGLProgram | ShaderProgram): void {
        this.destroyGPUResources();
        this.buildGPUResources(program);
    }

    /**
     * Safely releases GPU resources and clears CPU memory cache.
     */
    public destroy(): void {
        this.destroyGPUResources();
        this.cpuData = null;
    }

    // --- Private Helpers ---

    private buildGPUResources(programOverride?: WebGLProgram | ShaderProgram): void {
        if (!this.gl || this.gl.isContextLost()) return;

        this.vbo = this.gl.createBuffer();
        this.vao = this.gl.createVertexArray();

        if (this.cpuData && this.vbo) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.cpuData, this.usage);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        }

        const effectiveShader = programOverride ?? this.shader;
        const targetProgram =
            effectiveShader instanceof ShaderProgram
                ? effectiveShader.getProgram()
                : effectiveShader;

        if (this.vao && this.vbo) {
            configureVAO(this.gl, this.vao, this.vbo, this.layout, targetProgram ?? undefined);
        }
    }

    private destroyGPUResources(): void {
        if (this.gl && !this.gl.isContextLost()) {
            if (this.vbo) this.gl.deleteBuffer(this.vbo);
            if (this.vao) this.gl.deleteVertexArray(this.vao);
        }
        this.vbo = null;
        this.vao = null;
    }
}
