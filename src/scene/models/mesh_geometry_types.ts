import type { VertexLayoutSpec } from "../../webgl/geometry/vertex_layout_types";
import type { IDisposable } from "../../webgl/core/subsystem_types";

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
 * Callback invoked when a geometry triggers its disposal lifecycle.
 */
export type GeometryDisposeListener = (geometry: IMeshGeometry) => void;

/**
 * Public interface for pure CPU geometry representation.
 * Completely decoupled from WebGL contexts, VBOs, and shaders.
 */
export interface IMeshGeometry extends IDisposable {
    /** Descriptive or debugging identifier */
    readonly id: string;

    /** Whether this geometry has been disposed */
    readonly isDisposed: boolean;

    /** Monotonically increasing revision version tracking buffer mutations */
    readonly version: number;

    /** Total vertex count for draw calls */
    readonly vertexCount: number;

    /** WebGL primitive type (e.g. WebGL2RenderingContext.TRIANGLES, WebGL2RenderingContext.POINTS) */
    readonly primitiveType: number;

    /** Optional index count (null if non-indexed) */
    readonly indexCount: number | null;

    /** Active CPU buffer data specification */
    readonly bufferData: GeometryBufferData;

    /**
     * Replaces or updates the interleaved vertex attributes, incrementing the revision version.
     */
    setAttributes(attributes: Float32Array, vertexCount?: number): void;

    /**
     * Replaces or updates index data, incrementing the revision version.
     */
    setIndices(indices: Uint16Array | Uint32Array | undefined): void;

    /**
     * Manually marks CPU geometry data as modified, forcing a GPU re-upload on next bind.
     */
    markDirty(): void;

    /**
     * Subscribes a listener to be notified when this geometry is disposed.
     * Returns an unsubscribe callback.
     */
    onDispose(listener: GeometryDisposeListener): () => void;

    /**
     * Triggers deterministic disposal, notifying the GeometryManager to free GPU resources.
     */
    dispose(): void;
}
