# WebGL Geometry Manager Subsystem Architecture Design

## 1. Overview & Architectural Goals

### Purpose
In WebGL 2 applications, geometries bridge two fundamentally different memory spaces:
- **CPU Space:** Application code, procedural generation algorithms, and scene graph hierarchies manipulating vertex attributes, normal vectors, UVs, and index arrays in system RAM.
- **GPU Space:** Graphic driver memory containing Vertex Buffer Objects (VBOs), Index Buffer Objects (IBOs), and Vertex Array Objects (VAOs) managed through the active WebGL rendering context.

Historically, naive WebGL engines couple these spaces by storing driver handles (`WebGLBuffer`, `WebGLVertexArrayObject`, `WebGL2RenderingContext`) directly inside mesh classes.

Together with [`ShaderManager`](shader_manager_design.md) (programs and uniforms) and [`TextureManager`](texture_manager_design.md) (textures and samplers), the `GeometryManager` forms the resource triad defined in the [`Subsystem Microkernel Architecture`](subsystem_architecture_design.md).

---

### Core Architectural Goals
- **Architectural Symmetry & Subsystem Integration:** Implements [`IContextSubsystem`](../core/subsystem_architecture_design.md) with `restorationPriority = 30` (Priority 3), restoring GPU buffers and VAOs after shaders (Priority 10) and textures (Priority 20) have completed context recovery.
- **Total CPU-GPU Decoupling:** `MeshGeometry` is a pure CPU data descriptor containing zero WebGL types, zero context references, and zero hardware buffer allocations. Geometries can be instantiated, transformed, or evaluated anywhere without requiring an active canvas or context.
- **Universal `IWebGLResource` for Buffers:** Standalone buffer wrappers (`VertexBuffer`) implement `IWebGLResource` ([`webgl_resource_lifecycle_design.md`](../core/webgl_resource_lifecycle_design.md)).
- **Single Teardown Method (`resource.dispose()`):** No manager-level release methods (`releaseVertexBuffer` is removed). When a caller invokes `buffer.dispose()`, it frees VBO and VAO handles, and its `onDispose` notification instructs `GeometryManager` to prune it from `_standaloneBuffers`.
- **Redundant State Deduplication:** Tracks active VAO bindings to ensure identical geometries rendered in sequence (e.g. multiple cubes or particle clusters) do not issue redundant `gl.bindVertexArray()` driver calls.
- **Monotonic Revision Synchronization:** Geometries expose a monotonic `version` counter. When CPU attributes or indices mutate, incrementing this version signals `GeometryManager` to lazily upload modified data to the GPU via `gl.bufferSubData()` or buffer re-allocation without user intervention.
- **Centralized Context Recovery (Phase 3):** When the WebGL context is lost and restored, `GeometryManager` invalidates stale driver handles and lazily re-allocates GPU buffers and VAOs upon the next render frame.

---

## 2. Subsystem Architecture & Data Flow

```mermaid
flowchart TD
    subgraph CPULayer["1. CPU Space (Scene Graph & Authoring / IDisposable)"]
        Mesh["MeshGeometry (implements IMeshGeometry, IDisposable)"]
        Data["GeometryBufferData\n- attributes: Float32Array\n- indices?: Uint16Array | Uint32Array\n- layout: VertexLayoutSpec\n- version: number"]
        Mesh --> Data
    end

    subgraph ManagerLayer["2. WebGL Resource Layer (WebGLContextManager)"]
        ContextMgr["WebGLContextManager (Microkernel Coordinator)"]
        GeomMgr["GeometryManager (implements IContextSubsystem)"]
        Records["_records: Map<number, GPUGeometryRecord>"]
        ActiveBinding["_activeGeometryId: number | null"]

        ContextMgr -->|"Restoration Priority 30"| GeomMgr
        GeomMgr --> Records
        GeomMgr --> ActiveBinding
    end

    subgraph GPULayer["3. GPU Hardware Handles"]
        RecordItem["GPUGeometryRecord\n- id: number\n- vertexBuffer: VertexBuffer (VBO + VAO)\n- indexBuffer: WebGLBuffer | null\n- indexType: number\n- uploadedVersion: number\n- isIndexUint32: boolean"]
        Records --> RecordItem
    end

    subgraph RenderLoop["4. SceneRenderer Render Loop"]
        Renderer["SceneRenderer.renderFrame()"]
        Renderer -->|"1. geomManager.bind(mesh)"| GeomMgr
        GeomMgr -->|"2. Check record exists?"| Records
        GeomMgr -->|"3. Sync data if version > uploadedVersion"| RecordItem
        GeomMgr -->|"4. Deduplicate bindVertexArray"| ActiveBinding
        Renderer -->|"5. gl.drawElements / gl.drawArrays"| GPULayer
    end

    Mesh -.->"onDispose listener"| GeomMgr
```

---

## 3. Types & Interfaces Specification

All contracts reside in dedicated type definition files separate from concrete implementations.

### Geometry Manager Types (`src/webgl/geometry_manager_types.ts`)

```typescript
import type { VertexBuffer } from "./vertex_buffer";
import type { IMeshGeometry } from "../scene/models/mesh_geometry_types";
import type { IContextSubsystem, SubsystemDiagnostics } from "./subsystem_types";

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
    /** gl.UNSIGNED_SHORT or gl.UNSIGNED_INT */
    indexType: number;
    /** Number of elements to draw via gl.drawElements, or null if non-indexed */
    indexCount: number | null;
    /** True if indices require 32-bit integer addressing */
    isIndexUint32: boolean;
    /** Monotonic version of CPU data currently uploaded to the GPU */
    uploadedVersion: number;
}

/**
 * Public interface for the WebGL Geometry Manager subsystem.
 */
export interface IGeometryManager extends IContextSubsystem {
    /** Total number of unique geometries currently tracked with allocated GPU resources */
    readonly geometryCount: number;

    /** Currently active bound geometry identifier, or null if none bound */
    readonly activeGeometryId: number | null;

    /**
     * Binds the specified CPU geometry to the WebGL context with redundant-call skipping.
     * Lazily allocates GPU buffers on first bind and synchronizes modified CPU data.
     */
    bind(geometry: IMeshGeometry): GPUGeometryRecord;

    /**
     * Unbinds the currently active Vertex Array Object (VAO).
     */
    unbind(): void;

    /**
     * Deterministic Disposal: Frees VBO, IBO, and VAO hardware handles for the given geometry.
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
     * Disposes all geometry records and frees all allocated GPU buffers.
     */
    destroy(): void;

    /**
     * Telemetry query returning active geometry count and VAO binding state.
     */
    getDiagnostics(): SubsystemDiagnostics;
}
```

---

## 4. Key Procedures & Algorithms

### 1. Inversion of Control Disposal Pattern
1. When `GeometryManager.bind()` first encounters an unallocated geometry, it calls `_allocateRecord(geometry)`.
2. As part of allocation, `GeometryManager` registers an internal disposal listener:
   - `geometry.onDispose(() => this.dispose(geometry));`
3. When user code or `scene.dispose()` calls `geometry.dispose()`:
   - The CPU geometry marks itself disposed (`isDisposed = true`).
   - The callback fires into `GeometryManager.dispose(geometry)`.
   - `GeometryManager` frees the `VertexBuffer` (VBO and VAO), deletes the `indexBuffer`, and evicts the record from `_records`.
   - Zero VRAM leakage occurs.

### 2. Decomposed Binding Pipeline (`bind`)
The `bind()` method executes five private helper methods:
1. `_getGLContext()`: Ensures an active WebGL2 context is present.
2. `_allocateRecord(geometry, gl)`: Lazily creates `VertexBuffer` and `indexBuffer` if absent, hooking `onDispose`.
3. `_syncBufferData(geometry, record, gl)`: If `geometry.version > record.uploadedVersion`, uploads modified vertex data via `record.vertexBuffer.updateData()` and sets `record.uploadedVersion = geometry.version`.
4. `_uploadIndices(geometry, record, gl)`: Synchronizes element array buffers and index types.
5. `_bindRecord(record, gl)`: Skips redundant `gl.bindVertexArray()` if `_activeGeometryId === record.id`.

### 3. Phase 3 Context Loss & Restoration
1. **`onContextLost()`:**
   - Clears `_activeGeometryId = null`.
   - For all records, marks hardware handles invalidated while preserving layout definitions.
2. **`onContextRestored(gl)`:**
   - Priority 30 execution:
   - Resets active bindings.
   - Clears stale GPU records; buffers and VAOs will be lazily re-allocated on the next frame's `bind()` call against the fresh WebGL2 context.

---

## 5. Architectural Benefits

- **Deterministic Cleanup:** Synchronous GPU deletion via `IDisposable` eliminates VRAM leaks without ref-counting.
- **Lazy GPU Allocation:** Geometries can be defined on the CPU without allocating VRAM until actually drawn.
- **Subsystem Parity:** Implements [`IContextSubsystem`](subsystem_architecture_design.md) alongside `ShaderManager` and `TextureManager`.
