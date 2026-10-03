import type { VertexBuffer } from "../../webgl/vertex_buffer";
import type { VertexLayoutSpec } from "../../webgl/vertex_layout_types";
import type { IWebGLContextManager } from "../../webgl/context_manager_types";

/**
 * CPU-side geometry buffer descriptor declaring interleaved vertex attributes,
 * optional index elements, and vertex layout schema.
 */
export interface GeometryBufferData {
    /** Interleaved vertex attribute data array */
    attributes: Float32Array;
    /** Attribute layout schema for VAO configuration */
    layout: VertexLayoutSpec;
    /** Total number of vertices */
    vertexCount: number;
    /** Optional index buffer data for indexed draw calls */
    indices?: Uint16Array | Uint32Array;
}

/**
 * Public interface for passive GPU geometry storage.
 * Encapsulates vertex buffers, attribute schema, primitive type, and index count
 * without coupling to materials, shaders, or rendering logic.
 */
export interface IMeshGeometry {
    /** Unique identifier for GPU buffer caching and inspection */
    readonly id: string;

    /** Managed VertexBuffer wrapping VBO and VAO handles */
    readonly vertexBuffer: VertexBuffer | null;

    /** Total vertex count for draw calls */
    readonly vertexCount: number;

    /** WebGL primitive type (e.g. gl.TRIANGLES, gl.POINTS, gl.LINES) */
    readonly primitiveType: number;

    /** Optional index count (null if non-indexed) */
    readonly indexCount: number | null;

    /** Allocates GPU buffers via WebGLContextManager */
    init(gl: WebGL2RenderingContext, contextManager: IWebGLContextManager): void;

    /** Binds the underlying VAO for drawing */
    bind(): void;

    /** Releases GPU buffer handles and cleans up resources */
    destroy(): void;
}
