import { computeLayoutStride } from "../../webgl/geometry/vertex_layout";
import type {
    GeometryBufferData,
    GeometryDisposeListener,
    IMeshGeometry,
} from "./mesh_geometry_types";
import { GLPrimitive } from "../../webgl/core/webgl_constants_types";

let nextGeometryId = 0;
function generateGeometryId(prefix: string = "MeshGeometry"): string {
    return `${prefix}_${++nextGeometryId}`;
}

/**
 * Pure CPU-side geometry representation wrapping vertex and index buffer data.
 * Completely decoupled from WebGL contexts, VBOs, and shaders.
 */
export class MeshGeometry implements IMeshGeometry {
    public readonly id: string;

    private _bufferData: GeometryBufferData;
    private readonly _primitiveType: GLPrimitive | number;
    private _version: number = 0;
    private readonly _disposeListeners: Set<GeometryDisposeListener> = new Set();
    private _isDisposed: boolean = false;

    /**
     * @param bufferData Interleaved vertex data, layout specification, and optional indices.
     * @param primitiveType WebGL primitive type (defaults to GLPrimitive.Triangles).
     * @param id Optional explicit debugging identifier.
     */
    constructor(
        bufferData: GeometryBufferData,
        primitiveType: GLPrimitive | number = GLPrimitive.Triangles,
        id?: string
    ) {
        this._bufferData = bufferData;
        this._primitiveType = primitiveType;
        this.id = id ?? generateGeometryId();
    }

    public get version(): number {
        return this._version;
    }

    public get vertexCount(): number {
        return this._bufferData.vertexCount;
    }

    public get primitiveType(): GLPrimitive | number {
        return this._primitiveType;
    }

    public get indexCount(): number | null {
        return this._bufferData.indices ? this._bufferData.indices.length : null;
    }

    public get bufferData(): GeometryBufferData {
        return this._bufferData;
    }

    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    /**
     * Replaces or updates the interleaved vertex attributes, incrementing the revision version.
     */
    public setAttributes(attributes: Float32Array, vertexCount?: number): void {
        this._bufferData.attributes = attributes;
        if (vertexCount !== undefined) {
            this._bufferData.vertexCount = vertexCount;
        } else {
            const strideBytes = computeLayoutStride(this._bufferData.layout);
            if (strideBytes > 0) {
                this._bufferData.vertexCount = Math.floor(attributes.byteLength / strideBytes);
            }
        }
        this._version++;
    }

    /**
     * Replaces or updates index data, incrementing the revision version.
     */
    public setIndices(indices: Uint16Array | Uint32Array | undefined): void {
        this._bufferData.indices = indices;
        this._version++;
    }

    /**
     * Manually marks CPU geometry data as modified, forcing a GPU re-upload on next bind.
     */
    public markDirty(): void {
        this._version++;
    }

    /**
     * Subscribes a listener to be notified when this geometry is disposed.
     * Returns an unsubscribe callback.
     */
    public onDispose(listener: GeometryDisposeListener): () => void {
        this._disposeListeners.add(listener);
        return () => {
            this._disposeListeners.delete(listener);
        };
    }

    /**
     * Triggers deterministic disposal, notifying the GeometryManager to free GPU resources.
     */
    public dispose(): void {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        for (const listener of this._disposeListeners) {
            try {
                listener(this);
            } catch (err) {
                console.error("[MeshGeometry] Error in dispose listener:", err);
            }
        }
        this._disposeListeners.clear();
    }
}
