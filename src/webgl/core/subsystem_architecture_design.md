# WebGL Subsystem Microkernel & Lifecycle Architecture Design

## 1. Overview & Architectural Goals

### Purpose
In a WebGL 2 rendering engine, GPU resources span multiple distinct hardware and driver domains:
- **Geometry & Buffers:** Vertex Array Objects (VAOs), Vertex Buffer Objects (VBOs), Index Buffer Objects (IBOs).
- **Texturing & Samplers:** 2D textures, cubemaps, mipmaps, and 16 hardware texture unit state registers.
- **Shaders & Programs:** GLSL compilation, program linking, uniform location caching, and execution pipelines.

Historically, resource managers were implemented with slightly different lifecycles, ad-hoc disposal semantics, and manual lifecycle chaining in [`WebGLContextManager`](context_manager.ts).

This document specifies the architectural foundation for unifying all WebGL resource managers under an **`IContextSubsystem`** microkernel architecture. Detailed specifications for individual resource lifecycles (`IWebGLResource`) are documented in [WebGL Resource Lifecycle Design](webgl_resource_lifecycle_design.md).

Under this model:
- [`WebGLContextManager`](context_manager.ts) acts as a lean **Microkernel Coordinator**.
- All GPU managers implement a standardized subsystem lifecycle (`IContextSubsystem`) and are registered with priority-based context recovery order.
- GPU resources follow a unified **`IWebGLResource`** interface with a single `dispose()` method.
- Materials are pure CPU configuration descriptors with zero GPU ownership, collected automatically by the JavaScript garbage collector.
- Ref-counting is completely eliminated in favor of deterministic disposal.

---

### Core Architectural Goals
- **Microkernel Coordinator:** The context manager no longer manually chains individual managers by name in context lost, restoration, or destruction events. Instead, it dispatches lifecycle events across an extensible registry of priority-sorted subsystems.
- **Priority-Based Context Restoration:** Subsystems execute recovery in strict dependency order during `webglcontextrestored`:
  - Priority 10 (Shaders): GLSL programs must compile and link first, restoring uniform locations before bindings or draw calls occur.
  - Priority 20 (Textures): Fallback singletons and active textures re-upload to ensure sampler validity.
  - Priority 30 (Geometries): VBOs and VAOs re-allocate and bind attribute layouts against restored shader programs.
- **Elimination of Ref-Counting:**
  - Shaders are context-scoped singletons cached permanently for the life of the context (eliminating expensive recompilations caused by transient zero-reference states).
  - Geometries and textures are content-scoped and use deterministic disposal.
- **The Inversion of Control Disposal Pattern:** GPU resources (`VertexBuffer`, `ShaderProgram`, `Texture`) own their GPU handles and expose `dispose()`. Subsystem managers listen to `resource.onDispose` notifications and automatically prune their caches. Materials do not own GPU handles and are garbage-collected.
- **Unified Verb Taxonomy:** Standardize naming across all managers:
  - Acquisition: `getOrCreate(...)`, `get(...)`, `has(...)`
  - Binding: `bind(...)`, `unbind(...)`
  - Lifecycle: `onContextLost()`, `onContextRestored(gl)`, `destroy()` (for tearing down the subsystem entirely)

---

## 2. Microkernel Architecture & Data Flow

```mermaid
flowchart TD
    subgraph CPULayer["1. Scene & Content Domain (CPU Layer)"]
        Scene["Scene"]
        Mesh["MeshGeometry (implements IMeshGeometry, IDisposable)"]
        Tex["Texture (implements IWebGLResource)"]
        Mat["Material (Pure CPU Descriptor)"]
        Scene --> Mesh
        Scene --> Mat
        Mat -.->"References"| Tex
    end

    subgraph Microkernel["2. WebGLContextManager (Microkernel Coordinator)"]
        ContextMgr["WebGLContextManager"]
        Registry["_subsystems: IContextSubsystem[]\n(Sorted by restorationPriority)"]
        ContextMgr --> Registry
    end

    subgraph Subsystems["3. GPU Subsystems (IContextSubsystem)"]
        ShaderSub["ShaderManager\n(Priority 10: Shaders & Programs)"]
        TexSub["TextureManager\n(Priority 20: Textures & Samplers)"]
        GeomSub["GeometryManager\n(Priority 30: Buffers & VAOs)"]

        Registry --> ShaderSub
        Registry --> TexSub
        Registry --> GeomSub
    end

    subgraph GPULayer["4. GPU Hardware Driver State"]
        DriverProgram["gl.useProgram()"]
        DriverTexture["gl.bindTexture()"]
        DriverVAO["gl.bindVertexArray()"]

        ShaderSub --> DriverProgram
        TexSub --> DriverTexture
        GeomSub --> DriverVAO
    end

    Mesh -.->"onDispose listener"| GeomSub
    Tex -.->"onDispose listener"| TexSub
```

---

## 3. Types & Interfaces Specification

All contracts reside in dedicated type definition files separate from concrete implementations.

### Subsystem Types (`src/webgl/subsystem_types.ts`)

```typescript
/**
 * Restoration priority constants for context restoration sequencing.
 * Lower numbers execute earlier.
 */
export const SubsystemRestorationPriority = {
    Shader: 10,
    Texture: 20,
    Geometry: 30,
} as const;

export type SubsystemRestorationPriority =
    (typeof SubsystemRestorationPriority)[keyof typeof SubsystemRestorationPriority];

/**
 * Diagnostic report emitted by a subsystem for engine telemetry and debugging.
 */
export interface SubsystemDiagnostics {
    readonly name: string;
    readonly resourceCount: number;
    readonly activeBindings: number;
    readonly details?: Record<string, unknown>;
}

/**
 * Contract implemented by all WebGL GPU resource manager subsystems.
 */
export interface IContextSubsystem {
    /** Unique human-readable subsystem identifier */
    readonly name: string;

    /**
     * Restoration execution priority during webglcontextrestored.
     * Lower numbers run earlier.
     */
    readonly restorationPriority: number;

    /** Hook invoked upon webglcontextlost */
    onContextLost(): void;

    /** Hook invoked upon webglcontextrestored with the fresh context */
    onContextRestored(gl: WebGL2RenderingContext): void;

    /** Permanent disposal of all GPU handles and caches managed by this subsystem */
    destroy(): void;

    /** Telemetry query returning active resource counts and binding states */
    getDiagnostics(): SubsystemDiagnostics;
}

/**
 * Universal contract for deterministically disposable CPU-side or GPU-side resources.
 */
export interface IDisposable {
    /** Triggers deterministic cleanup of underlying resources */
    dispose(): void;

    /** True if this resource has already been permanently disposed */
    readonly isDisposed: boolean;

    /** Registers a callback to be invoked exactly once when dispose() is called */
    onDispose(callback: () => void): void;
}
```

---

## 4. Key Subsystem Procedures

### 1. Subsystem Registration (`WebGLContextManager`)
- Subsystems are registered during `WebGLContextManager` construction:
  - `this.registerSubsystem(this.shaderManager);`
  - `this.registerSubsystem(this.textureManager);`
  - `this.registerSubsystem(this.geometryManager);`
- Subsystems are stored internally in `_subsystems: IContextSubsystem[]`.

### 2. Context Loss Dispatch
- When `webglcontextlost` fires, `WebGLContextManager.handleContextLost()` dispatches:
  - `for (const subsystem of this._subsystems) { subsystem.onContextLost(); }`
  - Nulls the active context reference and clears pipeline state caches.

### 3. Context Restoration Dispatch
- When `webglcontextrestored` fires, `WebGLContextManager.handleContextRestored(gl)`:
  - Updates the active `gl` reference.
  - Sorts registered subsystems by `restorationPriority` ascending.
  - Dispatches:
    - Phase 1 (Priority 10): `shaderManager.onContextRestored(gl)`
    - Phase 2 (Priority 20): `textureManager.onContextRestored(gl)`
    - Phase 3 (Priority 30): `geometryManager.onContextRestored(gl)`
  - Re-applies baseline pipeline state.

### 4. Destruction Dispatch
- On canvas teardown, `WebGLContextManager.destroy()`:
  - Dispatches: `for (const subsystem of this._subsystems) { subsystem.destroy(); }`
  - Clears `_subsystems` registry.
  - Releases context references.

---

## 5. Architectural Benefits

- **True Extensibility:** Adding a new subsystem (e.g. `FramebufferManager` or `UniformBufferManager`) requires zero modifications to context loss, restoration, or destruction code in `WebGLContextManager`.
- **Zero Ref-Count Leaks:** Replaces complex reference counting with clear ownership:
  - Shaders & fallbacks: Context-owned singletons.
  - Geometries & textures: Content-owned instances with automatic disposal listeners.
- **Engine-Wide Uniformity:** Every subsystem and disposable resource adheres to the exact same lifecycle interface and disposal semantics.
