# Unit Test Coverage — Master Implementation Plan

Tracks unit test coverage for every testable **class and function** in `src/scene/` and `src/webgl/`. Plain constants and data structures (such as `STANDARD_VERTEX_LAYOUT`) are excluded from separate test suites and tested implicitly through the classes and functions that consume them. Order is **foundation → leaf** (modules with the most dependents first), **scene first, then webgl**.

## Status Legend

- ✅ **Complete** — tests written, reviewed by the user, passing
- 🟡 **In Progress** — currently being worked
- 🔍 **Awaiting Review** — tests written and passing, waiting for the user to validate
- ⬜ **Not Started**
- 📝 **TODO** — postponed; revisit later
- 🚫 **Excluded** — intentionally not unit tested (reason given)

## Per-Item Workflow (see [AGENTS.md](../../AGENTS.md))

- **One file at a time.** A single test subagent works one item, then stops. No item starts until the user has validated the previous one.
1. **Test subagent** reads [unit_testing_guidelines.md](../project_guidelines/unit_testing_guidelines.md) and the file's design doc, writes `<file>.test.ts` beside the source, and runs `npx vitest run <path>`.
2. **Main agent review**: one `describe` per public export / member, return values and chaining asserted, edge cases covered, mocks used (no real WebGL).
3. **Quality gate**: `npm test` + `npm run build` both clean → mark 🔍 Awaiting Review.
4. **User validation** → stage, commit to `staging`, push to `origin staging`, mark ✅ Complete, then advance to next item.

> [!NOTE]
> Tests only during subagent authoring — no production code changes. If a test turns up a real bug or architectural question, it is reported and work pauses for the user's decision. Once validated by the user, changes are committed and pushed to `staging`.

---

## Phase 0 — Mock Fixture Readiness

Done as needed by each item, not up front.

- **0.1 Audit [mock_gl_context.ts](mocks/mock_gl_context.ts)** — ✅ Complete
  - Added WebGL2 constants, instanced divisors, active uniforms, detachShader, uniform2f/4f.
- **0.2 Audit [mock_context_manager.ts](mocks/mock_context_manager.ts)** — ✅ Complete
  - Aligned with `IWebGLContextManager`, `bindKey`, and `draw(geometry)`.
- **0.3 Shared scene test helpers** (minimal concrete `Camera` subclass, stub `IMeshGeometry` / `IMaterial`, mock textures) — ✅ Complete
  - Live in `src/testing/` and `src/testing/mocks/`.

---

## Part A — Scene Directory (`src/scene/`)

### A1. Core Graph (most depended-upon)

- **A1.1 [transform.ts](../scene/core/transform.ts)** — `Transform` — ✅ Complete (validated earlier)
  - Test: `transform.test.ts` (60 specs)
- **A1.2 [scene_node.ts](../scene/core/scene_node.ts)** — `SceneNode` — ✅ Complete (validated earlier)
  - Test: `scene_node.test.ts` (85 specs, includes `onDestroy`)
- **A1.3 [scene.ts](../scene/core/scene.ts)** — `Scene` — ✅ Complete
  - Test: `scene.test.ts` (45 specs, includes `.destroy()`)
  - Depends on: `SceneNode`
  - Mocks: none (pure logic)
  - Focus: root node ownership, add / remove, traversal, world-matrix update, teardown lifecycle

### A2. Geometry Foundation

- **A2.1 [mesh_geometry.ts](../scene/models/mesh_geometry.ts)** — `MeshGeometry` — ✅ Complete
  - Test: `mesh_geometry.test.ts` (46 specs)
  - Depended on by: every primitive, `GalaxyGeometry`, `GeometryManager`
  - Focus: id uniqueness, buffer / layout getters, version or dirty flag on data updates, `onDispose` listeners, idempotent dispose
- **A2.2 [quad_geometry.ts](../scene/models/primitives/quad_geometry.ts)** — `buildQuadBufferData`, `QuadGeometry` — ✅ Complete
  - Test: `quad_geometry.test.ts` (18 specs)
  - Focus: vertex / index counts, positions within the given size, normals, UV range [0,1], options and defaults
- **A2.3 [cube_geometry.ts](../scene/models/primitives/cube_geometry.ts)** — `buildCubeBufferData`, `CubeGeometry` — ✅ Complete
  - Test: `cube_geometry.test.ts` (22 specs)
  - Focus: vertex / index counts, outward unit normals per face, winding order, indices in bounds
- **A2.4 [sphere_geometry.ts](../scene/models/primitives/sphere_geometry.ts)** — `buildSphereBufferData`, `SphereGeometry` — ✅ Complete
  - Test: `sphere_geometry.test.ts` (32 specs)
  - Focus: count formula from segments / rings, every vertex at the radius (`toBeCloseTo`), unit normals, min-segment edge cases
- **A2.5 [galaxy_geometry.ts](../scene/models/specialized/galaxy_geometry.ts)** — `GalaxyGeometry` — ✅ Complete
  - Test: `galaxy_geometry.test.ts` (20 specs)
  - Depends on: `galaxy_backdrop/galaxy_math`, pinprick preset
  - Focus: particle count matches the parameters, layout stride vs. buffer length, deterministic output for fixed inputs

### A3. Camera

- **A3.1 [camera.ts](../scene/camera/camera.ts)** — `Camera` (abstract) — ✅ Complete
  - Test: `camera.test.ts` (28 specs)
  - Depends on: `SceneNode`
  - Focus: view matrix = inverse of the world matrix, `lookAt`, view-projection caching and dirty invalidation
- **A3.2 [perspective_camera.ts](../scene/camera/perspective_camera.ts)** — `PerspectiveCamera` — ✅ Complete
  - Test: `perspective_camera.test.ts` (24 specs)
  - Focus: fov / aspect / near / far setters dirty the projection, matrix matches `gl-matrix` `perspective`, aspect edge cases
- **A3.3 [orthographic_camera.ts](../scene/camera/orthographic_camera.ts)** — `OrthographicCamera` — ✅ Complete
  - Test: `orthographic_camera.test.ts` (38 specs)
  - Focus: bounds / zoom setters, matrix matches `ortho`, resize behaviour

### A4. Materials

- **A4.1 [material.ts](../scene/materials/material.ts)** — `Material` — ✅ Complete
  - Test: `material.test.ts` (37 specs)
  - Depended on by: `UnlitMaterial`, `GalaxyMaterial`, `SkyboxMaterial`, `SceneRenderer`
  - Mocks: stub `ITexture` / `ICubeTexture`
  - Focus: shaderKey, pipeline-state defaults, uniform / texture get-set, `clone()` deep vs. shared references, dispose
- **A4.2 [unlit_material.ts](../scene/materials/unlit_material.ts)** — `UnlitMaterial` — ✅ Complete
  - Test: `unlit_material.test.ts` (32 specs)
  - Mocks: `createMockTexture()`
  - Focus: color tint → uniforms, texture assignment, polymorphic `clone()`
- **A4.3 [galaxy_material.ts](../scene/materials/specialized/galaxy_material.ts)** — `GalaxyMaterial` — ✅ Complete
  - Test: `galaxy_material.test.ts` (31 specs)
  - Focus: deferral to `GalaxyShaderKey` (`galaxy_orb` / `galaxy_pinprick`), simulation parameter → uniform mapping, additive point-cloud pipeline state
- **A4.4 [skybox_material.ts](../scene/environment/skybox_material.ts)** — `SkyboxMaterial` — ✅ Complete
  - Test: `skybox_material.test.ts` (29 specs)
  - Focus: cube-texture binding, depth / cull state for a skybox, missing-texture fallback
- **A4.5 [material_binder.ts](../scene/materials/material_binder.ts)** — `applyMaterial` — ✅ Complete
  - Test: `material_binder.test.ts` (4 specs)
  - Focus: pipeline state assertion, direct key-based shader binding, 2D and cubemap texture slot assignments, uniform uploads

### A5. Model Instances

- **A5.1 [model_instance.ts](../scene/models/model_instance.ts)** — `ModelInstance` & `isModelInstance` — ✅ Complete
  - Test: `model_instance.test.ts` (20 specs)
  - Mocks: stub geometry / material
  - Focus: `IRenderable` conformance, `render` pass integration with `applyMaterial` and `geometries.draw`, matrix caching, transform-hierarchy inheritance
- **A5.2 [skybox.ts](../scene/environment/skybox.ts)** — `Skybox` — ✅ Complete
  - Test: `skybox.test.ts` (25 specs)
  - Depends on: `ModelInstance`, `CubeGeometry`, `SkyboxMaterial`
  - Focus: builds a cube geometry + skybox material, cube-texture setter passes through

### A6. Renderer (leaf / top consumer)

- **A6.1 [scene_renderer.ts](../scene/renderer/scene_renderer.ts)** — `SceneRenderer` — ✅ Complete
  - Test: `scene_renderer.test.ts` (27 specs)
  - Mocks: `createMockContextManager()` + `createMockWebGL2Context()`
  - Focus: `IRenderable` traversal and collection, ascending `renderOrder` sorting, frame context passing to `renderable.render(context)`, aspect ratio / matrix updates, context lost/restored
- **A6.2 [scene_pass.tsx](../scene/renderer/scene_pass.tsx)** — `ScenePass` (React) — 📝 TODO
  - Open question: how to test React components. No `@testing-library/react` is installed. Options: `react-dom/client` + `act` under happy-dom, add `@testing-library/react`, or rely on the build.
- **A6.3 [imperative_galaxy_scene_pass.tsx](../scene/test/imperative_galaxy_scene_pass.tsx)** — `ImperativeGalaxyScenePass` — 📝 TODO
  - Dev / test harness component; revisit together with A6.2.

### A-Excluded

- Interface-only `*_types.ts` files, GLSL shaders and `.d.ts` stubs under `src/scene/shaders/` — 🚫 Excluded (no runtime logic)
- Plain constant variables and data structures (such as [standard_layout.ts](../scene/models/primitives/standard_layout.ts) `STANDARD_VERTEX_LAYOUT`) — 🚫 Excluded (tested through the primitive geometry classes that consume them)

---

## Part B — WebGL Directory (`src/webgl/`)

### B1. Shader Foundation

- **B1.1 [shader_compiler.ts](../webgl/shaders/shader_compiler.ts)** — `compileShader` — ✅ Complete
  - Test: `shader_compiler.test.ts` (8 specs)
  - Focus: success returns the shader; compile failure reads the info log, deletes the shader and errors out; `createShader` returning null
- **B1.2 [shader_program.ts](../webgl/shaders/shader_program.ts)** — `ShaderProgram` — ✅ Complete
  - Test: `shader_program.test.ts` (40 specs)
  - Depended on by: `VertexBuffer`, `ShaderManager`, `WebGLContextManager`, `SceneRenderer`
  - Focus: link success / failure, uniform location caching, typed uniform setters calling the right `uniform*`, sampler → texture unit mapping, `use()` idempotency, recompile after context loss, `destroy()` idempotency

### B2. Geometry Foundation

- **B2.1 [vertex_layout.ts](../webgl/geometry/vertex_layout.ts)** — `computeLayoutStride`, `configureVAO` (3 overloads), `configureMultiBufferVAO`, `parseVertexLayoutFromGLSL` — ✅ Complete
  - Test: `vertex_layout.test.ts` (20 specs)
  - Focus: stride / offset math, int vs. float attribute pointers, instanced step-rate divisor, GLSL parsing (layout qualifiers, comments, unknown types)
- **B2.2 [vertex_buffer.ts](../webgl/geometry/vertex_buffer.ts)** — `VertexBuffer` — ✅ Complete
  - Test: `vertex_buffer.test.ts` (31 specs)
  - Focus: buffer + VAO creation, `setData` / `setSubData` usage hints, bind / unbind, indexed vs. non-indexed draw, destroy idempotency

### B3. Texture Foundation

- **B3.1 [texture_factory.ts](../webgl/textures/texture_factory.ts)** — `createSolid2DTexture`, `createSolidCubeTexture` — ⬜ Not Started
  - Focus: 1×1 RGBA upload bytes, all 6 cube faces uploaded, parameter setup, null `createTexture` handling
- **B3.2 [texture_fallback.ts](../webgl/textures/texture_fallback.ts)** — `FallbackTextureRegistry` — ⬜ Not Started
  - Focus: lazy creation and caching of the fallback textures, reset on context loss, destroy
- **B3.3 [texture.ts](../webgl/textures/texture.ts)** — `Texture` — ⬜ Not Started
  - Mocks: GL context + stubbed image decode
  - Focus: 1×1 fallback before load, async load → upload + mipmap, load error path, context recovery, dispose
- **B3.4 [cube_texture.ts](../webgl/textures/cube_texture.ts)** — `CubeTexture` — ⬜ Not Started
  - Focus: 6-face load ordering, partial failure, fallback, context recovery, dispose

### B4. Subsystem Managers

- **B4.1 [texture_manager.ts](../webgl/textures/texture_manager.ts)** — `TextureManager` — ⬜ Not Started
  - Focus: unit binding cache (redundant binds skipped), cube binding, `resetBindings`, register / unregister, max-unit bounds, context lifecycle, diagnostics
- **B4.2 [shader_manager.ts](../webgl/shaders/shader_manager.ts)** — `ShaderManager` — ⬜ Not Started
  - Focus: `getOrCreateShader` caching / ref counting, release destroys at zero refs, redundant `use*` skipped, active program tracking, context lifecycle, diagnostics
- **B4.3 [geometry_manager.ts](../webgl/geometry/geometry_manager.ts)** — `GeometryManager` — ✅ Complete
  - Test: `geometry_manager.test.ts` (12 specs)
  - Focus: lazy upload on first bind, re-upload on version change, redundant bind skipped, release vs. dispose, `onDispose` cleanup, context lifecycle, counts / diagnostics

### B5. Orchestration (leaf / top consumer)

- **B5.1 [pass_lifecycle.ts](../webgl/core/pass_lifecycle.ts)** — `initializeRenderPass` — ⬜ Not Started
  - Focus: lifecycle callback ordering and return contract
- **B5.2 [context_manager.ts](../webgl/core/context_manager.ts)** — `WebGLContextManager` — ⬜ Not Started
  - Depends on: every manager above
  - Focus: `setContext` / `getContext`, subsystem registration and restoration-priority ordering, pipeline-state cache (redundant state calls skipped), `resetPipelineState`, delegation to the managers, context loss / restore fan-out, `maxTextureUnits`, `destroy`

### B-Excluded

- Interface-only `*_types.ts` files — 🚫 Excluded
- Plain constant variables and enums in `*_types.ts` (`AVAILABLE_SHADER_KEYS`, `VertexStepRate`, `TextureUnit`, `DEFAULT_TEXTURE_UNIT_MAP`, `SubsystemRestorationPriority`) — 🚫 Excluded (tested through the classes and functions that consume them)

---

## Progress Summary

- **Scene:** 18 / 18 complete (A6.2, A6.3 deferred TODO) — 623 passing specs
- **WebGL:** 5 / 13 complete (111 passing specs)
- **Phase 0 fixtures:** 3 / 3 operational
- **Total Suite:** 24 test files, 730 passing specs
- **Next Item:** B3.1 [texture_factory.ts](../webgl/textures/texture_factory.ts)
