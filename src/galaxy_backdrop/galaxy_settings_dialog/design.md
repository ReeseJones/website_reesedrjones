# Galaxy Settings Dialog Design

Design specification for the `GalaxySettingsDialog` interactive configuration sidebar and its modular section subcomponents.

---

## 1. Overview
- **Purpose:** A live-tuning modal sidebar that allows users to interactively modify, preview, save, and export 3D galaxy parameters in real time without obscuring the backdrop.
- **Component File:** [galaxy_settings_dialog.tsx](./galaxy_settings_dialog.tsx)
- **Style File:** [galaxy_settings_dialog.scss](./galaxy_settings_dialog.scss)
- **Context Provider:** [../galaxy_context.tsx](../galaxy_context.tsx)
- **Parameters & Presets:** [../parameters/index.ts](../parameters/index.ts)
- **Design Document:** [design.md](./design.md)
- **System Architecture:** [../galaxy_backdrop_design.md](../galaxy_backdrop_design.md)

---

## 2. Design Goals & UX Concept
- **Unobstructed Live Preview:** Configured as a left-docked sidebar with a completely transparent modal backdrop (`background-color: transparent; backdrop-filter: none;`). This enables full visibility of the procedural 3D galaxy simulation while tweaking controls.
- **Glassmorphic Material Design:** Uses frosted glass blur (`backdrop-filter: blur(12px)`) and semi-transparent dark charcoal backgrounds (`rgba(22, 22, 26, 0.88)`) to maintain contrast over active stars.
- **Zero-Latency Real-Time Feedback:** Parameter updates immediately propagate to the WebGL2 rendering pipeline via ambient React context (`useGalaxy`), updating shader uniforms each frame and re-buffering star geometries on demand.
- **One-Click Serialization:** Generates clean, formatted JSON configuration strings copied straight to the system clipboard for immediate code committing or preset authoring.
- **Modular Subcomponent Architecture:** Avoids monolithic file bloat by isolating each categorized control domain into its own focused section module.

---

## 3. Directory & File Organization

The dialog and its section subcomponents are isolated within this dedicated directory:

- [galaxy_settings_dialog.tsx](./galaxy_settings_dialog.tsx) — Main modal orchestrator, header, and preset toolbar.
- [galaxy_settings_dialog.scss](./galaxy_settings_dialog.scss) — Modal positioning, drawer slide animations, and layout styling.
- [render_style_section.tsx](./render_style_section.tsx) — Toggle between crystalline pin-prick and volumetric orb bokeh rendering.
- [camera_perspective_section.tsx](./camera_perspective_section.tsx) — Vantage distance, eye-space offsets, FOV, and Euler angles (pitch, yaw, roll).
- [stellar_population_section.tsx](./stellar_population_section.tsx) — Star counts, spiral arm winding, density ratios, and core/disc radii.
- [colors_glow_section.tsx](./colors_glow_section.tsx) — Swatch color pickers for core, arms, and dust accents, plus nuclear glow boost.
- [particle_sizes_section.tsx](./particle_sizes_section.tsx) — Base point scaling, min/max rasterized diameters, and near lens fade distance.
- [motion_dynamics_section.tsx](./motion_dynamics_section.tsx) — Galactic rotation, differential orbital shear, and micro-drift amplitude.

---

## 4. Component Interface & Context Data Model

The main component requires zero direct props, consuming all required state and mutators from the ambient `useGalaxy` hook:

```typescript
export function GalaxySettingsDialog(): React.JSX.Element
```

### Consumed Context State (`GalaxyContextValue`)
- `params: GalaxyParameters` — Current active backdrop configuration.
- `updateParameters: (patch: Partial<GalaxyParameters>) => void` — Batched parameter mutation dispatcher.
- `resetParameters: () => void` — Reverts parameters to default preset values.
- `applyPreset: (presetId: string) => void` — Applies a predefined or custom preset.
- `currentPresetId: string` — Active preset identifier (e.g., `"orb_default"`, `"pinprick"`, or `"custom"`).
- `isSettingsOpen: boolean` — Modal visibility flag.
- `closeSettings: () => void` — Closes the settings dialog.

---

## 5. Subcomponent & Section Specifications

### Header Row
- Houses the dialog title with [`GearIcon`](../../components/icons/gear_icon.tsx) and an accessible close button (`aria-label="Close dialog"`).
- Closes the modal via `closeSettings`.

### Preset & Action Toolbar
- **Preset Dropdown Selector:** Lists all available [`GALAXY_PRESETS`](../parameters/index.ts) plus an automatic `"Custom (Modified)"` state when parameters diverge from saved presets.
- **Reset Defaults Button:** Restores factory parameter defaults.
- **Copy JSON Button:** Serializes `params` via `navigator.clipboard.writeText(JSON.stringify(params, null, 2))` and presents a temporary `"Copied!"` indicator state with highlight styling for 2 seconds.

### Section 1: Render Style ([render_style_section.tsx](./render_style_section.tsx))
- **Controls:** Segmented button toggle.
- **Modes:**
  - `pinprick`: Crystalline microscopic points (1.0 to 2.8px) that do not expand into discs near the lens.
  - `orb`: Volumetric bokeh discs (up to 96px) with soft Gaussian halos.

### Section 2: Camera & Perspective ([camera_perspective_section.tsx](./camera_perspective_section.tsx))
- **Controls:** Built using [`SliderRow`](../../components/slider_row/slider_row.tsx).
- **Parameters:**
  - `centerOffsetX` & `centerOffsetY`: Horizontal and vertical eye-space focal shifts (-15 to 15 / -10 to 10).
  - `cameraDistance`: Vantage distance (5 to 40).
  - `fov`: Vertical field of view in degrees (30° to 110°).
  - `pitchAngle`: Grazing cant tilt in radians (-1.5 to 1.5 rad).
  - `yawAngle`: Azimuth askew angle in radians (-3.14 to 3.14 rad).
  - `rollAngle`: Lateral roll angle in radians (-1.5 to 1.5 rad).
  - `mouseSensitivity`: Pointer parallax displacement multiplier (0.0 to 1.2).

### Section 3: Stellar Population & Arms ([stellar_population_section.tsx](./stellar_population_section.tsx))
- **Controls:** Sliders adjusting procedural distribution parameters.
- **Parameters:**
  - `starCount`: Total number of active stars (20,000 to 500,000).
  - `armCount`: Spiral arm branches (1 to 8).
  - `armWinding`: Logarithmic spiral pitch factor $b$ (0.1 to 1.5).
  - `armDispersion`: Perpendicular Gaussian scatter width (0.05 to 0.8).
  - `spurFrequency`: Frequency of intermediate bridge spurs (0.0 to 0.6).
  - `coreDensityRatio`: Percentage of stars allocated to the central bulge (5% to 50%).
  - `coreRadius`: Nuclear core bulge radius (0.5 to 5.0).
  - `diskRadius`: Galactic disk outer boundary radius (5.0 to 30.0).
  - `diskThickness`: Disc vertical scale height (0.2 to 3.0).

### Section 4: Colors & Glow ([colors_glow_section.tsx](./colors_glow_section.tsx))
- **Controls:** Responsive grid of [`ColorItem`](../../components/color_item/color_item.tsx) swatches and a glow boost slider.
- **Channels:**
  - `coreColor`: Bulge star tint.
  - `coreBlazeColor`: Nuclear hot center tint.
  - `armInnerColor`: Inner arm stellar nursery tint.
  - `armOuterColor`: Outer disk star tint.
  - `accentColor`: Interstellar dust cloud tint.
  - `coreGlowBoost`: Nuclear brightness multiplier (0.5 to 5.0).

### Section 5: Particle Sizes & Luminosity ([particle_sizes_section.tsx](./particle_sizes_section.tsx))
- **Controls:** Sliders governing point sprite rasterization.
- **Parameters:**
  - `pointScale`: Global point sprite scale multiplier (0.5 to 80.0).
  - `minPointSize`: Pixel floor for distant stars (0.5px to 8.0px).
  - `maxPointSize`: Pixel ceiling for foreground stars (1.0px to 120.0px).
  - `nearFadeDistance`: Smooth camera proximity fade threshold (0.2 to 6.0).

### Section 6: Motion & Dynamics ([motion_dynamics_section.tsx](./motion_dynamics_section.tsx))
- **Controls:** Sliders governing animation tick velocities.
- **Parameters:**
  - `rotationSpeed`: Galactic pattern velocity in rad/s (-0.15 to 0.15 rad/s).
  - `differentialSpeed`: Radial orbital velocity gradient (0.0 to 0.08).
  - `driftSpeed`: Micro-orbital scintillation pulsation rate (0.0 to 0.5).
  - `driftAmplitude`: Micro-orbital turbulence displacement (0.0 to 0.4).

---

## 6. Visual Styling & Drawer Animation

The dialog utilizes standard CSS and HTML5 modal capabilities:

- **Sidebar Anchoring:**
  - Positioned at `top: 0; left: 0; bottom: 0; height: 100%; width: 440px; max-width: 90vw;`.
  - Margin right set to `auto` to pin to the left viewport edge.
- **Smooth Drawer Slide Transition:**
  - Uses modern CSS `@starting-style` and `allow-discrete` display transitions.
  - Closed state: `transform: translateX(-100%); opacity: 0;`.
  - Open state: `transform: translateX(0); opacity: 1; transition: opacity 0.25s ease, transform 0.25s ease-in-out, display 0.25s allow-discrete;`.
- **Transparent Backdrop:**
  - `::backdrop { background-color: transparent; backdrop-filter: none; }` prevents screen dimming and keeps the galaxy backdrop 100% visible.
- **Accordion Design:**
  - Native `<details>` and `<summary>` elements with styled arrow indicators, highlight colors, and dark semi-transparent section cards.

---

## 7. State & Update Flow

```
[User scrub / color pick]
         │
         ▼
[Section Component] ── calls ──> updateParameters({ field: value })
                                           │
                                           ▼
                                    [GalaxyContext]
                                    ┌──────┴──────┐
                                    ▼             ▼
                           [React Rerender]  [WebGL Engine]
                           (Sliders / Hex)   (Uniforms / VBO)
```

- **Uniform Updates:** Changes to camera angles, velocities, and particle sizes execute immediate uniform uploads in WebGL2 without reallocation.
- **VBO Rebuilding:** Structural changes to star count, arm count, or density ratios trigger procedural regeneration via `generateStarBuffer()` and repopulate the existing GPU vertex buffer.
- **Backdrop Dismissal:** Handled by clicking the transparent backdrop outside `.dialog-content`.
