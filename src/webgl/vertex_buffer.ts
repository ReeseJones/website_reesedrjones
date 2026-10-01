import { VertexLayoutSpec, configureVAO } from "./vertex_layout";
import { ShaderProgram } from "./shader_program";

/**
 * Managed GPU Vertex Buffer Object (VBO) and Vertex Array Object (VAO) wrapper.
 * Retains a CPU geometry data cache, optional associated ShaderProgram reference for symbol lookups,
 * and handles GPU memory allocation, VAO binding, and automated context restoration.
 */
export class VertexBuffer {
    public readonly layout: VertexLayoutSpec;
    public shader?: ShaderProgram | WebGLProgram;

    private gl: WebGL2RenderingContext | null = null;
    private vbo: WebGLBuffer | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private cpuData: Float32Array | null = null;
    private usage: number;

    constructor(
        gl: WebGL2RenderingContext | null,
        layout: VertexLayoutSpec,
        shader?: ShaderProgram | WebGLProgram
    ) {
        this.gl = gl;
        this.layout = layout;
        this.shader = shader;
        this.usage = gl ? gl.STATIC_DRAW : 0x88e4; // 0x88e4 is gl.STATIC_DRAW

        if (this.gl && !this.gl.isContextLost()) {
            this.buildGPUResources();
        }
    }

    /**
     * Initializes or updates the active WebGL context.
     */
    public init(gl: WebGL2RenderingContext): void {
        this.gl = gl;
        this.usage = gl.STATIC_DRAW;
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

        if (this.gl && !this.gl.isContextLost() && this.vbo) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.usage);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        }
    }

    /**
     * Binds the underlying VAO for rendering (gl.bindVertexArray(this.vao)).
     */
    public bind(): void {
        if (this.gl && !this.gl.isContextLost() && this.vao) {
            this.gl.bindVertexArray(this.vao);
        }
    }

    /**
     * Unbinds the VAO (gl.bindVertexArray(null)).
     */
    public unbind(): void {
        if (this.gl && !this.gl.isContextLost()) {
            this.gl.bindVertexArray(null);
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
    public rebuild(gl: WebGL2RenderingContext, program?: WebGLProgram | ShaderProgram): void {
        this.gl = gl;
        this.destroyGPUResources();
        this.buildGPUResources(program);
    }

    /**
     * Safely releases GPU resources and clears CPU memory cache.
     */
    public destroy(): void {
        this.destroyGPUResources();
        this.cpuData = null;
        this.gl = null;
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
