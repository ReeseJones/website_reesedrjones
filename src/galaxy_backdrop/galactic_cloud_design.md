# Galactic Cloud & Infinite Horizon Pass Design Document

## 1. Design Goals & Scope

* **Galactic Horizon Grounding:** Define an infinite celestial horizon line across deep space that tilts, rolls, and pans in sync with camera perspective and input parallax. This grounds the shifting view of the camera and prevents disorientation during mouse/device tilt interactions.
* **Volumetric Cosmic Nebulae:** Render rich, flowing background interstellar dust clouds and cosmic gas nebulae behind the stellar population, providing depth layering between foreground stars, midground spiral arms, and deep-space background.
* **Seamless Integration with `<WebGLCanvas />`:** Implement as a lightweight, dedicated WebGL pass ([`galactic_cloud_pass.tsx`](galactic_cloud_pass.tsx)) that executes prior to the scene starfield pass ([`imperative_galaxy_scene_pass.tsx`](../scene/test/imperative_galaxy_scene_pass.tsx)) at priority `-10`.
* **Synchronized Parallax:** Synchronize camera perspective, pitch/yaw rotation matrices, aspect ratio, and mouse/device tilt offsets with the galaxy starfield renderer, but scaled with an infinity parallax factor (~0.25x) so background clouds move with realistic spatial depth.
* **Real-Time Control & Customization:** Expose cloud density, noise scale, horizon brightness, primary/secondary cloud colors, and parallax responsiveness to [parameters/types.ts](parameters/types.ts) and a dedicated section in the interactive [galaxy_settings_dialog/](galaxy_settings_dialog/).
* **Zero Overhead / 60+ FPS:** Executed as a single full-screen quad (2 triangles, 4 vertices) using procedural 3D noise (Simplex/fBm) and smoothstep horizon gradients in GLSL ES 3.00, running efficiently across both desktop and mobile browsers.

---

## 2. Directory & Module Structure

This feature extends the [`src/galaxy_backdrop/`](galaxy_backdrop_design.md) directory:

* [galactic_cloud_design.md](galactic_cloud_design.md) — Architecture and design specification for the galactic cloud & horizon background pass.
* [galactic_cloud_shaders.ts](galactic_cloud_shaders.ts) — GLSL ES 3.00 vertex shader (full-screen quad & view-ray reconstruction) and fragment shader (procedural 3D Simplex/fBm noise, horizon line, and color gradients).
* [galactic_cloud_renderer.ts](galactic_cloud_renderer.ts) — Pure WebGL2 renderer class managing full-screen quad VBO/VAO setup, shader uniform updates, and background render pass execution.
* [galactic_cloud_pass.tsx](galactic_cloud_pass.tsx) — Renderless React pass component living inside [`<WebGLCanvas />`](../components/webgl_canvas/webgl_canvas.tsx) registered at `priority = -10`.
* [galactic_cloud_pass_types.ts](galactic_cloud_pass_types.ts) — Dedicated TypeScript interface for `GalacticCloudPassProps`.
* [galaxy_settings_dialog/galactic_cloud_section.tsx](galaxy_settings_dialog/galactic_cloud_section.tsx) — Dedicated settings dialog UI section component for live tuning of background cloud and horizon options.
* [parameters/types.ts](parameters/types.ts) — Extended with `GalacticCloudParameters` schema.
* [parameters/index.ts](parameters/index.ts) — Updated presets including cloud and horizon parameters for all built-in galaxy presets.

---

## 3. WebGL Canvas & Subscriber Pipeline Integration

```
                    <WebGLCanvas> (Host & Context Manager)
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
  <GalacticCloudPass />                         <ImperativeGalaxyScenePass />
 (Priority: -10 - Background)                   (Priority: 0 - Scene Graph)
 • Full-Screen Quad Shader                      • GalaxyGeometry + GalaxyMaterial
 • Procedural Horizon & Nebulae                 • Logarithmic Spiral Arms
 • Infinity Parallax Response                   • Additive Blended Point Sprites
```

### Execution Flow
1. **Pass Priority `-10` (`GalacticCloudPass`):**
   * Clears canvas color buffer with deep space base color.
   * Asserts pipeline state via `contextManager.applyPipelineState({ depthTest: false, depthWrite: false, blendMode: "alpha", cullFace: false })`.
   * Renders full-screen quad applying view-ray direction reconstruction.
   * Computes background horizon gradient band and volumetric noise gas clouds.
2. **Pass Priority `0` (`GalaxyPass` / `ImperativeGalaxyScenePass`):**
   * Renders 3D starfield additively (`blendMode: "additive"`) on top of the cloud/horizon background.

---

## 4. Types and Interfaces

### Cloud & Horizon Parameters (`GalacticCloudParameters`)

```typescript
export interface GalacticCloudParameters {
    /** Whether the background cloud/horizon pass is active */
    cloudEnabled: boolean;
    /** Density threshold and contrast multiplier for background nebula gas */
    cloudDensity: number;
    /** Spatial scale/frequency of procedural cloud noise */
    cloudScale: number;
    /** Speed multiplier for slow background gas animation drift */
    cloudSpeed: number;
    /** Parallax scale factor relative to camera pitch/yaw offset (0.0 to 1.0) */
    cloudParallaxFactor: number;
    /** Brightness intensity of the infinite horizon line band */
    horizonIntensity: number;
    /** Vertical spread/thickness of the celestial horizon glow */
    horizonThickness: number;
    /** RGB triplet for the glowing horizon band */
    horizonColor: [number, number, number];
    /** RGB triplet for dense inner nebula clouds */
    cloudColorPrimary: [number, number, number];
    /** RGB triplet for outer diffuse dust clouds */
    cloudColorSecondary: [number, number, number];
}
```

---

## 5. Settings Dialog Integration (`GalaxySettingsDialog`)

To allow real-time interactive tuning of the galactic cloud and horizon background, a new dedicated UI section [`galactic_cloud_section.tsx`](galaxy_settings_dialog/galactic_cloud_section.tsx) is inserted into [`galaxy_settings_dialog.tsx`](galaxy_settings_dialog/galaxy_settings_dialog.tsx).

### UI Controls & Section Layout
* **Header & Toggle:**
  * **Enable Background Pass:** Checkbox control (`cloudEnabled`) to enable or bypass the background cloud/horizon shader pass.
* **Celestial Horizon Controls:**
  * **Horizon Intensity:** [`SliderRow`](../components/slider_row/design.md) control (`horizonIntensity`, range: 0.0 to 2.0, step: 0.05) adjusting line luminance.
  * **Horizon Thickness:** [`SliderRow`](../components/slider_row/design.md) control (`horizonThickness`, range: 0.05 to 1.0, step: 0.01) controlling vertical band spread.
  * **Horizon Band Color:** [`ColorItem`](../components/color_item/design.md) swatch (`horizonColor`) selecting RGB tint of the horizon line.
* **Volumetric Nebula Controls:**
  * **Cloud Density:** [`SliderRow`](../components/slider_row/design.md) control (`cloudDensity`, range: 0.0 to 2.0, step: 0.05) tuning noise threshold and contrast.
  * **Noise Frequency / Scale:** [`SliderRow`](../components/slider_row/design.md) control (`cloudScale`, range: 0.5 to 5.0, step: 0.1) setting cloud structure detail.
  * **Animation Drift Speed:** [`SliderRow`](../components/slider_row/design.md) control (`cloudSpeed`, range: 0.0 to 1.0, step: 0.01) controlling slow cosmic gas motion.
  * **Infinity Parallax Factor:** [`SliderRow`](../components/slider_row/design.md) control (`cloudParallaxFactor`, range: 0.0 to 1.0, step: 0.05) setting tilt responsiveness relative to stars.
  * **Primary Cloud Color:** [`ColorItem`](../components/color_item/design.md) swatch (`cloudColorPrimary`) for dense inner nebulae.
  * **Secondary Cloud Color:** [`ColorItem`](../components/color_item/design.md) swatch (`cloudColorSecondary`) for outer diffuse dust.

---

## 6. Shader Architecture & Mathematical Mechanics

### Full-Screen Quad & View Ray Reconstruction

The vertex shader maps a unit full-screen quad to clip coordinates while deriving a view-space ray direction $\vec{v}$ per vertex using camera pitch, yaw, and aspect ratio:

```
v_ray = rotationMatrix * vec3(position.x * aspect, position.y, -fovScale)
```

This ensures that as camera pitch, yaw, or mouse tilt changes, the view vector rotates accordingly, allowing background features to move consistently with 3D perspective.

### Infinite Horizon Line Calculation

In the fragment shader, the vertical angle of the reconstructed view ray $\vec{v}_y$ defines the horizon plane distance:

$$\text{horizonMask} = \text{smoothstep}(\text{horizonThickness}, 0.0, |\vec{v}_y - \text{horizonPitchOffset}|)$$

This creates a smooth glowing band anchored at the galactic equator. When pitch/yaw tilt changes, `horizonPitchOffset` shifts, tilting the horizon line realistically across the viewport.

### Volumetric Procedural Cloud Noise

Cosmic clouds are synthesized using 3D Simplex Fractional Brownian Motion (fBm) sampled along view direction $\vec{v}$:

$$\text{noiseVal} = \sum_{i=1}^{3} w_i \cdot \text{Simplex3D}(\vec{v} \cdot \text{scale} \cdot 2^i + \vec{\text{drift}} \cdot t)$$

* Clouds are attenuated smoothly toward high elevation angles to naturally align nebulae along the galactic plane.
* Density thresholds modulate opacity so sky regions remain dark and crystalline, letting starfield background points shine through.

---

## 7. Implementation Plan & Steps

1. **Parameter Types & Presets:** Add `GalacticCloudParameters` to `GalaxyParameters` in [parameters/types.ts](parameters/types.ts) and update preset files ([deep_nebula.ts](parameters/presets/deep_nebula.ts), [dense_core.ts](parameters/presets/dense_core.ts), etc.).
2. **Shader Implementation (`galactic_cloud_shaders.ts`):** Write GLSL ES 3.00 shaders for ray reconstruction, 3D Simplex noise, horizon band evaluation, and cloud color mixing.
3. **Renderer Class (`galactic_cloud_renderer.ts`):** Build WebGL2 renderer for full-screen quad geometry, VAO binding, and matrix/uniform state synchronization.
4. **Pass Component (`galactic_cloud_pass.tsx`):** Create renderless React pass component subscribed to `<WebGLCanvas />` at priority `-10`.
5. **UI Settings Section (`galactic_cloud_section.tsx`):** Build the new dedicated section component and register it inside [`galaxy_settings_dialog.tsx`](galaxy_settings_dialog/galaxy_settings_dialog.tsx).
6. **Layout Integration:** Add `<GalacticCloudPass controller={backdropGalaxy} />` to [`layout.tsx`](../layouts/layout.tsx).
