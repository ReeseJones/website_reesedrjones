# Polyline Ribbon Shader Architecture & Extrusion Design

## 1. Executive Summary & Design Goals

### Overview
This document specifies the technical design, geometric mathematics, and GLSL shader implementation for **Strategy 2 (Screen-Space Billboarded Ribbons)**. It details how an ordered 3D path $[P_0, P_1, \ldots, P_{N-1}]$ in world coordinates is dynamically extruded into a camera-facing 2D polygonal ribbon with exact pixel width, mathematically robust miter joins, sub-pixel anti-aliasing, and a glowing sci-fi navigation aesthetic.

### Key Architectural Principles
- **Constant Screen-Space Thickness:** Line width is specified in display pixels (e.g. $4\text{px}$, $8\text{px}$), maintaining crisp visual fidelity regardless of 3D camera distance or field of view.
- **Orientation Independence:** Unlike 3D tubes or static polygonal strips, the ribbon normal is computed in the 2D screen plane, ensuring the line never thins or disappears when viewed at oblique or grazing angles.
- **Robust Corner Miter Handling:** Computes exact 2D miter normals between adjacent segments with configurable clamping (`u_miterLimit`) to prevent spikes at acute turn angles.
- **Near-Plane Clipping Safeguard:** Handles segments crossing the camera's near clipping plane ($w \le 0$) without 180-degree mathematical inversion artifacts.
- **High-Performance Procedural Shading:** Fragment shader evaluates signed cross-line distance for sub-pixel anti-aliasing, an intense neon core, ambient glow falloff, and animated directional pulses.

---

## 2. Vertex Data Representation & Buffer Packing

To calculate screen-space tangents and miter vectors on the GPU without CPU readbacks, each path point is expanded into a vertex pair (top and bottom edges) that stores neighborhood context:

```
        Segment Normal N_miter
                 ^
   v3 +----------+----------+ v5  <-- Top Edge (side = +1.0)
      |          |          |
   P0 o==========o==========o P2  <-- Waypoint Backbone
      |          P1         |
   v2 +----------+----------+ v4  <-- Bottom Edge (side = -1.0)
```

### Vertex Layout Specification
Each vertex in the polyline buffer contains the following attributes packed into contiguous interleaved memory:

- **`a_current` (`vec3`, Location 0):** Coordinates $[x, y, z]$ of current waypoint $P_i$.
- **`a_previous` (`vec3`, Location 1):** Coordinates $[x, y, z]$ of preceding waypoint $P_{i-1}$. For the start point $P_0$, the CPU extrapolates along the initial direction: $P_{-1} = P_0 - (P_1 - P_0)$.
- **`a_next` (`vec3`, Location 2):** Coordinates $[x, y, z]$ of subsequent waypoint $P_{i+1}$. For the final point $P_{N-1}$, the CPU extrapolates: $P_N = P_{N-1} + (P_{N-1} - P_{N-2})$.
- **`a_sideAndProgress` (`vec2`, Location 3):**
  - `side` ($\pm 1.0$): $+1.0$ for top extrusion edge, $-1.0$ for bottom extrusion edge.
  - `progress` ($u \ge 0$): Accumulated 3D arc-length distance from path origin $P_0$ (enables distance-based dashing and wave pulses).

### Triangulation Topology
For a path of $N$ points, the CPU allocates:
- Total Vertices: $2 \times N$ vertices.
- Total Triangles: $2 \times (N - 1)$ triangles.
- Total Indices: $6 \times (N - 1)$ indices (forming quad segments between $P_i$ and $P_{i+1}$).
- Index sequence for segment $i$:
  $$[2i, \; 2i + 1, \; 2i + 2, \quad 2i + 2, \; 2i + 1, \; 2i + 3]$$

---

## 3. Vertex Shader Extrusion Mathematics

### Step 1: Clip-Space Transformation
Transform current, previous, and next positions using the combined Model-View-Projection matrix ($\mathbf{MVP} = \mathbf{P} \cdot \mathbf{V} \cdot \mathbf{M}$):

$$\mathbf{c}_{\text{curr}} = \mathbf{MVP} \cdot \begin{bmatrix} P_{\text{curr}} \\ 1 \end{bmatrix}, \quad \mathbf{c}_{\text{prev}} = \mathbf{MVP} \cdot \begin{bmatrix} P_{\text{prev}} \\ 1 \end{bmatrix}, \quad \mathbf{c}_{\text{next}} = \mathbf{MVP} \cdot \begin{bmatrix} P_{\text{next}} \\ 1 \end{bmatrix}$$

### Step 2: Near-Plane Horizon Clipping
When the camera approaches a line closely, neighbor points $P_{\text{prev}}$ or $P_{\text{next}}$ may cross behind the near plane ($w \le 0$). Direct perspective division $(\div w)$ on negative $w$ inverts 2D screen vectors, creating inverted extrusion spikes across the screen.

- **Clipping Correction:**
  If a neighbor point has $w \le \epsilon$ (where $\epsilon \approx 0.001$), find the intersection along the line segment where $w = \epsilon$:
  $$t = \frac{\epsilon - \mathbf{c}_{\text{curr}}.w}{\mathbf{c}_{\text{neighbor}}.w - \mathbf{c}_{\text{curr}}.w}$$
  $$\mathbf{c}_{\text{clipped}} = \text{mix}(\mathbf{c}_{\text{curr}}, \mathbf{c}_{\text{neighbor}}, t)$$

### Step 3: Screen-Space Coordinate Conversion
Convert homogeneous coordinates to 2D pixel coordinates using canvas dimensions $(W_{\text{px}}, H_{\text{px}})$:

$$\mathbf{s} = \begin{bmatrix} \frac{\mathbf{c}.x}{\mathbf{c}.w} \cdot \frac{W_{\text{px}}}{2} \\ \frac{\mathbf{c}.y}{\mathbf{c}.w} \cdot \frac{H_{\text{px}}}{2} \end{bmatrix}$$

Perform this conversion for $\mathbf{s}_{\text{curr}}$, $\mathbf{s}_{\text{prev}}$, and $\mathbf{s}_{\text{next}}$.

### Step 4: 2D Screen Tangents & Normals
Compute normalized incoming and outgoing screen tangents:

$$\mathbf{T}_{\text{in}} = \text{normalize}(\mathbf{s}_{\text{curr}} - \mathbf{s}_{\text{prev}})$$
$$\mathbf{T}_{\text{out}} = \text{normalize}(\mathbf{s}_{\text{next}} - \mathbf{s}_{\text{curr}})$$

Compute 2D counter-clockwise perpendicular normal vectors:

$$\mathbf{N}_{\text{in}} = \begin{bmatrix} -\mathbf{T}_{\text{in}}.y \\ \mathbf{T}_{\text{in}}.x \end{bmatrix}, \quad \mathbf{N}_{\text{out}} = \begin{bmatrix} -\mathbf{T}_{\text{out}}.y \\ \mathbf{T}_{\text{out}}.x \end{bmatrix}$$

### Step 5: Miter Vector & Spike Clamping
The continuous miter vector bisects the angle between incoming and outgoing segments:

$$\mathbf{N}_{\text{miter}} = \text{normalize}(\mathbf{N}_{\text{in}} + \mathbf{N}_{\text{out}})$$

The geometric extrusion distance required to maintain uniform width across the turn is given by the reciprocal dot product:

$$\text{miterLength} = \frac{1.0}{\max(\mathbf{N}_{\text{miter}} \cdot \mathbf{N}_{\text{in}}, \; \text{cosThreshold})}$$

```
                N_miter (Bisector)
                    ^
                   / \
       N_in       /   \       N_out
         ^       /     \       ^
          \     /       \     /
           \   /         \   /
  T_in ----> P1 ---------> T_out
```

- **Miter Clamping Rule:**
  At sharp turns (turn angle $> 120^\circ$), $\mathbf{N}_{\text{miter}} \cdot \mathbf{N}_{\text{in}}$ approaches zero, causing $\text{miterLength} \to \infty$ and generating long spikes.
  To prevent this, the extrusion factor is clamped:
  $$\text{scale} = \min(\text{miterLength}, \; \text{u\_miterLimit})$$
  *(Standard default for `u_miterLimit` is $3.0$).*

### Step 6: Clip-Space Offset & Depth Output
1. Compute the final pixel displacement:
   $$\mathbf{offset}_{\text{px}} = \mathbf{N}_{\text{miter}} \cdot \left( \text{side} \cdot \frac{\text{u\_lineWidth}}{2} \cdot \text{scale} \right)$$

2. Convert pixel displacement back into homogeneous clip coordinates:
   $$\mathbf{offset}_{\text{clip}} = \begin{bmatrix} \frac{2 \cdot \mathbf{offset}_{\text{px}}.x}{W_{\text{px}}} \cdot \mathbf{c}_{\text{curr}}.w \\ \frac{2 \cdot \mathbf{offset}_{\text{px}}.y}{H_{\text{px}}} \cdot \mathbf{c}_{\text{curr}}.w \end{bmatrix}$$

3. Output final vertex position:
   $$\text{gl\_Position} = \begin{bmatrix} \mathbf{c}_{\text{curr}}.x + \mathbf{offset}_{\text{clip}}.x \\ \mathbf{c}_{\text{curr}}.y + \mathbf{offset}_{\text{clip}}.y \\ \mathbf{c}_{\text{curr}}.z \\ \mathbf{c}_{\text{curr}}.w \end{bmatrix}$$

*Notice:* $\text{gl\_Position}.z$ matches the original transformed vertex depth, ensuring proper hardware depth testing against galaxy stars and scene geometry!

---

## 4. Fragment Shader Shading & Visual FX

The fragment shader receives:
- `v_side`: Continuous across-line coordinate $\in [-1.0, 1.0]$.
- `v_progress`: Continuous distance along line curve $u \ge 0$.

```
  v_side = +1.0  ------------------------------------ (Soft Outer Glow)
                 ==================================== (Vibrant Blue Halo)
  v_side =  0.0  ------------------------------------ (Hot Cyan/White Core)
                 ==================================== (Vibrant Blue Halo)
  v_side = -1.0  ------------------------------------ (Soft Outer Glow)
```

### 1. Sub-Pixel Anti-Aliasing
At the outer edges ($|v_{\text{side}}| \to 1.0$), sharp pixel transitions are smoothed using standard derivative-based edge feathering:

$$\text{feather} = \text{fwidth}(v_{\text{side}}) \cdot 1.5$$
$$\text{alpha} = \text{smoothstep}(1.0, \; 1.0 - \text{feather}, \; |v_{\text{side}}|)$$

### 2. Neon Core & Atmospheric Halo Profile
To produce a glowing sci-fi transit line:
1. **Core Energy Beam ($|v| \approx 0$):**
   A sharp exponential peak provides intense central energy:
   $$I_{\text{core}} = \exp\left( -k_{\text{core}} \cdot v_{\text{side}}^2 \right) \quad (\text{with } k_{\text{core}} \approx 16.0)$$
2. **Atmospheric Halo ($|v| \in [0, 1]$):**
   A gentler Gaussian falloff creates a vibrant blue neon dispersion:
   $$I_{\text{halo}} = \exp\left( -k_{\text{halo}} \cdot v_{\text{side}}^2 \right) \quad (\text{with } k_{\text{halo}} \approx 2.5)$$
3. **Color Composition:**
   $$\mathbf{C}_{\text{base}} = \text{mix}(\mathbf{C}_{\text{halo}}, \; \mathbf{C}_{\text{core}}, \; I_{\text{core}})$$
   $$\mathbf{C}_{\text{final}} = \mathbf{C}_{\text{base}} \cdot I_{\text{halo}} \cdot \text{alpha}$$

### 3. Animated Directional Chevrons / Wave Pulses
To signify direction of travel along the route (e.g. from origin star to destination star):
- **Traveling Sine Pulse:**
  $$\text{phase} = v_{\text{progress}} \cdot \text{u\_pulseFrequency} - \text{u\_time} \cdot \text{u\_pulseSpeed}$$
  $$\text{pulse} = 0.5 + 0.5 \cdot \sin(\text{phase})$$
- Modulate core luminosity by $(1.0 + \text{pulse} \cdot \text{u\_pulseIntensity})$.

---

## 5. Pipeline State & Uniform Interface

### Uniform Schema
- **Tier A (Camera & Viewport):**
  - `u_projectionMatrix` (`mat4`): Perspective or orthographic camera projection.
  - `u_viewMatrix` (`mat4`): Camera view transform.
  - `u_resolution` (`vec2`): Viewport dimensions in physical pixels $[W_{\text{px}}, H_{\text{px}}]$.
  - `u_time` (`float`): Global elapsed time in seconds.
- **Tier B (Instance Transform):**
  - `u_modelMatrix` (`mat4`): World matrix of the `PolylineInstance`.
  - `u_modelViewMatrix` (`mat4`): Precomputed $\mathbf{V} \cdot \mathbf{M}$.
- **Tier C (Material & Style):**
  - `u_lineWidth` (`float`): Stroke thickness in pixels (default: $6.0$).
  - `u_miterLimit` (`float`): Max corner spike ratio (default: $3.0$).
  - `u_lineColor` (`vec4`): Outer halo color (e.g. Royal Blue $[0.1, 0.4, 1.0, 1.0]$).
  - `u_coreColor` (`vec4`): Central energy beam color (e.g. White/Cyan $[0.8, 0.95, 1.0, 1.0]$).
  - `u_pulseSpeed` (`float`): Rate of travel pulse animation (default: $2.5$).
  - `u_pulseFrequency` (`float`): Density of animated pulses along route (default: $0.1$).

### WebGL Blend & Depth State
- **Blend Mode:** Premultiplied Alpha or Additive Blending.
  - Additive Blending (`gl.blendFunc(gl.SRC_ALPHA, gl.ONE)`): Delivers luminous laser-like route illumination without darkening backgrounds.
- **Depth Configuration:**
  - `gl.enable(gl.DEPTH_TEST)`
  - `gl.depthMask(false)`: Prevents the transparent halo from writing to the depth buffer, allowing background stars and nebulas to show through without clipping.

---

## 6. Implementation Checklist & Module Locations

- **GLSL Shaders:**
  - [`src/scene/shaders/polyline_ribbon.vert`](../shaders/polyline_ribbon.vert): Near-plane clipping, screen miter extrusion, clip offset generation.
  - [`src/scene/shaders/polyline_ribbon.frag`](../shaders/polyline_ribbon.frag): Signed distance edge feathering, neon core/halo blending, pulse modulation.
- **CPU Geometry Builder (`src/scene/lines/`):**
  - `polyline_geometry_types.ts`: Interface definitions for waypoint buffers and layout schemas.
  - `polyline_geometry.ts`: Algorithmic builder converting 3D point array $[P_0, \ldots, P_{N-1}]$ into interleaved `[current, prev, next, sideAndProgress]` Float32Array and index buffer.
- **Material & Scene Node (`src/scene/lines/` & `src/scene/materials/`):**
  - `polyline_material.ts`: Uniform bindings and additive blend state manager.
  - `polyline_instance.ts`: Extends `SceneNode`, implements `IRenderable`, handles bounding box and dynamic waypoint mutations.
