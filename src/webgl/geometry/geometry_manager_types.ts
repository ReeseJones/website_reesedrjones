import type { VertexBuffer } from "./vertex_buffer";
import type { IMeshGeometry } from "../../scene/models/mesh_geometry_types";
import type { IContextSubsystem, SubsystemDiagnostics } from "../core/subsystem_types";

/**
 * Internal hardware record tracking GPU buffer allocations for an active geometry.
 */
export interface GPUGeometryRecord {
    /** Unique numeric engine identifier assigned to this geometry */
    readonly id: number;
    /** Managed VertexBuffer wrapping the primary VBO and VAO handles */
    vertexBuffer: VertexBuffer;
    /** Native WebGLBuffer handle for the element array (IBO), or null if non-indexed */
    indexBuffer: WebGLBuffer | null;
    /** Element count for indexed draw calls (gl.drawElements) */
    indexCount: number | null;
    /** WebGL index data type (gl.UNSIGNED_SHORT or gl.UNSIGNED_INT) */
    indexType: number;
    /** Last CPU geometry revision version successfully synchronized to the GPU */
    uploadedVersion: number;
    /** Cleanup unbind listener attached to the CPU geometry dispose signal */
    disposeListener: () => void;
}

/**
 * Public contract for the WebGL Geometry Manager subsystem.
 */
export interface IGeometryManager extends IContextSubsystem {
    /** Active numeric identifier of the currently bound geometry VAO (or null if unbound) */
    readonly activeGeometryId: number | null;

    /** Total count of active GPU geometry records currently managed in VRAM */
    readonly geometryCount: number;

    /**
     * Binds the VAO and buffer state for a mesh geometry, lazily allocating or updating
     * GPU buffers as necessary. Deduplicates redundant driver bind calls.
     */
    bind(geometry: IMeshGeometry): GPUGeometryRecord;

    /**
     * Unbinds the current VAO from the WebGL context.
     */
    unbind(): void;

    /**
     * Deterministic Disposal: Immediately and synchronously frees GPU buffer handles for a geometry.
     */
    dispose(geometry: IMeshGeometry): void;

    /**
     * Retrieves the active GPU record for a geometry, or null if not allocated.
     */
    getRecord(geometry: IMeshGeometry): GPUGeometryRecord | null;

    /**
     * Checks if GPU resources are currently allocated for the given geometry.
     */
    hasRecord(geometry: IMeshGeometry): boolean;

    /**
     * Permanently destroys all managed geometry GPU records and detaches listeners.
     */
    destroy(): void;

    /**
     * Telemetry query returning active geometry count and VAO binding state.
     */
    getDiagnostics(): SubsystemDiagnostics;

    // --- Backwards-Compatible Aliases ---
    readonly allocatedCount?: number;
    release?(geometry: IMeshGeometry): void;
}
