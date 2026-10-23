# Sprite & Billboard Waypoint System Implementation Tasklist

This checklist tracks the implementation of camera-facing 2D/3D billboard sprites and waypoint navigation markers, per [Sprite & Billboard Waypoint System Design](sprite_instance_design.md) and [Working with Vectors and Colors Guidelines](../../project_guidelines/working_with_vectors_and_colors_guidelines.md).

All implementations must strictly separate type definitions (`*_types.ts`), maintain internal contiguous `Float32Array` storage while exposing semantic interfaces (`Vector2Like`, `RgbaLike`), share a single static unit quad buffer, and follow the four-phase subagent protocol.

---

## Phase 1: Type Definitions & Shader Infrastructure

- [x] **Sprite Instance Types ([`src/scene/sprites/sprite_instance_types.ts`](sprite_instance_types.ts))**
  - [x] Define `BillboardMode` enum (`Spherical = 0`, `Cylindrical = 1`).
  - [x] Define `SpriteSizeMode` enum (`ScreenSpace = 0`, `WorldSpace = 1`, `ClampedScreenSpace = 2`).
  - [x] Define `SpriteSizeClamping` interface (`minPixels: number`, `maxPixels: number`).
  - [x] Define `SpriteInstanceOptions` interface (`anchor?`, `size?`, `sizeMode?`, `sizeClamping?`, `billboardMode?`, `material: ISpriteMaterial`).
  - [x] Define `ISpriteInstance` interface extending `IRenderable` with semantic getters/setters (`getAnchor(out?)`, `setAnchor(pos|x, y)`, `getSize(out?)`, `setSize(size|w, h)`), sizing properties, and `readonly geometry: ISpriteGeometry`.
- [x] **Sprite Material Types ([`src/scene/sprites/sprite_material_types.ts`](sprite_material_types.ts))**
  - [x] Define base `ISpriteMaterial` extending `IMaterial` with `getTint(out?)`, `setTint(tint|r, g, b, a?)`, and `alwaysOnTop: boolean`.
  - [x] Define `SpriteMaterialOptions` interface extending `Omit<MaterialOptions, "shaderKey">`.
  - [x] Define `ISpritePinMaterial` extending `ISpriteMaterial` with `getInnerColor(out?)`, `setInnerColor(color|r, g, b, a?)`, `innerRadius: number`, and `haloWidth: number`.
  - [x] Define `SpritePinMaterialOptions` interface.
  - [x] Define `ISpriteTextureMaterial` extending `ISpriteMaterial` with `texture: ITexture | null` and `alphaCutoff: number`.
  - [x] Define `SpriteTextureMaterialOptions` interface.
- [x] **Sprite Geometry Types ([`src/scene/sprites/sprite_geometry_types.ts`](sprite_geometry_types.ts))**
  - [x] Define `ISpriteGeometry` interface extending `IMeshGeometry` with `readonly isShared: boolean`.
- [x] **Shader Key Registration ([`src/webgl/shaders/shader_types.ts`](../../webgl/shaders/shader_types.ts))**
  - [x] Register `"sprite_sdf_pin"` and `"sprite_texture"` shader keys in shader key union/types.
- [x] **GLSL Billboard Vertex Shader ([`src/scene/shaders/sprite_billboard.vert`](../shaders/sprite_billboard.vert))**
  - [x] Implement camera right ($\mathbf{R}$) and up ($\mathbf{U}$) basis vector extraction from view matrix for Spherical mode.
  - [x] Implement world-up $\mathbf{U}_{\text{world}} = [0, 1, 0]$ and horizontal perpendicular $\mathbf{R} = \text{normalize}(\mathbf{U}_{\text{world}} \times \mathbf{F})$ for Cylindrical mode.
  - [x] Implement `SpriteSizeMode.ScreenSpace`: perspective division cancellation via homogeneous anchor coordinate extrusion ($\Delta \mathbf{c}_{\text{clip}} \cdot \mathbf{c}_{\text{anchor}}.w$).
  - [x] Implement `SpriteSizeMode.WorldSpace`: camera view-space offset extrusion.
  - [x] Implement `SpriteSizeMode.ClampedScreenSpace`: distance-based scaling clamped between `u_minPixels` and `u_maxPixels`.
  - [x] Apply normalized anchor $(\alpha_x, \alpha_y)$ local corner offsets.
  - [x] Pass interpolated UV coordinates $[(0, 0) \to (1, 1)]$ to fragment shader.
- [x] **GLSL Procedural SDF Pin Fragment Shader ([`src/scene/shaders/sprite_sdf_pin.frag`](../shaders/sprite_sdf_pin.frag))**
  - [x] Implement head circle SDF: $d_{\text{circle}} = \|p - c\| - r$.
  - [x] Implement tapered tip wedge SDF: 2D isosceles triangle pointing to anchor $(0, 0)$.
  - [x] Combine pin body SDF: $d_{\text{pin}} = \min(d_{\text{circle}}, d_{\text{wedge}})$.
  - [x] Implement inner dot SDF: $d_{\text{inner}} = \|p - c\| - r_{\text{inner}}$.
  - [x] Implement anti-aliased edge smoothstep via screen-space derivatives.
  - [x] Blend `u_tintColor`, `u_innerDotColor`, and soft halo/drop shadow exponential falloff.
- [x] **GLSL Texture Billboard Fragment Shader ([`src/scene/shaders/sprite_texture.frag`](../shaders/sprite_texture.frag))**
  - [x] Implement 2D texture sampling via `u_texture` and `v_uv`.
  - [x] Apply color modulation with `u_tintColor`.
  - [x] Implement alpha discard threshold (`fragColor.a < u_alphaCutoff`).

---

## Phase 2: Geometry & Material Subsystems

- [x] **Shared Unit Quad Geometry ([`src/scene/sprites/sprite_geometry.ts`](sprite_geometry.ts))**
  - [x] Allocate static 4-vertex, 6-index unit quad buffer (`[0, 1, 2, 0, 2, 3]`).
  - [x] Implement `SpriteGeometry.getSharedQuad()` singleton factory.
  - [x] Configure attributes: 2D vertex coordinates $[(0, 0), (1, 0), (1, 1), (0, 1)]$ and UVs.
  - [x] Implement disposal logic ensuring shared GPU buffer is disposed only on full context teardown.
  - [x] Unit tests in [`src/scene/sprites/sprite_geometry.test.ts`](sprite_geometry.test.ts).
- [x] **Base Sprite Material ([`src/scene/sprites/sprite_material.ts`](sprite_material.ts))**
  - [x] Extend `Material` base class.
  - [x] Configure pipeline defaults: `cullFace: false` (two-sided safety against negative scales), `blendMode: BlendMode.Alpha`.
  - [x] Store `private readonly _tint: Float32Array = new Float32Array([1, 1, 1, 1])`.
  - [x] Implement `getTint(out?: RgbaLike): RgbaLike`.
  - [x] Implement `setTint(tint: RgbaLike): this` and `setTint(r, g, b, a?): this` with dirty checking.
  - [x] Implement `alwaysOnTop: boolean` getter and setter (toggling `depthTest: false` and overlay render order).
  - [x] Unit tests in [`src/scene/sprites/sprite_material.test.ts`](sprite_material.test.ts).
- [x] **Procedural SDF Pin Material ([`src/scene/sprites/sprite_pin_material.ts`](sprite_pin_material.ts))**
  - [x] Extend `SpriteMaterial` with `"sprite_sdf_pin"` shader key.
  - [x] Store `private readonly _innerColor: Float32Array = new Float32Array([1, 1, 1, 1])`.
  - [x] Implement `getInnerColor(out?: RgbaLike): RgbaLike`.
  - [x] Implement `setInnerColor(color: RgbaLike): this` and `setInnerColor(r, g, b, a?): this` with dirty checking.
  - [x] Implement `innerRadius: number` and `haloWidth: number` property accessors and uniform caching.
  - [x] Unit tests in [`src/scene/sprites/sprite_pin_material.test.ts`](sprite_pin_material.test.ts).
- [x] **Texture Billboard Material ([`src/scene/sprites/sprite_texture_material.ts`](sprite_texture_material.ts))**
  - [x] Extend `SpriteMaterial` with `"sprite_texture"` shader key.
  - [x] Implement `texture: ITexture | null` accessor bound to `TextureUnit.Color`.
  - [x] Implement `alphaCutoff: number` accessor and uniform mapping.
  - [x] Unit tests in [`src/scene/sprites/sprite_texture_material.test.ts`](sprite_texture_material.test.ts).

---

## Phase 3: SpriteInstance & Scene Graph Integration

- [x] **SpriteInstance Implementation ([`src/scene/sprites/sprite_instance.ts`](sprite_instance.ts))**
  - [x] Extend `SceneNode` and implement `ISpriteInstance`.
  - [x] Store `private readonly _anchor: Float32Array = new Float32Array([0.5, 0.0])`.
  - [x] Store `private readonly _size: Float32Array = new Float32Array([32.0, 32.0])`.
  - [x] Implement `getAnchor(out?: Vector2Like): Vector2Like`.
  - [x] Implement `setAnchor(anchor: Vector2Like): this` and `setAnchor(x, y): this` with dirty checking.
  - [x] Implement `getSize(out?: Vector2Like): Vector2Like`.
  - [x] Implement `setSize(size: Vector2Like): this` and `setSize(width, height): this` with dirty checking.
  - [x] Implement `sizeMode`, `sizeClamping`, and `billboardMode` properties.
  - [x] Bind shared quad geometry via `SpriteGeometry.getSharedQuad()`.
  - [x] Implement `render(context: RenderContext): void`:
    - [x] Bind material and pipeline state.
    - [x] Upload `u_anchor` (`gl.uniform2fv`) and `u_size` (`gl.uniform2fv`) with zero allocations.
    - [x] Pass billboard mode and sizing mode uniforms.
    - [x] Pass viewport dimensions from context.
    - [x] Execute draw call with shared quad VBO.
  - [x] Implement `destroy()`: clean up references without disposing shared geometry prematurely.
  - [x] Unit tests in [`src/scene/sprites/sprite_instance.test.ts`](sprite_instance.test.ts).

---

## Phase 4: Verification, Quality Gate, & Documentation

- [ ] **Full Test Suite & Quality Gate**
  - [x] Run type check: `npm run typecheck` (`tsc --noEmit`).
  - [x] Run linter: `npm run lint` across all newly created modules.
  - [x] Run smoke tests: `npm run test:smoke`.
  - [ ] Run full test suite: `npm test`.
  - [ ] Verify production build: `npm run build`.
- [ ] **Documentation & Cross-Linking**
  - [x] Ensure all markdown links in design documents and tasklists use repository-relative paths.
  - [ ] Update [AGENTS.md](../../../AGENTS.md) guideline reference index if appropriate.
