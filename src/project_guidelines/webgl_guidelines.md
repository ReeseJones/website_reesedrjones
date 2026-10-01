# WebGL Rendering Guidelines

Comprehensive principles and performance rules for WebGL2 rendering in this codebase.

---

## 1. Modular Architecture & Infrastructure (`src/webgl/`)
All core WebGL infrastructure and generic resource utilities reside in [`src/webgl/`](../webgl/):
- **Declarative VAO & Attribute Specs ([`vertex_layout.ts`](../webgl/vertex_layout.ts)):** Use `VertexLayoutSpec` and `configureVAO()` to define vertex buffer schemas. Avoid manual byte offset math (`N * Float32Array.BYTES_PER_ELEMENT`).
- **Shader Program Management ([`shader_program.ts`](../webgl/shader_program.ts)):** Use `ShaderProgram` composition ("has-a" relationship) rather than inheritance. Provides client-side uniform memory caching, redundant upload elimination, and automated context restoration.
- **Resource Lifecycle Pipeline ([`pass_lifecycle.ts`](../webgl/pass_lifecycle.ts)):** Implement `RenderPassLifecycle` (`buildShaders` $\rightarrow$ `buildBuffers` $\rightarrow$ `configureLayout` $\rightarrow$ `uploadStaticUniforms`) and invoke `initializeRenderPass(gl, this)` to enforce strict 4-stage dependency ordering during startup and context recovery.

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
- **Explicit Pass State Ownership:** Every subscriber pass must explicitly set its required WebGL pipeline states (such as `shaderProgram.use()`, `gl.blendFunc()`, and `gl.enable(gl.BLEND)`) inside `renderFrame()` prior to its draw call. Never assume state initialized during `init()` or left over by prior passes in a multi-pass pipeline will remain active.

---

## 5. Centralized Auto-Clearing
- **Centralized Frame Clear:** `<WebGLCanvas />` manages auto-clearing by default (`autoClear: true`, `clearColor: [0, 0, 0, 0]`) at the start of every frame tick before executing subscriber passes.
- **Do Not Clear In Individual Passes:** Individual passes (such as `<GalacticCloudPass />` or `<GalaxyPass />`) must not issue `gl.clear(gl.COLOR_BUFFER_BIT)` during `renderFrame()`. This prevents double clearing and allows multiple passes (priority `-10`, `0`, `10`...) to composite cleanly.

---

## 6. Context Unbinding & State Cleanup
- **Setup vs. Render Loop Unbinding:**
  - **Unbind After Setup (Initialization):** Always unbind VAOs (`gl.bindVertexArray(null)`) and VBOs (`gl.bindBuffer(gl.ARRAY_BUFFER, null)`) at the end of resource setup/creation routines to isolate setup state and prevent accidental mutation.
  - **Skip Unbinding in Render Loops:** Do not unbind resources to `null` between draw calls during per-frame `renderFrame()` execution. Transition directly to the next required bound resource to eliminate redundant WebGL driver call overhead.
