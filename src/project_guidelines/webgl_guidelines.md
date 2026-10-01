# WebGL Rendering Guidelines

Comprehensive principles and performance rules for WebGL2 rendering in this codebase.

---

## 1. Draw Call Minimization
- **Minimize Draw Calls Per Frame:** Combine geometry into consolidated Vertex Array Objects (VAOs) and Vertex Buffer Objects (VBOs) whenever possible. Prefer drawing large batches via single instanced or point/triangle array draw calls (`gl.drawArrays` / `gl.drawElements`) rather than issuing multiple draw calls per frame.

---

## 2. Smart Uniform Uploads & State Caching
- **Frame-Dynamic vs Static Uniforms:** Only upload uniforms in `renderFrame()` that actually change dynamically every frame (e.g., `uTime`, camera matrices, pointer/parallax offsets).
- **Update Uniforms On Change Only:** Configuration parameters (e.g. colors, density thresholds, scale multipliers, lighting properties) must only be uploaded to the GPU when initialized or when modified (e.g., inside `updateParameters()` or via dirty flag tracking).
- **Avoid Redundant State Switches:** Avoid calling `gl.useProgram()` or re-uploading identical scalar/matrix uniforms if the GL program state is already active and uniform values have not changed.

---

## 3. Explicit Pass State Ownership
- **Explicit Pass State Ownership:** Every subscriber pass must explicitly set its required WebGL pipeline states (such as `gl.useProgram()`, `gl.blendFunc()`, and `gl.enable(gl.BLEND)`) inside `renderFrame()` prior to its draw call. Never assume state initialized during `init()` or left over by prior passes in a multi-pass pipeline will remain active.

---

## 4. Centralized Auto-Clearing
- **Centralized Frame Clear:** `<WebGLCanvas />` manages auto-clearing by default (`autoClear: true`, `clearColor: [0, 0, 0, 0]`) at the start of every frame tick before executing subscriber passes.
- **Do Not Clear In Individual Passes:** Individual passes (such as `<GalacticCloudPass />` or `<GalaxyPass />`) must not issue `gl.clear(gl.COLOR_BUFFER_BIT)` during `renderFrame()`. This prevents double clearing and allows multiple passes (priority `-10`, `0`, `10`...) to composite cleanly.

