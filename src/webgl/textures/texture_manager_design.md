# WebGL Texture Manager Subsystem Architecture Design

## 1. Overview & Architectural Goals

### Purpose
In real-time 3D graphics, texture resources bridge image assets (PNG, JPEG, WebP, AVIF) with the GPU's fixed hardware texture samplers:
- **2D Textures:** Base color, normal maps, roughness/metallic channels, occlusion, and alpha masks mapped via UV coordinates.
- **Cubemap Textures:** Omnidirectional 6-face cubic environments for skyboxes and Image-Based Lighting (IBL) sampled via 3D direction vectors.
- **Hardware Texture Units:** A fixed pool of hardware sampler registers (`gl.TEXTURE0` through `gl.TEXTURE15`) across which shaders bind textures.

Together with [`GeometryManager`](geometry_manager_design.md) (geometries and VAOs/VBOs) and [`ShaderManager`](shader_manager_design.md) (programs and uniforms), the `TextureManager` forms the resource triad defined in the [`Subsystem Microkernel Architecture`](subsystem_architecture_design.md).

---

### Core Architectural Goals
- **Architectural Symmetry & Subsystem Integration:** Implements [`IContextSubsystem`](subsystem_architecture_design.md) with `restorationPriority = 20` (Priority 2), restoring fallback singletons and decoded image textures immediately after shaders compile (Priority 10) and before geometries bind (Priority 30).
- **Pure CPU-Side Decoupling:** `Texture` and `CubeTexture` are pure CPU asset descriptors without WebGL context dependencies. They can be created, evaluated, and assigned to materials anywhere.
- **Asset URL Caching & Deduplication:** When multiple materials request the same texture URL (e.g. a shared normal map or galaxy skybox), `TextureManager` returns the cached instance, eliminating duplicate network fetches and duplicate VRAM usage.
- **Inversion of Control Disposal Pattern:** `Texture` and `CubeTexture` implement [`IDisposable`](subsystem_architecture_design.md). When a user or scene calls `texture.dispose()`, an `onDispose` event triggers `TextureManager` to immediately delete the GPU texture handle (`gl.deleteTexture`) and evict the URL from the cache without requiring manual manager coordination.
- **Unified 16-Slot Binding & State Deduplication:** Coordinates all 16 hardware texture units (`TextureUnit` 0 to 15), tracking active bindings for both `gl.TEXTURE_2D` and `gl.TEXTURE_CUBE_MAP` to skip redundant driver calls.
- **Standardized Neutral Fallback Singletons:** Provides immediate 1x1 neutral fallback textures so shaders never sample incomplete or unassigned texture units:
  - 1x1 Solid White (`rgb(255, 255, 255)`) — Neutral multiplicative color/diffuse.
  - 1x1 Solid Black (`rgb(0, 0, 0)`) — Neutral additive emissive, zero roughness, or zero metalness.
  - 1x1 Flat Normal (`rgb(128, 128, 255)`) — Neutral tangent-space normal pointing directly along $+Z$ (`vec3(0, 0, 1)`).
  - 1x1 Solid Black Cubemap — Neutral omnidirectional environment.
- **Centralized Context Recovery (Phase 2):** When a WebGL context is lost and restored, `TextureManager` re-creates fallback singletons and re-uploads active textures from cached decoded images.

---

## 2. Subsystem Architecture & Data Flow

```mermaid
flowchart TD
    subgraph CPULayer["1. CPU Space (Pure Asset Descriptors / IDisposable)"]
        Tex2D["Texture (implements ITexture, IDisposable)"]
        TexCube["CubeTexture (implements ICubeTexture, IDisposable)"]
        Mat["Material (textures: Record<TextureUnit, ITexture>)"]
        Mat --> Tex2D
        Mat --> TexCube
    end

    subgraph ManagerLayer["2. WebGL Resource Layer (WebGLContextManager)"]
        ContextMgr["WebGLContextManager (Microkernel Coordinator)"]
        TexMgr["TextureManager (implements IContextSubsystem)"]
        URLCache["_urlCache: Map<string, ITexture>"]
        Bound2D["_boundTextures: Map<number, WebGLTexture | null>"]
        BoundCube["_boundCubeTextures: Map<number, WebGLTexture | null>"]
        Fallbacks["_fallbacks: FallbackTextureRegistry"]

        ContextMgr -->|"Restoration Priority 20"| TexMgr
        TexMgr --> URLCache
        TexMgr --> Bound2D
        TexMgr --> BoundCube
        TexMgr --> Fallbacks
    end

    subgraph GPULayer["3. GPU Hardware Texture Units"]
        Units["16 Hardware Texture Units\n(TextureUnit.Color0 .. TextureUnit.Noise)"]
        GPU2D["gl.TEXTURE_2D Samplers"]
        GPUCube["gl.TEXTURE_CUBE_MAP Samplers"]
        Units --> GPU2D
        Units --> GPUCube
    end

    subgraph RenderLoop["4. SceneRenderer Render Loop"]
        Renderer["SceneRenderer.renderFrame()"]
        Renderer -->|"texManager.bind(unit, tex, fallback)"| TexMgr
        TexMgr -->|"Deduplicate & Bind"| Units
    end

    Tex2D -.->"onDispose listener"| TexMgr
    TexCube -.->"onDispose listener"| TexMgr
```

---

## 3. Types & Interfaces Specification

All contracts reside in dedicated type definition files separate from concrete implementations.

### Texture Manager Types (`src/webgl/texture_manager_types.ts`)

```typescript
import type { ITexture, TextureOptions, TextureUnit } from "./texture_types";
import type { ICubeTexture } from "./cube_texture_types";
import type { IContextSubsystem, SubsystemDiagnostics } from "./subsystem_types";

/**
 * Standard neutral fallback texture archetypes.
 */
export type TextureFallbackType = "white" | "black" | "flat_normal" | "black_cube";

/**
 * Public interface for the WebGL Texture Fallback Registry.
 * Coordinates neutral 1x1 fallback singletons, context loss/restoration, and GPU memory cleanup.
 */
export interface IFallbackTextureRegistry {
    get(type: TextureFallbackType): WebGLTexture | null;
    init(gl: WebGL2RenderingContext): void;
    onContextLost(): void;
    destroy(gl?: WebGL2RenderingContext | null): void;
}


/**
 * Public interface for the WebGL Texture Manager subsystem.
 * Coordinates 2D textures, cubemaps, 16-slot unit bindings, asset caching, and fallback singletons.
 */
export interface ITextureManager extends IContextSubsystem {
    /** Total number of unique 2D textures currently managed in memory */
    readonly textureCount: number;

    /** Total number of unique cubemaps currently managed in memory */
    readonly cubeTextureCount: number;

    /**
     * Retrieves an existing cached 2D texture by URL or creates, loads, and caches a new one.
     */
    getOrCreate(url: string, options?: Omit<TextureOptions, "label">): ITexture;

    /**
     * Retrieves a cached 2D texture by URL without creating a new one.
     */
    get(url: string): ITexture | null;

    /**
     * Checks if a texture for the given URL is currently cached.
     */
    has(url: string): boolean;

    /**
     * Binds a 2D texture or appropriate neutral fallback to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    bind(unit: TextureUnit | number, texture: ITexture | null | undefined, fallback?: TextureFallbackType): void;

    /**
     * Low-level bind of a raw WebGLTexture 2D handle to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    bindHandle(unit: TextureUnit | number, handle: WebGLTexture | null): void;

    /**
     * Binds a cubemap texture or neutral black cubemap fallback to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    bindCube(unit: TextureUnit | number, texture: ICubeTexture | null | undefined): void;

    /**
     * Low-level bind of a raw WebGLTexture cubemap handle to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    bindCubeHandle(unit: TextureUnit | number, handle: WebGLTexture | null): void;

    /**
     * Unbinds any texture currently active on the specified hardware unit.
     */
    unbind(unit: TextureUnit | number): void;

    /**
     * Unbinds all 16 hardware texture units.
     */
    unbindAll(): void;

    /**
     * Retrieves the GPU handle for a standard neutral fallback texture.
     */
    getFallbackHandle(type: TextureFallbackType): WebGLTexture | null;

    /**
     * Permanently destroys all managed textures, fallbacks, and caches.
     */
    destroy(): void;

    /**
     * Telemetry query returning active texture count and unit bindings.
     */
    getDiagnostics(): SubsystemDiagnostics;
}
```

---

## 4. Key Procedures & Algorithms

### 1. Inversion of Control Single-Disposal Pattern
1. When `TextureManager.getOrCreate()` creates a `Texture`, or when a texture is first bound, `TextureManager` attaches an internal disposal listener:
   - `texture.onDispose(() => { this._urlCache.delete(url); this._unbindHandle(texture.handle); });`
2. When the user or scene calls `texture.dispose()`:
   - The texture marks itself disposed (`isDisposed = true`).
   - The texture deletes its own `WebGLTexture` GPU handle via `gl.deleteTexture(this._handle)`.
   - The `onDispose` callback fires into `TextureManager`.
   - `TextureManager` evicts the entry from `_urlCache` and unbinds any hardware unit bindings pointing to that handle.
   - `TextureManager` does not provide an independent `dispose(texture)` method.

### 2. Redundant Unit Binding Deduplication
1. For any given hardware unit $i \in [0, 15]$, compare candidate handle with `_boundTextures.get(i)` or `_boundCubeTextures.get(i)`.
2. If already bound to that unit, exit immediately (0 driver calls).
3. If different:
   - If `_activeUnit !== i`, call `gl.activeTexture(gl.TEXTURE0 + i)` and record `_activeUnit = i`.
   - Call `gl.bindTexture(target, handle)`.
   - Update `_boundTextures.set(i, handle)`.

### 3. Phase 2 Context Loss & Restoration
1. **`onContextLost()`:**
   - Invalidate fallback handles (`_fallbackWhite = null`, etc.).
   - Clear unit binding maps `_boundTextures.clear()`, `_boundCubeTextures.clear()`.
   - Call `tex.onContextLost()` across all cached textures.
2. **`onContextRestored(gl)`:**
   - Priority 20 execution:
   - Recreate 1x1 solid fallback textures on GPU.
   - For all cached textures with decoded image data in memory, invoke `tex.onContextRestored(gl)` to allocate new GPU handles and re-upload pixels.

---

## 5. Architectural Benefits

- **Unified Disposal:** One single method `dispose()`, triggered either manually or automatically via the `IDisposable` event pattern.
- **Zero Ref-Counting Complexity:** Eliminates manual reference tracking across materials.
- **Subsystem Parity:** Implements [`IContextSubsystem`](subsystem_architecture_design.md) alongside `GeometryManager` and `ShaderManager`.
