import { configureVAO } from "./vertex_layout";
import type { IVertexBuffer, VertexLayoutSpec } from "./vertex_layout_types";
import type { IWebGLContextManager } from "../core/context_manager_types";
import { GLBufferUsage } from "../core/webgl_constants_types";

/**
 * Managed GPU Vertex Buffer Object (VBO) and Vertex Array Object (VAO) wrapper.
 * Retains a CPU geometry data cache and handles GPU memory allocation, VAO binding,
 * and automated context restoration.
 */
export class VertexBuffer implements IVertexBuffer {
    public readonly label: string;
    public readonly layout: VertexLayoutSpec;

    private readonly contextManager: IWebGLContextManager;
    private vbo: WebGLBuffer | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private cpuData: Float32Array | null = null;
    private usage: GLBufferUsage;
    private _isDisposed: boolean = false;
    private readonly _onDisposeCallbacks: Set<() => void> = new Set();

    private get gl(): WebGL2RenderingContext | null {
        return this.contextManager.getContext();
    }

    constructor(
        contextManager: IWebGLContextManager,
        layout: VertexLayoutSpec,
        label: string = "VertexBuffer"
    ) {
        this.contextManager = contextManager;
        this.layout = layout;
        this.label = label;
        this.usage = GLBufferUsage.StaticDraw;

        const currentGl = this.gl;
        if (currentGl && !currentGl.isContextLost()) {
            this.buildGPUResources();
        }
    }

    public get isValid(): boolean {
        return this.vao !== null && this.vbo !== null && !this._isDisposed;
    }

    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    /**
     * Initializes or updates GPU resources when a context becomes available.
     */
    public init(gl?: WebGL2RenderingContext): void {
        this.usage = GLBufferUsage.StaticDraw;
        if (!this.vao || !this.vbo) {
            this.buildGPUResources(gl);
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
            currentGl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, this.vbo);
            currentGl.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, data, this.usage);
            currentGl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
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
     * WebGL context lost lifecycle hook: wipes hardware handles.
     */
    public onContextLost(): void {
        this.vbo = null;
        this.vao = null;
    }

    /**
     * WebGL context restored lifecycle hook: rebuilds GPU resources and re-uploads cached cpuData.
     */
    public onContextRestored(gl: WebGL2RenderingContext): void {
        if (this._isDisposed) return;
        this.vbo = null;
        this.vao = null;
        this.buildGPUResources(gl);
    }

    /**
     * Registers a callback to be invoked when dispose() is called.
     * Returns an unsubscribe function.
     */
    public onDispose(callback: () => void): () => void {
        if (this._isDisposed) {
            callback();
            return () => {};
        }
        this._onDisposeCallbacks.add(callback);
        return () => {
            this._onDisposeCallbacks.delete(callback);
        };
    }

    /**
     * Deterministic disposal: frees GPU buffer and VAO handles, unbinds from context,
     * marks isDisposed = true, and fires onDispose subscribers.
     */
    public dispose(): void {
        if (this._isDisposed) return;
        this._isDisposed = true;

        const currentGl = this.gl;
        if (currentGl && !currentGl.isContextLost()) {
            currentGl.bindVertexArray(null);
            currentGl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
            if (this.vao) currentGl.deleteVertexArray(this.vao);
            if (this.vbo) currentGl.deleteBuffer(this.vbo);
        }
        this.vbo = null;
        this.vao = null;
        this.cpuData = null;

        for (const callback of this._onDisposeCallbacks) {
            try {
                callback();
            } catch (err) {
                console.error(`[${this.label}] Error in onDispose callback:`, err);
            }
        }
        this._onDisposeCallbacks.clear();
    }

    // --- Private Helpers ---

    private buildGPUResources(glContext?: WebGL2RenderingContext): void {
        const gl = glContext ?? this.gl;
        if (!gl || gl.isContextLost()) return;

        this.vbo = gl.createBuffer();
        this.vao = gl.createVertexArray();

        if (this.cpuData && this.vbo) {
            gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, this.vbo);
            gl.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, this.cpuData, this.usage);
            gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
        }

        if (this.vao && this.vbo) {
            configureVAO(gl, this.vao, this.vbo, this.layout);
        }
    }
}
