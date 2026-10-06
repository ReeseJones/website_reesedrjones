# Galaxy Renderer Refactoring Roadmap

## Goal
Refactor [`GalaxyRenderer`](galaxy_renderer.ts) out of its legacy imperative pass design and integrate it cleanly into the modern Scene Graph and rendering pipeline architecture (`src/scene/`).

---

## Planned Architecture

### 1. Galaxy Node (`GalaxyNode`)
* **Design:** Create a specialized `GalaxyNode` that either extends [`ModelInstance`](../scene/models/model_instance.ts) or serves as a sibling node in the scene graph hierarchy extending [`SceneNode`](../scene/core/scene_node.ts).
* **Responsibilities:**
  * Exposes the reactive parameter interface for configuring galaxy simulation parameters (`GalaxyParameters`, star counts, rotation velocities, colors, drift, and parallax).
  * Automatically generates or updates GPU geometry through the WebGL [`GeometryManager`](../webgl/geometry/geometry_manager.ts) whenever configuration parameters mutate.
  * Handles local transform matrix calculation, parallax orientation damping, and scene graph traversal.

### 2. Specialized Geometry (`GalaxyGeometry`)
* **Design:** Integrate procedural star vertex buffer generation with [`GalaxyGeometry`](../scene/models/galaxy_geometry.ts) (which implements [`IMeshGeometry`](../scene/models/mesh_geometry_types.ts)).
* **Responsibilities:**
  * Procedurally packs star particle coordinates, radial distances, velocities, and color variations into a standard interleaved `Float32Array`.
  * Manages monotonic `version` counter increments when parameters change, enabling [`GeometryManager`](../webgl/geometry/geometry_manager.ts) to lazily upload fresh buffer data (`_syncBufferData`).
  * Implements [`IDisposable`](../webgl/core/subsystem_types.ts) for deterministic GPU cleanup upon node disposal.

### 3. Material & Shaders (`GalaxyMaterial`)
* **Design:** Utilize [`GalaxyMaterial`](../scene/materials/galaxy_material.ts) instead of imperative shader switches.
* **Responsibilities:**
  * Binds pinprick and orb shaders via [`ShaderProgram`](../webgl/shaders/shader_program.ts).
  * Cooperatively manages pipeline state (additive blending, depth test disabled) through [`contextManager.applyPipelineState()`](../webgl/core/context_manager.ts).

### 4. Migration & Cleanup
* Deprecate and remove imperative `GalaxyRenderer` and `GalaxyPass` (Completed).
* Move backdrop rendering into the main scene render loop executed by [`SceneRenderer`](../scene/renderer/scene_renderer.ts) via [`ImperativeGalaxyScenePass`](../scene/test/imperative_galaxy_scene_pass.tsx) (Completed).
* Remove direct calls to `geometries.createVertexBuffer()` in favor of declarative `GeometryManager.bind()` / `GeometryManager.draw()` (Completed).
