# WebGL Resource Lifecycle & Ownership Architecture Design

## 1. Overview & Architectural Goals

### Purpose
In WebGL 2 rendering pipelines, managing GPU memory lifecycle, context recovery, and cache consistency is critical. Historically, resource wrappers (`VertexBuffer`, `ShaderProgram`, `BaseTexture`) exhibited diverging lifecycles:
- Some wrappers exposed dual `destroy()` and `dispose()` methods with ambiguous teardown responsibilities.
- Some classes required direct `IWebGLContextManager` dependencies, while others required explicit `WebGL2RenderingContext` injection.
- Materials owned and disposed textures during material teardown, causing catastrophic double-deletion bugs when materials were cloned or shared textures across meshes.

This document establishes the unified, engine-wide standard for all WebGL resources and their single-method deterministic lifecycle.

---

### Core Architectural Principles

- **Unified `IWebGLResource` Contract:** Every class wrapping a native WebGL handle (`WebGLBuffer`, `WebGLVertexArrayObject`, `WebGLProgram`, `WebGLTexture`) implements `IWebGLResource` (which extends `IDisposable`).
- **Single Public Teardown Method (`dispose()`):** Eliminates the dual `destroy()` / `dispose()` anti-pattern. There is only one public destruction method: `dispose()`. It immediately frees GPU handles (`gl.delete*`), unbinds from context slots if active, marks `isDisposed = true`, and notifies manager caches to auto-evict.
- **Dedicated Context Recovery Hooks:** Hardware handle loss and restoration are handled strictly via `onContextLost()` (nulling handle references without driver calls) and `onContextRestored(gl)` (reallocating handles and re-uploading data to the new context).
- **Inversion of Disposal Control:** Subsystem managers do not provide individual `dispose(resource)` methods. The resource itself is disposed via `resource.dispose()`. The owning manager registers an `onDispose` listener during registration/caching and automatically prunes its cache upon disposal.
- **Materials as Pure CPU Descriptors:** Materials do not wrap or own WebGL resources and do not implement `IDisposable`. They are pure configuration descriptors that are automatically collected by the JavaScript garbage collector. `Material.clone()` performs a deep copy of uniform values (cloning `Float32Array` buffers and nested objects) while copying non-owning references to shader keys and textures.

---

## 2. Resource Lifecycle & Ownership Architecture

```mermaid
flowchart TD
    subgraph ManagerLayer["1. Subsystem Manager Layer (Registry & Caches)"]
        Mgr["Subsystem Manager\n(GeometryManager / ShaderManager / TextureManager)"]
        Cache["Internal Registry & Lookup Cache\n(Map<Key, IWebGLResource>)"]
        Mgr --> Cache
    end

    subgraph ResourceLayer["2. WebGL Resource Wrapper (IWebGLResource)"]
        Resource["Resource Instance\n(VertexBuffer / ShaderProgram / BaseTexture)"]
        State["Resource State:\n- label: string\n- isValid: boolean\n- isDisposed: boolean"]
        Resource --> State
    end

    subgraph GPULayer["3. Native WebGL Driver Handles"]
        GLHandle["GPU Handle\n(WebGLBuffer / WebGLProgram / WebGLTexture)"]
        Resource --> GLHandle
    end

    subgraph MaterialLayer["4. Scene Layer (Pure CPU Descriptors)"]
        Material["Material (CPU Descriptor)\n- shaderKey: ShaderKey\n- uniforms: Deep-copied Map\n- textures: Non-owning references"]
        Material -.->"Non-owning reference"| Resource
    end

    Mgr -->|"1. Subscribes onDispose"| Resource
    Resource -->|"2. Allocates GPU Handle"| GLHandle
    Resource -->|"onDispose notification"| Cache
    Resource -->|"dispose() frees handle"| GLHandle
```

---

## 3. Types & Interfaces Specification

All core resource interfaces reside in `src/webgl/core/`:

### Resource Contract (`src/webgl/core/resource_types.ts`)

```typescript
import type { IDisposable } from "./subsystem_types";

/**
 * Universal contract for managed GPU hardware resource wrappers in WebGL2.
 */
export interface IWebGLResource extends IDisposable {
    /** Human-readable label for debugging and diagnostics */
    readonly label: string;

    /** Returns true if underlying GPU handles are allocated and valid */
    readonly isValid: boolean;

    /**
     * WebGL context lost lifecycle hook invoked by owning manager.
     * Clears internal GPU handle references without calling gl.delete*.
     */
    onContextLost(): void;

    /**
     * WebGL context restored lifecycle hook invoked by owning manager.
     * Recreates GPU handles and re-uploads data to the new WebGL context.
     */
    onContextRestored(gl: WebGL2RenderingContext): void;

    /**
     * Deterministic disposal:
     * Synchronously frees GPU handles from the driver, unbinds from context,
     * marks isDisposed = true, and fires onDispose subscribers.
     */
    dispose(): void;
}
```

---

## 4. Key Subsystem Lifecycles & Procedures

### 1. Creation & Registration Procedure
1. A caller requests a resource from the subsystem manager (e.g. `textureManager.getOrCreate(url)`, `shaderManager.getOrCreate(key, options)`, or `geometryManager.createVertexBuffer(layout)`), or creates an instance directly.
2. The manager checks its internal lookup map. If a cached instance exists, it is returned immediately.
3. If absent, the manager constructs the resource.
4. The manager attaches an `onDispose` listener:
   - `resource.onDispose(() => this._cache.delete(key));`
5. The resource is cached and returned to the caller.

### 2. Deterministic Resource Disposal Procedure
1. The user, scene, or pipeline calls `resource.dispose()`.
2. If `resource.isDisposed` is already true, the call returns immediately as a safe no-op.
3. The resource marks `_isDisposed = true`.
4. If the active WebGL context is alive:
   - The resource unbinds itself from the context if currently bound.
   - The resource deletes its native GPU handles (`gl.deleteBuffer`, `gl.deleteVertexArray`, `gl.deleteProgram`, `gl.deleteTexture`).
5. Internal handle references are set to `null`.
6. Registered `onDispose` callbacks execute, triggering the owning manager to prune the resource from its internal registry.
7. Callback arrays/sets are cleared.

### 3. Context Loss & Restoration Procedure
1. **Context Loss (`onContextLost`):**
   - The canvas emits `webglcontextlost`.
   - `WebGLContextManager` dispatches `onContextLost()` across registered subsystems in priority order.
   - Subsystems forward `onContextLost()` to all managed resources.
   - Resources set their native WebGL handles to `null` without calling `gl.delete*` (since the driver handles are already destroyed by the GPU process).
2. **Context Restoration (`onContextRestored(gl)`):**
   - The canvas emits `webglcontextrestored`.
   - `WebGLContextManager` dispatches `onContextRestored(gl)` across registered subsystems in strict priority order:
     - Priority 10 (`ShaderManager`): Recompiles GLSL programs, relinks `WebGLProgram` handles, and restores cached uniforms.
     - Priority 20 (`TextureManager`): Reallocates neutral fallback textures and active sampler handles.
     - Priority 30 (`GeometryManager`): Reallocates VBO and VAO handles, re-uploads cached CPU array data, and re-executes vertex attribute layout bindings.

### 4. Material Decoupling & Cloning Procedure
1. Materials do not implement `IDisposable`.
2. When a material is dereferenced by the scene graph or component, it is automatically reclaimed by the JavaScript garbage collector.
3. When `material.clone()` is called:
   - The shader key is copied by value.
   - The pipeline raster state object is cloned by value (`{ ...this._pipelineState }`).
   - The uniform map is deep-copied:
     - Primitive values (numbers, booleans, strings) are copied directly.
     - `Float32Array` buffers are duplicated via `new Float32Array(original)`.
     - Arrays are recursively mapped or sliced.
   - Texture references (`ITexture`, `ICubeTexture`) are copied as non-owning handle references.
4. Mutating uniforms on a cloned material has zero effect on the original material.
5. Disposing a texture asset via `texture.dispose()` frees the texture GPU handle and purges it from `TextureManager`, but materials referencing it retain only dead references without crashing.

---

## 5. Architectural Benefits

- **Zero Memory Leaks:** Deterministic, synchronous cleanup of GPU handles eliminates orphaned VRAM allocations.
- **Zero Ambiguity:** Eliminates the dual `destroy()` / `dispose()` confusion across all resources.
- **Safe Material Cloning:** Materials can be cloned, modified, and dereferenced without risking double-freeing or invalidating shared GPU textures.
- **Engine-Wide Uniformity:** Every GPU resource follows the exact same lifecycle interface, context recovery hooks, and event-driven cache invalidation.
