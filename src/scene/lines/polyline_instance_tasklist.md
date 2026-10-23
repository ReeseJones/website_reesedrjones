# Polyline Route System Implementation Tasklist

This checklist tracks the implementation of screen-space extruded polyline routes for galactic navigation, per [Polyline Route & Billboard Waypoint System Design](polyline_route_system_design.md), [Polyline Ribbon Shader Architecture](polyline_shader_design.md), and [Working with Vectors and Colors Guidelines](../../project_guidelines/working_with_vectors_and_colors_guidelines.md).

All implementations must strictly separate type definitions (`*_types.ts`), maintain internal contiguous `Float32Array` storage while exposing semantic interfaces (`Vector3Like`, `RgbaLike`), use `rj-` prefix for custom elements, and follow the four-phase subagent protocol.

---

## Phase 1: Type Definitions, Constants & Shaders

- [x] **Polyline Constants ([`src/scene/lines/polyline_constants.ts`](polyline_constants.ts))**
  - [x] Define default line width (`DEFAULT_POLYLINE_WIDTH = 4.0`).
  - [x] Define default miter limit (`DEFAULT_POLYLINE_MITER_LIMIT = 3.0`).
  - [x] Define default colors (cyan/white core, royal blue glow).
  - [x] Define default dash speed (`DEFAULT_POLYLINE_DASH_SPEED = 0.0`).
  - [x] Define default near plane epsilon (`DEFAULT_POLYLINE_NEAR_EPSILON = 0.001`).
- [x] **Polyline Instance Types ([`src/scene/lines/polyline_instance_types.ts`](polyline_instance_types.ts))**
  - [x] Define `PolylineJoinStyle` enum (`Miter = 0`, `Bevel = 1`, `Round = 2`).
  - [x] Define `PolylineCapStyle` enum (`Butt = 0`, `Square = 1`, `Round = 2`).
  - [x] Define `PolylineRouteOptions` interface.
  - [x] Define `IPolylineInstance` interface extending `IRenderable` with semantic getters/setters.
- [x] **Polyline Geometry Types ([`src/scene/lines/polyline_geometry_types.ts`](polyline_geometry_types.ts))**
  - [x] Define `IPolylineGeometry` interface extending `IMeshGeometry`.
  - [x] Define `PolylineGeometryOptions` interface.
- [x] **Polyline Material Types ([`src/scene/lines/polyline_material_types.ts`](polyline_material_types.ts))**
  - [x] Define `IPolylineMaterial` interface extending `IMaterial`.
  - [x] Define `PolylineMaterialOptions` interface.
- [x] **Shader Key Registration ([`src/webgl/shaders/shader_types.ts`](../../webgl/shaders/shader_types.ts))**
  - [x] Register `"polyline_ribbon"` shader key in shader key union/types.
- [x] **GLSL Ribbon Vertex Shader ([`src/scene/shaders/polyline_ribbon.vert`](../shaders/polyline_ribbon.vert))**
  - [x] Attribute 0: `a_current` (`vec3`).
  - [x] Attribute 1: `a_previous` (`vec3`).
  - [x] Attribute 2: `a_next` (`vec3`).
  - [x] Attribute 3: `a_sideAndProgress` (`vec2`).
  - [x] Uniforms: `u_modelMatrix`, `u_viewMatrix`, `u_projectionMatrix`, `u_viewportResolution`, `u_lineWidth`, `u_miterLimit`.
  - [x] Clip-space transformation with near-plane ($w \le \epsilon$) clipping fix.
  - [x] Screen-space 2D tangents, normals, miter bisector, and spike clamping.
  - [x] Re-projection to clip space with original vertex depth preserved.
- [x] **GLSL Ribbon Fragment Shader ([`src/scene/shaders/polyline_ribbon.frag`](../shaders/polyline_ribbon.frag))**
  - [x] Varyings: `v_side` ($\in [-1, 1]$), `v_progress` ($u \ge 0$).
  - [x] Uniforms: `u_color`, `u_glowColor`, `u_glowIntensity`, `u_time`, `u_dashSpeed`, `u_dashFrequency`.
  - [x] Anti-aliased edge feathering using `fwidth(v_side)` and `smoothstep`.
  - [x] Hot cyan/white core energy beam ($k_{\text{core}} = 16.0$) and atmospheric blue glow halo ($k_{\text{halo}} = 2.5$).
  - [x] Animated directional pulse waves along `v_progress`.
- [x] **Shader Compilation & Registration**
  - [x] Run `npm run generate:shaders` and register in [`shader_registry.ts`](../../webgl/shaders/shader_registry.ts).

---

## Phase 2: Geometry & Material Subsystems

- [x] **Polyline Geometry ([`src/scene/lines/polyline_geometry.ts`](polyline_geometry.ts))**
  - [x] Allocate contiguous interleaved buffer (`a_current`, `a_previous`, `a_next`, `a_sideAndProgress`).
  - [x] Generate triangle strip / indexed quad indices ($[2i, 2i+1, 2i+2, 2i+2, 2i+1, 2i+3]$).
  - [x] Calculate cumulative arc-length distance for `progress`.
  - [x] Extrapolate endpoints $P_{-1}$ and $P_N$.
  - [x] Implement `setPoints(points: readonly Vector3Like[] | Float32Array): this`.
  - [x] Manage GPU buffer recreation or dynamic updating via `GeometryManager`.
- [x] **Polyline Material ([`src/scene/lines/polyline_material.ts`](polyline_material.ts))**
  - [x] Extend `Material` base class with `"polyline_ribbon"` shader key.
  - [x] Configure pipeline defaults: `cullFace: false`, `blendMode: BlendMode.Additive` (or alpha with glow).
  - [x] Implement color getters/setters with `RgbaLike` semantics and internal contiguous buffers.
  - [x] Implement `lineWidth`, `glowIntensity`, `dashSpeed`, `dashFrequency`, `miterLimit` properties with dirty checking.

---

## Phase 3: PolylineInstance & Scene Graph Integration

- [x] **PolylineInstance Implementation ([`src/scene/lines/polyline_instance.ts`](polyline_instance.ts))**
  - [x] Extend `SceneNode` and implement `IPolylineInstance`.
  - [x] Manage `PolylineGeometry` and `PolylineMaterial`.
  - [x] Implement `render(context: RenderContext)`:
    - [x] Pass `u_viewportResolution` from context.
    - [x] Bind material, uniforms, and geometry.
    - [x] Execute `gl.drawElements(gl.TRIANGLES, ...)`.
  - [x] Implement `destroy()` with resource disposal.

---

## Phase 4: Declarative Lit Web Component

- [x] **Lit Web Component (`src/scene/elements/polyline_instance_element.ts`)**
  - [x] Tag: `rj-polyline` (`TAG_RJ_POLYLINE`).
  - [x] Decoratorless Lit properties (`public static override properties = { ... }`).
  - [x] Expose attributes: `points`, `line-width`, `color`, `glow-color`, `dash-speed`.
  - [x] Connect with `<rj-scene>` parent node context.
  - [x] Export in `setup_scene_elements.ts` and define JSX types in `jsx_types.ts`.

---

## Phase 5: Galactic Route Display in GalaxyScene

- [x] **Galactic Route Integration ([`src/galaxy_backdrop/galaxy_scene.tsx`](../galaxy_backdrop/galaxy_scene.tsx))**
  - [x] Define galactic coordinates connecting route waypoints.
  - [x] Embed `<rj-polyline>` in the scene.
  - [x] Place `<rj-sprite-instance>` pins at start, hub, and terminus star waypoints.
