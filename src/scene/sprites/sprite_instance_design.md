# Sprite & Billboard Waypoint System Design

## 1. Executive Summary & Design Goals

### Overview
This document specifies the architectural design for camera-facing 2D/3D billboard sprites in the rendering engine, formalized through **`SpriteInstance`**. While standard 3D meshes maintain fixed world-space orientations, billboard sprites continuously orient themselves toward the camera viewpoint. 

The primary catalyst for this subsystem is displaying **waypoint markers**—such as high-visibility "Red Pins" indicating origin, destination, and points of interest along a 3D galactic navigation route. Beyond navigation pins, this subsystem provides the foundation for target reticles, celestial lens flares, floating HUD tags, and stellar markers.

### Key Architectural Principles
- **Configurable Normalized Anchor:** Quad vertices are defined relative to a continuous normalized 2D anchor point $(\alpha_x, \alpha_y) \in [0, 1]^2$. For a map pin, an anchor of $(0.5, 0.0)$ anchors the bottom tip precisely at the 3D target coordinates, while allowing other entities to anchor at center $(0.5, 0.5)$ or arbitrary pivots.
- **Versatile Sizing Modes:** Supports three distinct size paradigms via `SpriteSizeMode`: fixed screen-space pixels (default for navigation pins), true world units, and distance-clamped screen pixels.
- **Shared Static Unit Quad Geometry:** All billboard instances share a single, static unit quad buffer (4 vertices, 6 indices) allocated once on the GPU, avoiding per-instance VBO memory allocations and eliminating point-sprite aspect ratio and hardware size limits.
- **Unified Vertex Transformation:** All billboards utilize a single shared vertex shader (`sprite_billboard.vert`) handling spherical/cylindrical billboarding, anchor offsets, and sizing projections.
- **Divergent Material Specializations:** Decouples procedural Signed Distance Field (SDF) pins and sampled texture billboards into separate, specialized materials (`SpritePinMaterial` and `SpriteTextureMaterial`) extending a shared `SpriteMaterial` base. Eliminates runtime shader branching and property pollution.
- **Flexible Occlusion, Depth, & Two-Sided Safety:** Provides clear execution pathways for standard depth testing and always-on-top rendering. Defaults to two-sided rendering (`cullFace: false`) to safeguard against negative scale mirroring.
- **Strict Vector & Color Standards:** Adheres to [working_with_vectors_and_colors_guidelines.md](../../project_guidelines/working_with_vectors_and_colors_guidelines.md): public interfaces expose explicit semantic objects ([`Vector2Like`](../../maths/vector_types.ts) for anchor/size, [`RgbaLike`](../../helpers/colors_types.ts) for tint/color), while internal storage uses contiguous `Float32Array` buffers for zero-allocation WebGL uniform uploads.
- **First-Class Scene Citizen:** Extends [`SceneNode`](../core/scene_node.ts) and implements [`IRenderable`](../core/renderable_types.ts), enabling transformation hierarchies, parenting to moving star nodes, and seamless rendering via [`SceneRenderer`](../renderer/scene_renderer.ts).

---

## 2. System Architecture & Component Flow

```mermaid
flowchart TD
    subgraph SceneGraph ["Scene Graph Hierarchy"]
        StarNode["SceneNode (Parent Star)"]
        SpriteNode["SpriteInstance (SceneNode + IRenderable)"]
        StarNode --> SpriteNode
    end

    subgraph SpriteComponents ["Sprite Internal Components"]
        Geom["SpriteGeometry (Shared Static Unit Quad VBO)"]
        BaseMat["ISpriteMaterial (Base Billboard Pipeline State)"]
        PinMat["SpritePinMaterial (Procedural SDF Pin)"]
        TexMat["SpriteTextureMaterial (Sampled Texture)"]
        BaseMat --> PinMat
        BaseMat --> TexMat
        SpriteNode --> Geom
        SpriteNode -->|"material: ISpriteMaterial"| BaseMat
    end

    subgraph Shaders ["Shader Pipeline"]
        VertShader["sprite_billboard.vert (Shared Extrusion Math)"]
        FragPin["sprite_sdf_pin.frag (Procedural SDF Math)"]
        FragTex["sprite_texture.frag (Texture Sampling & Cutoff)"]
        PinMat --> VertShader
        PinMat --> FragPin
        TexMat --> VertShader
        TexMat --> FragTex
    end

    subgraph RendererContext ["Scene Renderer Pipeline"]
        Pipeline["SceneRenderer"]
        Camera["Camera (View & Projection Matrices)"]
        Dimensions["CanvasDimensions (Viewport Width & Height)"]
        Pipeline -->|"Executes .render(context)"| SpriteNode
        Camera -.-> SpriteNode
        Dimensions -.-> SpriteNode
    end
```

---

## 3. Normalized Anchor Point Mechanics

### Definition & Space Coordinates
A sprite's anchor defines the pivot point on the sprite's $2\text{D}$ plane that coincides exactly with the 3D position of the `SpriteInstance`'s world transform:

- $(\alpha_x, \alpha_y) = (0.5, 0.0)$: Bottom-center tip (Standard map pin touching a star).
- $(\alpha_x, \alpha_y) = (0.5, 0.5)$: Center-center (Star flare, circular reticle, particle).
- $(\alpha_x, \alpha_y) = (0.0, 1.0)$: Top-left (Dropdown tooltip, contextual callout box).

```
   (0, 1) +-------------------------+ (1, 1)
          |                         |
          |     (0.5, 0.5) Center   |
          |            +            |
          |                         |
          |                         |
          +------------+------------+ (1, 0)
   (0, 0)        (0.5, 0.0) Tip Anchor
                       * (3D Scene Position)
```

### Local Vertex Offsets
Given sprite dimensions $(w, h)$ and anchor coordinates $(\alpha_x, \alpha_y)$, the four bounding corner positions in the sprite's local 2D plane are computed as:

- Bottom-Left ($v_0$): $x_0 = -\alpha_x \cdot w, \quad y_0 = -\alpha_y \cdot h$
- Bottom-Right ($v_1$): $x_1 = (1 - \alpha_x) \cdot w, \quad y_1 = -\alpha_y \cdot h$
- Top-Right ($v_2$): $x_2 = (1 - \alpha_x) \cdot w, \quad y_2 = (1 - \alpha_y) \cdot h$
- Top-Left ($v_3$): $x_3 = -\alpha_x \cdot w, \quad y_3 = (1 - \alpha_y) \cdot h$

Because UV coordinates remain fixed $[(0, 0), (1, 0), (1, 1), (0, 1)]$, the anchor transformation can either be baked into a CPU-side unit quad buffer or evaluated in the vertex shader by passing the anchor vector as a uniform.

---

## 4. Billboard Modes & Orientation Mathematics

The orientation behavior is controlled by the strongly-typed enum `BillboardMode`:

```typescript
export enum BillboardMode {
    /** Quad rotates freely across all axes to directly face the camera lens plane */
    Spherical = 0,
    /** Quad rotates exclusively around the world Y-axis, remaining upright */
    Cylindrical = 1,
}
```

### Spherical Billboarding (View-Plane Aligned)
Spherical billboarding ensures the sprite faces the camera squarely, preventing distortion when the camera tilts, pitches, or rolls around galactic waypoints:

- **Algorithm via Model-View Matrix Deconstruction:**
  Given camera view matrix $\mathbf{V}$ and node world transform $\mathbf{M}_{\text{world}}$, the composite model-view matrix is $\mathbf{MV} = \mathbf{V} \cdot \mathbf{M}_{\text{world}}$.
  The upper $3\times 3$ portion of $\mathbf{MV}$ encodes rotation and scale. To cancel all rotation while preserving node scaling:
  $$\mathbf{MV}_{\text{billboard}}[0, 0] = \|\mathbf{M}_{\text{col0}}\|, \quad \mathbf{MV}_{\text{billboard}}[1, 1] = \|\mathbf{M}_{\text{col1}}\|, \quad \mathbf{MV}_{\text{billboard}}[2, 2] = \|\mathbf{M}_{\text{col2}}\|$$
  All other non-diagonal entries in the upper $3\times 3$ are set to $0$.

- **Algorithm via Camera Basis Vectors:**
  Alternatively, in the vertex shader, extract camera right vector $\mathbf{R}_{\text{cam}}$ and up vector $\mathbf{U}_{\text{cam}}$ from the view matrix:
  $$\mathbf{p}_{\text{world}} = \mathbf{p}_{\text{anchor}} + (x_{\text{local}} \cdot \mathbf{R}_{\text{cam}}) + (y_{\text{local}} \cdot \mathbf{U}_{\text{cam}})$$

### Cylindrical Billboarding (Axial / World-Up Aligned)
When waypoint pins must stand upright relative to the galactic plane (the world Y-axis):
1. Extract the vector from camera to anchor: $\mathbf{F} = \text{normalize}(\mathbf{p}_{\text{anchor}} - \mathbf{p}_{\text{camera}})$.
2. Define world up: $\mathbf{U}_{\text{world}} = \begin{bmatrix} 0 \\ 1 \\ 0 \end{bmatrix}$.
3. Compute horizontal billboard right vector: $\mathbf{R} = \text{normalize}(\mathbf{U}_{\text{world}} \times \mathbf{F})$.
4. Recompute true facing normal: $\mathbf{N} = \mathbf{R} \times \mathbf{U}_{\text{world}}$.
5. Position: $\mathbf{p}_{\text{world}} = \mathbf{p}_{\text{anchor}} + (x_{\text{local}} \cdot \mathbf{R}) + (y_{\text{local}} \cdot \mathbf{U}_{\text{world}})$.

---

## 5. Sizing Modes & Scaling Algorithms

Sprite sizing is governed by `SpriteSizeMode`:

```typescript
export enum SpriteSizeMode {
    /** Fixed dimension in screen pixels regardless of camera distance (Default) */
    ScreenSpace = 0,
    /** Sized in 3D world units, scaling with perspective distance */
    WorldSpace = 1,
    /** Scales with perspective distance, but clamped between min and max pixel bounds */
    ClampedScreenSpace = 2,
}
```

### Mode 1: Fixed Screen-Space Pixels (`SpriteSizeMode.ScreenSpace`) — Default
Maintains constant, readable dimensions (e.g. $36\text{px} \times 48\text{px}$) across the entire galactic zoom range.

- **Vertex Shader Formulation:**
  1. Project the 3D anchor position to homogeneous clip space:
     $$\mathbf{c}_{\text{anchor}} = \mathbf{P}_{\text{proj}} \cdot \mathbf{V}_{\text{view}} \cdot \mathbf{M}_{\text{world}} \cdot \begin{bmatrix} 0 \\ 0 \\ 0 \\ 1 \end{bmatrix}$$
  2. Compute screen pixel offset vector using viewport resolution $(\text{res}_x, \text{res}_y)$:
     $$\Delta x_{\text{clip}} = \frac{2 \cdot x_{\text{local}}}{\text{res}_x} \cdot \mathbf{c}_{\text{anchor}}.w, \quad \Delta y_{\text{clip}} = \frac{2 \cdot y_{\text{local}}}{\text{res}_y} \cdot \mathbf{c}_{\text{anchor}}.w$$
  3. Output final clip position:
     $$\mathbf{c}_{\text{final}} = \begin{bmatrix} \mathbf{c}_{\text{anchor}}.x + \Delta x_{\text{clip}} \\ \mathbf{c}_{\text{anchor}}.y + \Delta y_{\text{clip}} \\ \mathbf{c}_{\text{anchor}}.z \\ \mathbf{c}_{\text{anchor}}.w \end{bmatrix}$$
  *Notice:* Multiplying by $\mathbf{c}_{\text{anchor}}.w$ cancels out the perspective division ($\div w$) that the GPU performs during rasterization, guaranteeing exact pixel dimensions!

### Mode 2: World-Space Units (`SpriteSizeMode.WorldSpace`)
The sprite behaves like physical scene geometry. Dimensions $(w, h)$ are measured in world units, expanding when close and shrinking to sub-pixel points when distant.
- Vertex position:
  $$\mathbf{v}_{\text{view}} = (\mathbf{V}_{\text{view}} \cdot \mathbf{p}_{\text{anchor}}).xyz + \begin{bmatrix} x_{\text{local}} \\ y_{\text{local}} \\ 0 \end{bmatrix}$$
  $$\mathbf{c}_{\text{final}} = \mathbf{P}_{\text{proj}} \cdot \begin{bmatrix} \mathbf{v}_{\text{view}} \\ 1 \end{bmatrix}$$

### Mode 3: Clamped Screen Space (`SpriteSizeMode.ClampedScreenSpace`)
Scales with distance, but clamps between a minimum pixel size (e.g. 16px) and maximum pixel size (e.g. 96px).
- Compute apparent pixel size at current distance $d = \|\mathbf{p}_{\text{anchor}} - \mathbf{p}_{\text{cam}}\|$.
- $\text{scale} = \text{clamp}\left(\frac{\text{baseSize} \cdot \text{focalLength}}{d}, \text{minPixels}, \text{maxPixels}\right) / \text{baseSize}$.
- Apply $\text{scale}$ to the screen-space extrusion calculation.

---

## 6. Occlusion, Depth, & Rasterization Strategies

Waypoint navigation markers must handle depth gracefully. Three operational modes are supported:

### Behavior A: Standard Depth Testing
- **Configuration:** `depthTest: true, depthWrite: false`.
- **Render Queue:** Transparent (`renderOrder >= 1000`).
- **Result:** Waypoint pins occlude naturally when behind planets, stars, or volumetric nebulas. When in front, they render cleanly over the background.

### Behavior B: Always-On-Top
- **Configuration:** `depthTest: false, depthWrite: false`.
- **Render Queue:** Overlay (`renderOrder >= 5000`).
- **Result:** Pins are unconditionally visible, rendering on top of all celestial bodies. Ideal for global map navigation when the user must locate destinations anywhere in the galaxy.

### Behavior C: Multi-Pass X-Ray Ghost Outline (Deferred Architecture)
In navigation systems, viewing a waypoint through celestial bodies via a ghost outline or silhouette requires a multi-pass technique (Pass 1 occluded with `gl.GREATER`, Pass 2 visible with `gl.LEQUAL`). Because the current `SceneRenderer` pipeline organizes draw calls around single-pass `render(context)` invocations, full multi-pass orchestration will be specified in a dedicated future multi-pass rendering architecture design document. For initial implementation, `SpriteInstance` will support **Behavior A (Standard Depth Testing)** and **Behavior B (Always-On-Top)**.

### Backface Culling Default (`cullFace: false`)
- **Safety Against Negative Scale / Mirroring:** Billboard materials default to `cullFace: false`. While billboards continuously rotate toward the camera, flipping an axis (e.g. `scale.x < 0` or negative sprite width for mirroring) inverts triangle winding from Counter-Clockwise (CCW) to Clockwise (CW). Disabling culling guarantees flipped sprites or cameras crossing through the anchor point never vanish.
- **Zero Rasterizer Waste:** Because correctly oriented billboards face the camera, $100\%$ of the quad surface is front-facing; culling provides zero rasterization savings.

---

## 7. Geometry & Shading Subsystems

### 1. Shared Unit Quad Geometry & Unified Vertex Shader
All billboard sprites in the engine share a single, globally allocated static unit quad buffer (`SpriteGeometry.getSharedQuad()`) consisting of 4 vertices and 6 indices (`[0, 1, 2, 0, 2, 3]`).

- **Why Not Point Sprites (`gl.POINTS`)?** Hardware point sprites are constrained to 1:1 square aspect ratios (wasting fill-rate on tall navigation pins), suffer from vendor-specific max point size clamping (often 64px or 128px on mobile/integrated GPUs), and clip abruptly when their center point passes outside the frustum. A shared unit quad supports arbitrary rectangular dimensions, custom anchor offsets, and seamless clipping with zero per-instance GPU buffer overhead.
- **Unified Vertex Shader (`sprite_billboard.vert`):** Both procedural pins and textured sprites share the identical vertex shader. The vertex shader performs:
  1. Transforming the anchor position to camera view or clip space.
  2. Extruding quad corners according to `anchor`, `size`, `sizeMode`, and `billboardMode` (Spherical vs. Cylindrical).
  3. Interpolating standard UV coordinates $[(0, 0) \to (1, 1)]$ across the rasterized quad.

### 2. Procedural SDF Pin Material (`SpritePinMaterial`)
Drawing the waypoint pin via 2D Signed Distance Fields in fragment shader `sprite_sdf_pin.frag` eliminates external image dependencies, delivers perfect resolution independence, and allows dynamic styling through uniforms.

```
       ,---.
      /     \    <-- Circle: ||p - c|| - r
     |   o   |   <-- Inner Dot: ||p - c|| - r_inner
      \     /
       \   /     <-- Tapered Wedge: Isosceles triangle SDF
        \ /
         V       <-- Tip Anchor at (0, 0)
```

- **SDF Mathematical Primitives:**
  In fragment coordinates normalized to $p \in [-0.5, 0.5] \times [0, 1.0]$:
  1. **Head Circle Center:** $c = (0.0, 0.65)$, radius $r = 0.32$.
     $$d_{\text{circle}} = \|p - c\| - r$$
  2. **Tapered Tip Wedge:** Signed distance to a 2D isosceles triangle pointing to $(0, 0)$ and merging smoothly with the head circle.
  3. **Pin Body SDF:**
     $$d_{\text{pin}} = \min(d_{\text{circle}}, d_{\text{wedge}})$$
  4. **Inner White Dot:**
     $$d_{\text{inner}} = \|p - c\| - 0.12$$
- **Fragment Shading & Antialiasing:**
  - Pin boundary anti-aliased via `smoothstep(0.0, -pixelDelta, d_pin)`.
  - Color blending:
    - Base Pin: `u_tintColor` (e.g. Red `[1.0, 0.15, 0.15, 1.0]`).
    - Inner Dot: `u_innerDotColor` (e.g. White `[1.0, 1.0, 1.0, 1.0]`).
    - Halo / Drop Shadow: Exponential falloff outside $d_{\text{pin}} > 0$.

### 3. Textured Billboard Material (`SpriteTextureMaterial`)
When custom artwork (e.g. checkered flags, military insignia, or UI iconography) is desired:
- **Material Binding:**
  - Shader: `sprite_texture.frag` with texture sampler `u_texture` bound to `TextureUnit.Color`.
- **Sampling & Tinting:**
  $$\mathbf{C}_{\text{tex}} = \text{texture}(\text{u\_texture}, \mathbf{v\_uv})$$
  $$\mathbf{C}_{\text{final}} = \mathbf{C}_{\text{tex}} \times \text{u\_tintColor}$$
- **Alpha Discard:**
  - Fragments with $\mathbf{C}_{\text{final}}.a < \text{u\_alphaThreshold}$ (e.g. $0.01$) are discarded via `discard` to avoid transparent blending depth-sorting artifacts.

---

## 8. Vector & Color Memory Architecture

In strict compliance with [working_with_vectors_and_colors_guidelines.md](../../project_guidelines/working_with_vectors_and_colors_guidelines.md), all spatial vectors and color properties maintain a strict boundary between internal native contiguity and public explicit semantic interfaces:

### Internal Native Contiguity (`Float32Array`)
Classes store spatial and color components in private, contiguous typed arrays:
- **`SpriteInstance`**:
  - `private readonly _anchor: Float32Array = new Float32Array([0.5, 0.0]);`
  - `private readonly _size: Float32Array = new Float32Array([32.0, 32.0]);`
- **`SpriteMaterial`**:
  - `private readonly _tint: Float32Array = new Float32Array([1.0, 1.0, 1.0, 1.0]);`
- **`SpritePinMaterial`**:
  - `private readonly _innerColor: Float32Array = new Float32Array([1.0, 1.0, 1.0, 1.0]);`

### Zero-Allocation WebGL Uniform Handoff
Storing components as contiguous `Float32Array` buffers enables direct WebGL uniform uploads during per-frame rendering without creating temporary wrapper objects or arrays:
```typescript
gl.uniform2fv(u_anchorLocation, this._anchor);
gl.uniform2fv(u_sizeLocation, this._size);
gl.uniform4fv(u_tintLocation, this._tint);
gl.uniform4fv(u_innerColorLocation, this._innerColor);
```

### Public Semantic Getters & Zero-Allocation Target-Out
Public getters return safe copies conforming to explicit interfaces ([`Vector2Like`](../../maths/vector_types.ts) and [`RgbaLike`](../../helpers/colors_types.ts)), preventing external callers from mutating private memory buffers. High-frequency loops can pass an optional `out` target object to eliminate GC allocations entirely:
```typescript
public getAnchor(out?: Vector2Like): Vector2Like {
    if (out) {
        out.x = this._anchor[0];
        out.y = this._anchor[1];
        return out;
    }
    return { x: this._anchor[0], y: this._anchor[1] };
}
```

### Overloaded Setters & Change Detection
Setters accept semantic objects or individual scalar numbers. Internal buffers are only mutated and marked dirty if incoming values differ from current contents:
```typescript
public setSize(size: Vector2Like): this;
public setSize(width: number, height: number): this;
public setSize(wOrSize: number | Vector2Like, h?: number): this {
    const w = typeof wOrSize === "number" ? wOrSize : wOrSize.x;
    const height = typeof wOrSize === "number" ? (h ?? wOrSize) : wOrSize.y;

    if (this._size[0] !== w || this._size[1] !== height) {
        this._size[0] = w;
        this._size[1] = height;
        this.markDirty();
    }
    return this;
}
```

### Clean Separation of Concerns
Visual appearance parameters (such as `tint`) reside strictly on `SpriteMaterial` rather than duplicating them onto `SpriteInstance`. This preserves clear scene graph boundaries between spatial node positioning and shader pipeline appearance.

---

## 9. TypeScript Interface Specifications

### Sprite Enums & Types (`src/scene/sprites/sprite_instance_types.ts`)

```typescript
import type { IRenderable } from "../core/renderable_types";
import type { Vector2Like } from "../../maths/vector_types";
import type { ISpriteMaterial } from "./sprite_material_types";
import type { ISpriteGeometry } from "./sprite_geometry_types";

export enum BillboardMode {
    Spherical = 0,
    Cylindrical = 1,
}

export enum SpriteSizeMode {
    ScreenSpace = 0,
    WorldSpace = 1,
    ClampedScreenSpace = 2,
}

export interface SpriteSizeClamping {
    minPixels: number;
    maxPixels: number;
}

export interface SpriteInstanceOptions {
    /** Normalized 2D anchor pivot point (default: { x: 0.5, y: 0.0 } for pins) */
    anchor?: Vector2Like;

    /** Dimensions: [width, height] in screen pixels or world units (default: { x: 32, y: 32 }) */
    size?: Vector2Like;

    /** Active sizing paradigm (default: SpriteSizeMode.ScreenSpace) */
    sizeMode?: SpriteSizeMode;

    /** Sizing bounds when using SpriteSizeMode.ClampedScreenSpace */
    sizeClamping?: SpriteSizeClamping;

    /** Billboarding rotation constraint (default: BillboardMode.Spherical) */
    billboardMode?: BillboardMode;

    /** Active visual appearance material */
    material: ISpriteMaterial;
}

export interface ISpriteInstance extends IRenderable {
    /** Normalized 2D anchor pivot point */
    getAnchor(out?: Vector2Like): Vector2Like;
    setAnchor(anchor: Vector2Like): this;
    setAnchor(x: number, y: number): this;

    /** Dimensions: width and height in screen pixels or world units */
    getSize(out?: Vector2Like): Vector2Like;
    setSize(size: Vector2Like): this;
    setSize(width: number, height: number): this;

    /** Active sizing paradigm (default: SpriteSizeMode.ScreenSpace) */
    sizeMode: SpriteSizeMode;

    /** Sizing bounds when using SpriteSizeMode.ClampedScreenSpace */
    sizeClamping?: SpriteSizeClamping;

    /** Billboarding rotation constraint (default: BillboardMode.Spherical) */
    billboardMode: BillboardMode;

    /** Active visual appearance material (e.g. SpritePinMaterial or SpriteTextureMaterial) */
    material: ISpriteMaterial;

    /** Shared static geometry quad descriptor */
    readonly geometry: ISpriteGeometry;
}
```

### Material Types (`src/scene/sprites/sprite_material_types.ts`)

```typescript
import type { IMaterial, MaterialOptions } from "../materials/material_types";
import type { RgbaLike } from "../../helpers/colors_types";
import type { ITexture2D } from "../../webgl/textures/texture_types";

/**
 * Base contract for camera-facing billboard sprite materials.
 */
export interface ISpriteMaterial extends IMaterial {
    /** Color tint multiplied against the sprite output */
    getTint(out?: RgbaLike): RgbaLike;
    setTint(tint: RgbaLike): this;
    setTint(r: number, g: number, b: number, a?: number): this;

    /** Convenience toggle for depth testing / overlay queue placement */
    alwaysOnTop: boolean;
}

/**
 * Common configuration options for initializing any SpriteMaterial.
 */
export interface SpriteMaterialOptions extends Omit<MaterialOptions, "shaderKey"> {
    tint?: RgbaLike;
    alwaysOnTop?: boolean;
}

/**
 * Contract for mathematically rendered procedural Signed Distance Field (SDF) pins.
 */
export interface ISpritePinMaterial extends ISpriteMaterial {
    /** Color of the inner circular core indicator */
    getInnerColor(out?: RgbaLike): RgbaLike;
    setInnerColor(color: RgbaLike): this;
    setInnerColor(r: number, g: number, b: number, a?: number): this;

    /** Normalized radius of the inner circular core indicator */
    innerRadius: number;

    /** Soft drop shadow / glow halo width outside the pin perimeter */
    haloWidth: number;
}

export interface SpritePinMaterialOptions extends SpriteMaterialOptions {
    innerColor?: RgbaLike;
    innerRadius?: number;
    haloWidth?: number;
}

/**
 * Contract for raster textured billboard sprites.
 */
export interface ISpriteTextureMaterial extends ISpriteMaterial {
    /** 2D texture bound to TextureUnit.Color */
    texture: ITexture2D | null;

    /** Cutoff alpha threshold below which fragments are discarded */
    alphaCutoff: number;
}

export interface SpriteTextureMaterialOptions extends SpriteMaterialOptions {
    texture?: ITexture2D | null;
    alphaCutoff?: number;
}
```

### Geometry Types (`src/scene/sprites/sprite_geometry_types.ts`)

```typescript
import type { IGeometry } from "../geometry/geometry_types";

/**
 * Contract for static billboard quad geometry.
 */
export interface ISpriteGeometry extends IGeometry {
    /** Whether this geometry references the globally shared unit quad buffer */
    readonly isShared: boolean;
}
```

---

## 10. Implementation Roadmap & Steps

- **Step 1: Type Definitions (`src/scene/sprites/`)**
  - Author `sprite_instance_types.ts`, `sprite_material_types.ts`, and `sprite_geometry_types.ts`.
- **Step 2: Shared Unit Quad Geometry (`src/scene/sprites/sprite_geometry.ts`)**
  - Implement static shared unit quad geometry (`SpriteGeometry.getSharedQuad()`) with zero per-instance buffer allocations.
- **Step 3: GLSL Billboard Shaders (`src/scene/shaders/`)**
  - `sprite_billboard.vert`: Viewport-aware screen-space and world-space billboarding extrusion shared across all sprite types.
  - `sprite_sdf_pin.frag`: Procedural SDF pin evaluation with antialiasing, inner dot, and halo shadow.
  - `sprite_texture.frag`: Clean 2D texture sampling with tinting and alpha cutoff discard.
- **Step 4: Material Subsystem Implementation**
  - `SpriteMaterial`: Base billboard material extending `Material`, configuring `cullFace: false`, `blendMode: BlendMode.Alpha`, `_tint: Float32Array(4)`, and `alwaysOnTop` depth state.
  - `SpritePinMaterial`: Specialization for procedural SDF pin rendering with `_innerColor: Float32Array(4)` and halo uniforms.
  - `SpriteTextureMaterial`: Specialization for texture mapping with `TextureUnit.Color` binding and alpha discard.
- **Step 5: SpriteInstance Integration (`src/scene/sprites/sprite_instance.ts`)**
  - Scene graph integration extending `SceneNode` and implementing `IRenderable`, storing `_anchor: Float32Array(2)` and `_size: Float32Array(2)`, binding shared quad geometry and polymorphic `ISpriteMaterial`.
- **Step 6: Testing & Quality Gate**
  - Comprehensive unit test suites asserting anchor math, matrix unrotation, sizing clamp calculations, vector/color getter safe copies and target-out reuse, material pipeline defaults, and deterministic disposal contracts.
