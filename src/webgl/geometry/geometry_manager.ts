import type { IWebGLContextManager } from "../core/context_manager_types";
import type { IMeshGeometry } from "../../scene/models/mesh_geometry_types";
import type { GPUGeometryRecord, IGeometryManager } from "./geometry_manager_types";
import { SubsystemRestorationPriority, type SubsystemDiagnostics } from "../core/subsystem_types";
import { VertexBuffer } from "./vertex_buffer";
import type { VertexLayoutSpec } from "./vertex_layout_types";

const DRAW_ELEMENTS_OFFSET = 0;
const DRAW_ARRAYS_START_INDEX = 0;

/**
 * Manages GPU geometry allocations (VBO, IBO, VAO), redundant binding deduplication,
 * dynamic buffer updates, and deterministic resource disposal.
 */
export class GeometryManager implements IGeometryManager {
    public readonly name = "geometry";
    public readonly restorationPriority = SubsystemRestorationPriority.Geometry;

    private readonly _contextManager: IWebGLContextManager;
    private _gl: WebGL2RenderingContext | null = null;
    private readonly _records: Map<IMeshGeometry, GPUGeometryRecord> = new Map();
    private readonly _standaloneBuffers: Set<VertexBuffer> = new Set();
    private _activeGeometryId: number | null = null;
    private _nextId: number = 0;

    constructor(contextManager: IWebGLContextManager) {
        this._contextManager = contextManager;
    }

    public get activeGeometryId(): number | null {
        return this._activeGeometryId;
    }

    public get geometryCount(): number {
        return this._records.size;
    }

    /**
     * Factory Request: Allocates a new managed VertexBuffer tracking VBO and VAO handles.
     */
    public createVertexBuffer(layout: VertexLayoutSpec): VertexBuffer {
        const buffer = new VertexBuffer(this._contextManager, layout);
        this._standaloneBuffers.add(buffer);
        return buffer;
    }

    /**
     * Release Pattern: Deletes GPU resources associated with a VertexBuffer.
     */
    public releaseVertexBuffer(buffer: VertexBuffer): void {
        if (this._standaloneBuffers.has(buffer)) {
            buffer.destroy();
            this._standaloneBuffers.delete(buffer);
        }
    }

    /**
     * Binds the VAO and buffer state for a mesh geometry, lazily allocating or updating
     * GPU buffers as necessary. Deduplicates redundant driver bind calls.
     */
    public bind(geometry: IMeshGeometry): GPUGeometryRecord {
        const gl = this._getGLContext();
        let record = this._records.get(geometry);

        if (!record || record.uploadedVersion === -1) {
            record = this._allocateRecord(gl, geometry, record);
        } else if (geometry.version > record.uploadedVersion) {
            this._syncBufferData(gl, geometry, record);
        } else {
            this._bindRecord(record);
        }

        return record;
    }

    /**
     * Unbinds the current VAO from the WebGL context.
     */
    public unbind(): void {
        if (this._activeGeometryId !== null) {
            const gl = this._gl ?? this._contextManager.getContext();
            if (gl) {
                gl.bindVertexArray(null);
            }
            this._activeGeometryId = null;
        }
    }

    /**
     * Deterministic Disposal: Immediately and synchronously frees GPU buffer handles for a geometry.
     */
    public dispose(geometry: IMeshGeometry): void {
        const record = this._records.get(geometry);
        if (!record) {
            return;
        }

        if (this._activeGeometryId === record.id) {
            this.unbind();
        }

        record.disposeListener();

        const gl = this._gl ?? this._contextManager.getContext();
        if (record.indexBuffer && gl && !gl.isContextLost()) {
            gl.deleteBuffer(record.indexBuffer);
            record.indexBuffer = null;
        }

        record.vertexBuffer.destroy();
        this._records.delete(geometry);
    }

    /**
     * Binds the geometry (allocating or updating GPU buffers if needed) and executes
     * the appropriate draw call (gl.drawElements or gl.drawArrays).
     */
    public draw(geometry: IMeshGeometry): void {
        const gl = this._getGLContext();
        const record = this.bind(geometry);

        if (record.indexCount !== null && record.indexCount > 0) {
            gl.drawElements(
                geometry.primitiveType,
                record.indexCount,
                record.indexType,
                DRAW_ELEMENTS_OFFSET
            );
        } else {
            gl.drawArrays(
                geometry.primitiveType,
                DRAW_ARRAYS_START_INDEX,
                geometry.vertexCount
            );
        }
    }

    /**
     * Retrieves the active GPU record for a geometry, or null if not allocated.
     */
    public getRecord(geometry: IMeshGeometry): GPUGeometryRecord | null {
        return this._records.get(geometry) ?? null;
    }

    /**
     * Checks if GPU resources are currently allocated for the given geometry.
     */
    public hasRecord(geometry: IMeshGeometry): boolean {
        return this._records.has(geometry);
    }

    /**
     * WebGL context lost lifecycle hook: invalidates all driver handles.
     */
    public onContextLost(): void {
        this._activeGeometryId = null;
        this._gl = null;

        for (const record of this._records.values()) {
            record.uploadedVersion = -1;
            record.indexBuffer = null;
        }
    }

    /**
     * WebGL context restored lifecycle hook: caches the new context reference and restores standalone buffers.
     */
    public onContextRestored(gl: WebGL2RenderingContext): void {
        this._gl = gl;
        this._activeGeometryId = null;

        for (const buffer of this._standaloneBuffers) {
            buffer.rebuild(gl);
        }
    }

    /**
     * Permanently destroys all managed geometry GPU records and detaches listeners.
     */
    public destroy(): void {
        this.unbind();

        const gl = this._gl ?? this._contextManager.getContext();

        for (const record of this._records.values()) {
            record.disposeListener();
            if (record.indexBuffer && gl && !gl.isContextLost()) {
                gl.deleteBuffer(record.indexBuffer);
            }
            record.vertexBuffer.destroy();
        }

        this._records.clear();

        for (const buffer of this._standaloneBuffers) {
            buffer.destroy();
        }
        this._standaloneBuffers.clear();

        this._gl = null;
        this._activeGeometryId = null;
    }

    /**
     * Telemetry query returning active geometry count and VAO binding state.
     */
    public getDiagnostics(): SubsystemDiagnostics {
        return {
            name: this.name,
            resourceCount: this._records.size + this._standaloneBuffers.size,
            activeBindings: this._activeGeometryId !== null ? 1 : 0,
        };
    }

    // --- Private Helpers ---

    private _getGLContext(): WebGL2RenderingContext {
        const gl = this._gl ?? this._contextManager.getContext();
        if (!gl) {
            throw new Error("[GeometryManager] Cannot bind geometry without an active WebGL2 context.");
        }
        return gl;
    }

    private _allocateRecord(
        gl: WebGL2RenderingContext,
        geometry: IMeshGeometry,
        existingRecord?: GPUGeometryRecord
    ): GPUGeometryRecord {
        const id = existingRecord?.id ?? ++this._nextId;
        if (existingRecord?.vertexBuffer) {
            existingRecord.vertexBuffer.destroy();
        }
        const vertexBuffer = new VertexBuffer(this._contextManager, geometry.bufferData.layout);
        vertexBuffer.setData(geometry.bufferData.attributes);
        vertexBuffer.bind();

        const indexInfo = this._uploadIndices(gl, geometry.bufferData.indices);

        const disposeListener =
            existingRecord?.disposeListener ??
            geometry.onDispose(() => {
                this.dispose(geometry);
            });

        const record: GPUGeometryRecord = {
            id,
            vertexBuffer,
            indexBuffer: indexInfo.buffer,
            indexCount: indexInfo.count,
            indexType: indexInfo.indexType,
            uploadedVersion: geometry.version,
            disposeListener,
        };

        this._records.set(geometry, record);
        this._activeGeometryId = id;
        return record;
    }

    private _syncBufferData(
        gl: WebGL2RenderingContext,
        geometry: IMeshGeometry,
        record: GPUGeometryRecord
    ): void {
        record.vertexBuffer.setData(geometry.bufferData.attributes);
        record.vertexBuffer.bind();

        if (geometry.bufferData.indices) {
            const indexInfo = this._uploadIndices(gl, geometry.bufferData.indices, record.indexBuffer);
            record.indexBuffer = indexInfo.buffer;
            record.indexCount = indexInfo.count;
            record.indexType = indexInfo.indexType;
        } else if (record.indexBuffer) {
            gl.deleteBuffer(record.indexBuffer);
            record.indexBuffer = null;
            record.indexCount = null;
        }

        record.uploadedVersion = geometry.version;
        this._activeGeometryId = record.id;
    }

    private _uploadIndices(
        gl: WebGL2RenderingContext,
        indices?: Uint16Array | Uint32Array,
        existingBuffer?: WebGLBuffer | null
    ): { buffer: WebGLBuffer | null; count: number | null; indexType: number } {
        if (!indices || indices.length === 0) {
            return { buffer: null, count: null, indexType: gl.UNSIGNED_SHORT };
        }

        const buffer = existingBuffer ?? gl.createBuffer();
        if (!buffer) {
            throw new Error("[GeometryManager] Failed to create WebGLBuffer for indices.");
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        return {
            buffer,
            count: indices.length,
            indexType: indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
        };
    }

    private _bindRecord(record: GPUGeometryRecord): void {
        if (this._activeGeometryId !== record.id) {
            record.vertexBuffer.bind();
            this._activeGeometryId = record.id;
        }
    }
}
