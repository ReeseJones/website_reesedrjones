import type { VertexBuffer } from "../../webgl/vertex_buffer";
import type { IWebGLContextManager } from "../../webgl/context_manager_types";
import type { GeometryBufferData, IMeshGeometry } from "./mesh_geometry_types";

let nextGeometryId = 0;
function generateGeometryId(prefix: string = "MeshGeometry"): string {
    return `${prefix}_${++nextGeometryId}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Passive GPU geometry representation wrapping vertex and index buffer data.
 * Adheres to the Geometry-Material separation principle: contains zero shaders,
 * zero uniforms, and zero rendering passes.
 */
export class MeshGeometry implements IMeshGeometry {
    public readonly id: string;

    protected readonly _bufferData: GeometryBufferData;
    protected readonly _primitiveType: number;
    protected _vertexBuffer: VertexBuffer | null = null;
    protected _indexBuffer: WebGLBuffer | null = null;
    protected _contextManager: IWebGLContextManager | null = null;
    protected _gl: WebGL2RenderingContext | null = null;

    /**
     * @param bufferData Interleaved vertex data, layout specification, and optional indices.
     * @param primitiveType WebGL primitive type (defaults to 0x0004 = gl.TRIANGLES).
     * @param id Optional explicit identifier.
     */
    constructor(
        bufferData: GeometryBufferData,
        primitiveType: number = 0x0004,
        id?: string
    ) {
        this._bufferData = bufferData;
        this._primitiveType = primitiveType;
        this.id = id ?? generateGeometryId();
    }

    public get vertexBuffer(): VertexBuffer | null {
        return this._vertexBuffer;
    }

    public get vertexCount(): number {
        return this._bufferData.vertexCount;
    }

    public get primitiveType(): number {
        return this._primitiveType;
    }

    public get indexCount(): number | null {
        return this._bufferData.indices ? this._bufferData.indices.length : null;
    }

    public get bufferData(): GeometryBufferData {
        return this._bufferData;
    }

    public get indexBuffer(): WebGLBuffer | null {
        return this._indexBuffer;
    }

    /**
     * Allocates GPU buffer handles via the context manager and uploads vertex/index data.
     */
    public init(gl: WebGL2RenderingContext, contextManager: IWebGLContextManager): void {
        this._gl = gl;
        this._contextManager = contextManager;

        if (this._vertexBuffer) {
            contextManager.releaseVertexBuffer(this._vertexBuffer);
            this._vertexBuffer = null;
        }

        if (this._indexBuffer) {
            gl.deleteBuffer(this._indexBuffer);
            this._indexBuffer = null;
        }

        this._vertexBuffer = contextManager.createVertexBuffer(this._bufferData.layout);
        this._vertexBuffer.setData(this._bufferData.attributes);

        if (this._bufferData.indices) {
            this._vertexBuffer.bind();
            this._indexBuffer = gl.createBuffer();
            if (this._indexBuffer) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._bufferData.indices, gl.STATIC_DRAW);
            }
            this._vertexBuffer.unbind();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        }
    }

    /**
     * Binds the underlying VAO for drawing.
     */
    public bind(): void {
        this._vertexBuffer?.bind();
    }

    /**
     * Releases GPU buffer allocations and detaches context references.
     */
    public destroy(): void {
        if (this._indexBuffer && this._gl && !this._gl.isContextLost()) {
            this._gl.deleteBuffer(this._indexBuffer);
            this._indexBuffer = null;
        }

        if (this._vertexBuffer && this._contextManager) {
            this._contextManager.releaseVertexBuffer(this._vertexBuffer);
            this._vertexBuffer = null;
        }

        this._gl = null;
        this._contextManager = null;
    }
}
