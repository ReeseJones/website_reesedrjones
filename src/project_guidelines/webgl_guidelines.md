# WebGL Rendering Guidelines

Comprehensive principles and performance rules for WebGL2 rendering in this codebase.

---

## 1. Modular Architecture & Infrastructure (`src/webgl/`)
All core WebGL infrastructure and generic resource utilities reside in [`src/webgl/`](../webgl/):
- **Declarative VAO & Attribute Specs ([`vertex_layout.ts`](../webgl/geometry/vertex_layout.ts)):** Use `VertexLayoutSpec` ([`vertex_layout_types.ts`](../webgl/geometry/vertex_layout_types.ts)) and `configureVAO()` to define vertex buffer schemas. Avoid manual byte offset math (`N * Float32Array.BYTES_PER_ELEMENT`).
- **Shader Program Management ([`shader_program.ts`](../webgl/shaders/shader_program.ts)):** Use `ShaderProgram` composition ("has-a" relationship) rather than inheritance with options and context manager interfaces defined in [`shader_program_types.ts`](../webgl/shaders/shader_program_types.ts). Provides client-side uniform memory caching, redundant upload elimination, and automated context restoration.
- **Resource Lifecycle Pipeline ([`pass_lifecycle.ts`](../webgl/core/pass_lifecycle.ts)):** Implement `RenderPassLifecycle` ([`pass_lifecycle_types.ts`](../webgl/core/pass_lifecycle_types.ts)) (`buildShaders` $\rightarrow$ `buildBuffers` $\rightarrow$ `configureLayout` $\rightarrow$ `uploadStaticUniforms`) and invoke `initializeRenderPass(gl, this)` to enforce strict 4-stage dependency ordering during startup and context recovery.

---

## 2. Draw Call Minimization
- **Minimize Draw Calls Per Frame:** Combine geometry into consolidated Vertex Array Objects (VAOs) and Vertex Buffer Objects (VBOs) whenever possible. Prefer drawing large batches via single instanced or point/triangle array draw calls (`gl.drawArrays` / `gl.drawElements`) rather than issuing multiple draw calls per frame.

---

## 3. Smart Uniform Uploads & State Caching
- **Frame-Dynamic vs Static Uniforms:** Only upload uniforms in `renderFrame()` that actually change dynamically every frame (e.g., `uTime`, camera matrices, pointer/parallax offsets).
- **Update Uniforms On Change Only:** Configuration parameters (e.g. colors, density thresholds, scale multipliers, lighting properties) must only be uploaded to the GPU when initialized or when modified.
- **Avoid Redundant State Switches:** `ShaderProgram` handles value equality checks to suppress duplicate WebGL uniform driver calls when values remain identical across frames.

---

## 4. Explicit Pass State Ownership
- **Explicit Pass State Ownership:** Every subscriber pass must explicitly set its required WebGL pipeline states (such as `contextManager.useShader(shaderProgram)`, `gl.blendFunc()`, and `gl.enable(gl.BLEND)`) inside `renderFrame()` prior to its draw call. Never assume state initialized during `init()` or left over by prior passes in a multi-pass pipeline will remain active.

---

## 5. Centralized Auto-Clearing
- **Centralized Frame Clear:** `<WebGLCanvas />` manages auto-clearing by default (`autoClear: true`, `clearColor: [0, 0, 0, 0]`) at the start of every frame tick before executing subscriber passes.
- **Do Not Clear In Individual Passes:** Individual passes (such as `<GalacticCloudPass />` or `<GalaxyPass />`) must not issue `gl.clear(gl.COLOR_BUFFER_BIT)` during `renderFrame()`. This prevents double clearing and allows multiple passes (priority `-10`, `0`, `10`...) to composite cleanly.

---

## 6. Context Unbinding & State Cleanup
- **Setup vs. Render Loop Unbinding:**
  - **Unbind After Setup (Initialization):** Always unbind VAOs (`gl.bindVertexArray(null)`) and VBOs (`gl.bindBuffer(gl.ARRAY_BUFFER, null)`) at the end of resource setup/creation routines to isolate setup state and prevent accidental mutation.
  - **Skip Unbinding in Render Loops:** Do not unbind resources to `null` between draw calls during per-frame `renderFrame()` execution. Transition directly to the next required bound resource to eliminate redundant WebGL driver call overhead.

---

## 7. Math Types & Matrix Buffers (`Float32Array` Standard)
- **Standardized on `Float32Array`:** All matrices (`mat4`, `mat3`), vectors (`vec3`, `vec4`), and quaternions (`quat`) produced, cached, and consumed across the WebGL pipeline are typed and backed by `Float32Array`.
- **Why Not Standard JS `Array`:**
  - Standard JavaScript arrays (`number[]`) require WebIDL sequence marshaling (`sequence<GLfloat>`) on every uniform upload (`gl.uniformMatrix4fv`, `gl.uniform*`), allocating temporary native memory and converting values on every draw call.
  - Standard JS arrays cannot be passed to `gl.bufferData` (which strictly requires `ArrayBufferView` / `BufferSource`).
  - `Float32Array` provides direct raw memory pointer access to the GPU driver without per-frame allocations or garbage collection.
- **Ambient `gl-matrix` Augmentation ([`src/types/gl_matrix.d.ts`](../types/gl_matrix.d.ts)):**
  - By default, `gl-matrix` 3.x types matrices and vectors as `IndexedCollection` to support optional array switching via `setMatrixArrayType`. Because TypeScript treats `IndexedCollection` as looser than `Float32Array`, passing `gl-matrix` return values to typed properties (e.g. `ICamera.viewMatrix: Float32Array`, `ShaderProgram.setMat4`) previously required continuous `as Float32Array` casting.
  - We augment `declare module "gl-matrix"` in [`src/types/gl_matrix.d.ts`](../types/gl_matrix.d.ts) (`interface IndexedCollection extends Float32Array`), ensuring `mat4.create()`, `mat4.multiply()`, etc. are typed as `Float32Array` project-wide with zero cast boilerplate.

