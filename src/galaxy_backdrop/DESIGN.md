# Galaxy Backdrop Design Document

## 1. Design Goals & Scope

*   **Visual Atmosphere:** A 3D spiral galaxy viewed from an ultra-shallow canted askew perspective (~8° tilt around transverse axis, with slight roll/yaw). This grazing angle allows the spiral arms to sweep dramatically straight toward the foreground camera lens.
*   **Aesthetic Styles Supported:**
    *   **Pin-Prick Style (Active Default):** Crystalline, microscopic point sources (1.0 to 2.8px) that do not expand into large discs as they approach the camera, evoking genuine astronomical scale (Hubble/JWST deep fields) and high-frequency diamond-dust sparkle without obscuring foreground website content.
    *   **Orb Style:** Cinematic volumetric bokeh discs (up to 96px) with soft Gaussian halos that sweep past the camera lens.
*   **Palette:** Brilliant warm golden core transitioning into deep cyan and cobalt blue arms, interspersed with subtle violet dust accents.
*   **Performance:** Butter-smooth 60–120 FPS on desktop and mobile devices via a single GPU draw call using WebGL2 point primitives (`gl.POINTS`).
*   **Input Reactivity:** Subtle, smooth parallax response to pointer movement on desktop and device accelerometer tilt (`DeviceOrientation`) on mobile.
*   **Clean Architecture:** Zero external dependencies. Self-contained TypeScript + GLSL ES 3.00 implementation that replaces the PixiJS starfield without introducing heavyweight 3D engine overhead.

## 2. Directory & Module Structure

This feature is isolated in its own dedicated directory to maintain modularity:

*   [DESIGN.md](DESIGN.md) — Architecture and design documentation.
*   [galaxy_parameters.ts](galaxy_parameters.ts) — Tunable parameters, style presets, and configuration types.
*   [galaxy_math.ts](galaxy_math.ts) — 3D transformation matrices, perspective projection, and procedural stellar distribution generators.
*   [galaxy_shaders.ts](galaxy_shaders.ts) — GLSL ES 3.00 vertex and fragment shader sources for both pin-prick and orb rendering modes.
*   [galaxy_renderer.ts](galaxy_renderer.ts) — Core WebGL2 engine managing buffers, shader program lifecycle, uniform state, input smoothing, and the animation loop.
*   [galaxy_context.tsx](galaxy_context.tsx) — Ambient React context provider and hook (`useGalaxy`) managing reactive parameters, dialog visibility, and canvas lifecycle.
*   [galaxy_settings_dialog.tsx](galaxy_settings_dialog.tsx) — Interactive settings dialog component providing categorized real-time sliders, color pickers, preset selection, JSON export, and reset functionality.
*   [galaxy_settings_dialog.scss](galaxy_settings_dialog.scss) — Dialog styling following low-specificity CSS rules and shared theme tokens.
*   [../components/icons/gear_icon.tsx](../components/icons/gear_icon.tsx) — SVG gear icon trigger rendered inside the main navbar.
*   [../helpers/colors.ts](../helpers/colors.ts) — Color conversion utilities (hex to normalized RGB and vice-versa).
*   [../hooks/use_galaxy_backdrop.tsx](../hooks/use_galaxy_backdrop.tsx) — React hook managing canvas lifecycle, container attachment, and resize observation.

## 3. Types and Interfaces

### Configuration Parameters (`GalaxyParameters`)

The system exposes a comprehensive, strongly-typed parameter interface:

*   **Render Style:**
    *   `style`: Selects active rendering mode (`"pinprick"` or `"orb"`).
*   **Stellar Population:**
    *   `starCount`: Total number of rendered stars (default: 300,000 on desktop, 110,000 on mobile).
    *   `coreDensityRatio`: Fraction of stars residing in the central bulge (0.0 to 1.0).
    *   `armCount`: Number of primary spiral arms (default: 5 spiral arms with spur bridges).
    *   `armWinding`: Logarithmic spiral pitch factor $b$ determining arm tightness.
    *   `armDispersion`: Radial and angular Gaussian dispersion of stars across arms.
    *   `diskRadius`: Maximum galactic radius in world units.
    *   `diskThickness`: Scale height ($Z$-axis spread) of the stellar disc.
*   **Color & Luminosity:**
    *   `coreColor`: RGB triplet for central bulge stars (warm amber/peach).
    *   `coreBlazeColor`: RGB triplet for nuclear core center (white-hot).
    *   `armInnerColor`: RGB triplet for inner arm stellar nurseries (electric cyan).
    *   `armOuterColor`: RGB triplet for outer arm stars (cobalt blue).
    *   `accentColor`: RGB triplet for interstellar dust clouds (deep violet).
    *   `minPointSize`: Minimum point size in pixels.
    *   `maxPointSize`: Maximum point size in pixels.
    *   `pointScale`: Base scale multiplier for point sprite rasterization.
    *   `coreGlowBoost`: Multiplier for core stellar brightness.
*   **Dynamics & Motion:**
    *   `rotationSpeed`: Angular pattern velocity of the spiral arms ($\text{rad/s}$).
    *   `differentialSpeed`: Radial variation in orbital velocity across the disk.
    *   `driftSpeed`: Rate of local micro-orbital pulsation and scintillation.
    *   `driftAmplitude`: Magnitude of local stellar turbulence.
*   **Camera & Orientation:**
    *   `centerOffsetX`: Eye-space horizontal translation (default: +6.0 to place the galactic hub in the upper-right quadrant, clear of central content).
    *   `centerOffsetY`: Eye-space vertical translation (default: +3.5 to elevate the hub into the upper viewport).
    *   `pitchAngle`: Default tilt angle in radians (~8° ultra-shallow grazing angle toward the disk).
    *   `yawAngle`: Rotational azimuth angle in radians (askew view).
    *   `rollAngle`: Lateral cant angle in radians.
    *   `cameraDistance`: Distance from coordinate origin.
    *   `fov`: Field of view in degrees.
    *   `dprCap`: Maximum device pixel ratio cap (default: 1.5 to protect high-DPI displays).
    *   `nearFadeDistance`: Distance threshold at which foreground stars softly dissolve to avoid near-plane clipping.
*   **Input & Interaction:**
    *   `mouseSensitivity`: Influence multiplier for cursor movement.
    *   `gyroSensitivity`: Influence multiplier for device orientation tilt.
    *   `inputDamping`: Smoothing factor for input interpolation.

### GPU Vertex Layout

Each star is stored in a single contiguous `Float32Array` VBO using 6 floats per vertex:

*   `a_radius` (Float32): Radial distance from galactic center.
*   `a_baseAngle` (Float32): Angular coordinate $\theta_0$ along the spiral arm.
*   `a_zOffset` (Float32): Vertical offset from galactic plane.
*   `a_size` (Float32): Intrinsic stellar size.
*   `a_spectralType` (Float32): Color population blend index (0.0 = core golden, 0.5 = cyan, 0.8 = cobalt, 1.0 = violet).
*   `a_driftPhase` (Float32): Randomized time phase for individual stellar drift.

## 4. Mathematical Modeling & Procedures

### Stellar Distribution Algorithm

Stars are partitioned into three distinct populations:

*   **Central Bulge:**
    *   Radii sampled via exponential falloff $r = -R_{\text{core}} \cdot \ln(1 - u)$ where $u \in [0, 1)$.
    *   Angles distributed uniformly on $[0, 2\pi)$.
    *   Vertical coordinates sampled via Gaussian Box-Muller distribution with spherical scale.
*   **Spiral Arms:**
    *   Radii sampled with linear-to-quadratic bias: $r = R_{\text{core}} + (R_{\text{disk}} - R_{\text{core}}) \cdot \sqrt{u}$.
    *   Base angle assigned by selecting arm index $k \in \{0, \dots, N-1\}$ and applying logarithmic spiral formula:
        $$\theta(r) = k \cdot \frac{2\pi}{N} + \frac{1}{b} \cdot \ln\left(\frac{r}{R_{\text{core}}}\right) + \delta\theta$$
    *   Angular dispersion $\delta\theta$ is Gaussian distributed, increasing proportionally to radius.
    *   Vertical offset $z$ is Gaussian distributed with scale height $h_z$.
*   **Inter-arm Disk & Halo:**
    *   Random uniform disk distribution to ensure organic interstellar background density between arms.

### Kinematics & Transformation (GPU Vertex Shader)

For each frame at time $t$:

*   **Orbital Angle:**
    $$\theta(t) = a\_\text{baseAngle} + (\Omega_{\text{pattern}} + \Omega_{\text{diff}}(r)) \cdot t$$
*   **Local Drift:**
    $$x = (r + \Delta r) \cdot \cos(\theta(t)), \quad y = (r + \Delta r) \cdot \sin(\theta(t)), \quad z = a\_zOffset + \Delta z$$
    where $\Delta r$ and $\Delta z$ are trigonometric functions of `a_driftPhase` and time.
*   **View & Projection:**
    *   The vertex is rotated by the base orientation (pitch, yaw, roll) combined with the smoothed interactive input offsets.
    *   Transform by the 3D perspective projection matrix into clip space.

### Dual Shader Implementations

*   **Pin-Prick Shaders (`GALAXY_PINPRICK_*`):**
    *   Points stay tightly clamped between 1.0px and 2.8px, scaled by intrinsic stellar magnitude $a\_\text{size}$ rather than inverse distance.
    *   Fragment profile uses an ultra-steep Gaussian needle ($\exp(-72.0 \cdot |\text{gl\_PointCoord} - 0.5|^2)$) concentrating photon energy into the central subpixel.
    *   Depth is communicated through **photometric luminosity** (closer stars shine with higher photon flux and white-hot optical saturation) and **differential parallax**, rather than geometric disk expansion.
*   **Orb Shaders (`GALAXY_ORB_*`):**
    *   Points scale by $1 / \text{dist}$ up to 96.0px, expanding into large soft glowing discs.
    *   Fragment profile blends a wide outer halo with a luminous center.

## 5. Input Handling Procedure

*   **Pointer Interaction:**
    *   Capture normalized pointer coordinates $(x, y) \in [-1, 1]$.
    *   In the animation tick, interpolate current target rotation toward target pointer offset using exponential decay:
        $$\text{current} += (\text{target} - \text{current}) \cdot (1 - e^{-\lambda \cdot \Delta t})$$
*   **Mobile Gyroscope Tilt:**
    *   Listen to `deviceorientation` events for `beta` (pitch) and `gamma` (roll).
    *   Clamp and map values to normalized offsets in $[-1, 1]$.
    *   Smooth via the same damping pipeline.

## 6. Lifecycle & Integration

*   **Mounting:**
    *   The React hook initializes the WebGL2 context onto a full-screen canvas element with CSS class `.hero-effect` placed behind page content.
*   **Style Switching:**
    *   `GalaxyRenderer.setStyle("pinprick" | "orb")` allows hot-swapping the active shader program and tuning uniforms at runtime.
*   **Pause on Inactive Tab:**
    *   Listen to `document.visibilityState` to halt `requestAnimationFrame` when the user switches tabs, minimizing battery consumption.
*   **Clean Teardown:**
    *   On React unmount, detach input listeners, release VBO buffers, delete shader programs, and destroy the WebGL2 context.

## 7. Dynamic Parameter Tuning & Settings Dialog

*   **Design Goals:**
    *   Eliminate the need to rebuild the project whenever tweaking visual, physical, or color parameters.
    *   Expose a gear icon menu trigger inside the main navigation bar (`Navbar`).
    *   Allow live adjustments to take effect on the backdrop in real-time at 60–120 FPS.
    *   Persist user adjustments across browser sessions using `localStorage`.
    *   Provide factory reset and one-click JSON export to facilitate committing tuned presets to code.
*   **Update Architecture & Procedures:**
    *   **Uniform Updates:** Parameter changes affecting camera vantage (`centerOffsetX`, `centerOffsetY`, `pitchAngle`, `yawAngle`, `rollAngle`, `cameraDistance`, `fov`), velocities (`rotationSpeed`, `differentialSpeed`, `driftSpeed`), and particle scaling (`pointScale`, `minPointSize`, `maxPointSize`, `nearFadeDistance`) are uploaded to WebGL uniforms on each animation tick with zero reallocation.
    *   **Color Uniforms:** Color vector alterations (`coreColor`, `coreBlazeColor`, `armInnerColor`, `armOuterColor`, `accentColor`, `coreGlowBoost`) execute immediate GPU uniform uploads via `uploadColorUniforms()`.
    *   **Geometry Regeneration:** When structural parameters change (`starCount`, `armCount`, `armWinding`, `armDispersion`, `spurFrequency`, `coreRadius`, `diskRadius`, `diskThickness`, `coreDensityRatio`), `generateStarBuffer()` regenerates the vertex array and re-populates the existing GPU `Float32Array` VBO via `rebuildStarBuffer()`, maintaining the VAO configuration without tearing down the WebGL context.
*   **User Interface & Accessibility:**
    *   The dialog uses native `<dialog>` modal semantics with focus trapping and backdrop dismissal.
    *   On desktop viewports, the gear icon appears at the end of the horizontal navbar with hover rotation.
    *   On mobile drawer viewports, the trigger presents with a descriptive label alongside site navigation links.
    *   Categorized accordion sections (`<details>`) allow quick navigation between Render Style, Camera & Perspective, Stellar Population, Colors, Particle Sizes, and Motion Dynamics.

