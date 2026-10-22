# Vector and Color Interface Migration Tasklist

This checklist tracks the incremental refactoring to standardize vector and color interfaces across the codebase, per [Working with Vectors and Colors Guidelines](working_with_vectors_and_colors_guidelines.md).

The migration decouples internal typed array storage (`Float32Array`) from public semantic interfaces (`Vector2Like`, `Vector3Like`, `Vector4Like`, `RgbLike`, `RgbaLike`), eliminating component confusion and strengthening compile-time safety.

---

## Phase 1: Foundational Math & Color Types

- [x] **Vector Types ([`src/maths/vector_types.ts`](../maths/vector_types.ts))**
  - [x] Add `Vector4Like { x: number; y: number; z: number; w: number; }` and `ReadonlyVector4Like`.
  - [x] Remove deprecated backwards-compatibility alias `export type Vector2 = Vector2Like;`.
  - [x] Update any consumers importing `Vector2` to import `Vector2Like`.
- [x] **Color Types ([`src/helpers/colors_types.ts`](../helpers/colors_types.ts))**
  - [x] Add `RgbLike { r: number; g: number; b: number; }` and `ReadonlyRgbLike`.
  - [x] Add `RgbaLike { r: number; g: number; b: number; a: number; }` and `ReadonlyRgbaLike`.
  - [x] Preserve `NormalizedRgbTuple` and `NormalizedRgbaTuple` strictly for internal buffer serialization.
- [x] **Color Helpers & Utilities ([`src/helpers/colors.ts`](../helpers/colors.ts))**
  - [x] Implement `rgbLikeToHex(rgb: RgbLike): string`.
  - [x] Implement `rgbaLikeToHex(rgba: RgbaLike): string`.
  - [x] Implement `hexToRgbLike(hex: string): RgbLike`.
  - [x] Implement `hexToRgbaLike(hex: string): RgbaLike`.
  - [x] Implement `rgbLikeToTuple(rgb: RgbLike): NormalizedRgbTuple`.
  - [x] Implement `rgbaLikeToTuple(rgba: RgbaLike): NormalizedRgbaTuple`.
  - [x] Implement `tupleToRgbLike(tuple: NormalizedRgbTuple): RgbLike`.
  - [x] Implement `tupleToRgbaLike(tuple: NormalizedRgbaTuple): RgbaLike`.
  - [x] Author comprehensive unit tests in [`src/helpers/colors.test.ts`](../helpers/colors.test.ts).
- [x] **Canvas Context Configuration ([`src/webgl/canvas/canvas_types.ts`](../webgl/canvas/canvas_types.ts))**
  - [x] Update `WebGLContextOptions.clearColor` to accept `RgbaLike` alongside `[number, number, number, number]`.
  - [x] Update clear color unpacking in [`src/components/webgl_canvas/use_webgl_canvas.ts`](../components/webgl_canvas/use_webgl_canvas.ts).

---

## Phase 2: Attribute Converters & Lit Web Components

- [x] **Vector3 Converter ([`src/lit/converters/vector3_converter.ts`](../lit/converters/vector3_converter.ts))**
  - [x] Update converter interface in [`vector3_converter_types.ts`](../lit/converters/vector3_converter_types.ts) to `Vector3Like`.
  - [x] Refactor `vector3Converter.fromAttribute` to return `Vector3Like` (`{ x, y, z }`).
  - [x] Refactor `vector3Converter.toAttribute` to accept `Vector3Like`.
  - [x] Update unit tests in [`src/lit/converters/vector3_converter.test.ts`](../lit/converters/vector3_converter.test.ts).
- [x] **RGBA Color Converter ([`src/lit/converters/rgba_color_converter.ts`](../lit/converters/rgba_color_converter.ts))**
  - [x] Refactor `rgbaColorConverter.fromAttribute` to return `RgbaLike` (`{ r, g, b, a }`).
  - [x] Refactor `rgbaColorConverter.toAttribute` to accept `RgbaLike`.
  - [x] Update unit tests in [`src/lit/converters/rgba_color_converter.test.ts`](../lit/converters/rgba_color_converter.test.ts).
- [x] **3D Node Element ([`src/scene/elements/node_3d_element.ts`](../scene/elements/node_3d_element.ts))**
  - [x] Update `Node3DElementProps` in [`node_3d_element_types.ts`](../scene/elements/node_3d_element_types.ts) to use `Vector3Like`.
  - [x] Update `DEFAULT_NODE_3D_POSITION`, `DEFAULT_NODE_3D_ROTATION`, `DEFAULT_NODE_3D_SCALE` in [`node_3d_element_constants.ts`](../scene/elements/node_3d_element_constants.ts) to `Vector3Like`.
  - [x] Remove obsolete index constants `VECTOR_INDEX_X`, `VECTOR_INDEX_Y`, `VECTOR_INDEX_Z`.
  - [x] Refactor property handlers in `node_3d_element.ts`.
  - [x] Update unit tests in [`node_3d_element.test.ts`](../scene/elements/node_3d_element.test.ts).
- [x] **Perspective Camera Element ([`src/scene/elements/perspective_camera_element.ts`](../scene/elements/perspective_camera_element.ts))**
  - [x] Update `PerspectiveCameraElementProps` in [`perspective_camera_element_types.ts`](../scene/elements/perspective_camera_element_types.ts) to use `Vector3Like`.
  - [x] Update `DEFAULT_CAMERA_POSITION`, `DEFAULT_CAMERA_ROTATION`, `DEFAULT_CAMERA_SCALE` in [`perspective_camera_element_constants.ts`](../scene/elements/perspective_camera_element_constants.ts) to `Vector3Like`.
  - [x] Remove obsolete index constants `VECTOR_INDEX_*`.
  - [x] Refactor property handlers in `perspective_camera_element.ts`.
  - [x] Update unit tests in [`perspective_camera_element.test.ts`](../scene/elements/perspective_camera_element.test.ts).
- [x] **Model Instance Element ([`src/scene/elements/model_instance_element.ts`](../scene/elements/model_instance_element.ts))**
  - [x] Update `ModelInstanceElementProps` in [`model_instance_element_types.ts`](../scene/elements/model_instance_element_types.ts) to use `Vector3Like`.
  - [x] Update `DEFAULT_MODEL_INSTANCE_POSITION`, `DEFAULT_MODEL_INSTANCE_ROTATION`, `DEFAULT_MODEL_INSTANCE_SCALE` in [`model_instance_element_constants.ts`](../scene/elements/model_instance_element_constants.ts) to `Vector3Like`.
  - [x] Refactor property handlers in `model_instance_element.ts`.
  - [x] Update unit tests in [`model_instance_element.test.ts`](../scene/elements/model_instance_element.test.ts).
- [x] **Galaxy Elements ([`src/galaxy_backdrop/elements/`](../galaxy_backdrop/elements/))**
  - [x] Update `GalaxyCameraElement` in [`galaxy_camera_element.ts`](../galaxy_backdrop/elements/galaxy_camera_element.ts) to serialize/deserialize `position` and `rotation` as `Vector3Like`.
  - [x] Update unit tests in [`galaxy_camera_element.test.ts`](../galaxy_backdrop/elements/galaxy_camera_element.test.ts).
  - [x] Update [`galaxy_stars_element.test.ts`](../galaxy_backdrop/elements/galaxy_stars_element.test.ts) to assert `Vector3Like` properties on rendered model instances.

---

## Phase 3: React Declarative Scene Graph & Hooks

- [x] **React Scene Node Types ([`src/scene/react/scene_react_types.ts`](../scene/react/scene_react_types.ts))**
  - [x] Update `SceneNodeProps.position` to accept `Vector3Like`.
  - [x] Update `SceneNodeProps.rotation` to accept `EulerAngles` (from `transform_types.ts`) alongside `EulerTuple`.
  - [x] Update `SceneNodeProps.scale` to accept `Vector3Like | number`.
- [x] **Scene Node Hook ([`src/scene/react/use_scene_node.ts`](../scene/react/use_scene_node.ts))**
  - [x] Update property reconciliation logic to accept `Vector3Like` without tuple slicing.
  - [x] Cache previous position and rotation as `Vector3Like` and `EulerAngles`.
- [x] **Declarative Scene Tests ([`src/scene/react/declarative_scene.test.tsx`](../scene/react/declarative_scene.test.tsx))**
  - [x] Update tests to verify declarative JSX transform assignment with `{ x, y, z }` object literals.

---

## Phase 4: Scene Graph Core, Transforms & Cameras

- [x] **Transform Component ([`src/scene/core/transform.ts`](../scene/core/transform.ts))**
  - [x] Update [`transform_types.ts`](../scene/core/transform_types.ts) `ITransform` interface:
    - [x] Add `setPosition(pos: Vector3Like): this;` overload.
    - [x] Add optional target-out parameter to `getPosition(out?: Vector3Like): Vector3Like;`.
    - [x] Add `setScale(scale: Vector3Like): this;` overload.
    - [x] Add optional target-out parameter to `getScale(out?: Vector3Like): Vector3Like;`.
  - [x] Update `Transform` class implementation in [`transform.ts`](../scene/core/transform.ts).
  - [x] Update unit tests in [`src/scene/core/transform.test.ts`](../scene/core/transform.test.ts).
- [x] **Camera System ([`src/scene/camera/camera.ts`](../scene/camera/camera.ts))**
  - [x] Update `ICamera` interface in [`camera_types.ts`](../scene/camera/camera_types.ts) to accept `Vector3Like` for target and up vectors.
  - [x] Add optional target-out parameter to `getPosition(out?: Vector3Like): Vector3Like;`.
  - [x] Update `Camera` implementation and unit tests in [`camera.test.ts`](../scene/camera/camera.test.ts), [`perspective_camera.test.ts`](../scene/camera/perspective_camera.test.ts), and [`orthographic_camera.test.ts`](../scene/camera/orthographic_camera.test.ts).
- [x] **Skybox System ([`src/scene/environment/skybox.ts`](../scene/environment/skybox.ts))**
  - [x] Update `ISkybox` and `Skybox` `tint` property from `[number, number, number]` to `RgbLike`.
  - [x] Update [`skybox_types.ts`](../scene/environment/skybox_types.ts) and [`skybox_material_types.ts`](../scene/environment/skybox_material_types.ts).
  - [x] Update unit tests in [`skybox.test.ts`](../scene/environment/skybox.test.ts) and [`skybox_material.test.ts`](../scene/environment/skybox_material.test.ts).

---

## Phase 5: Materials, Textures, Shaders & Renderer Pipeline

- [x] **Shader Program Uniforms ([`src/webgl/shaders/shader_program.ts`](../webgl/shaders/shader_program.ts))**
  - [x] Update [`shader_program_types.ts`](../webgl/shaders/shader_program_types.ts) `setVec3` to accept `Vector3Like`.
  - [x] Update `setVec4` to accept `Vector4Like` or `RgbaLike`.
  - [x] Add `setColor(name: string, color: RgbLike | RgbaLike)` helper method.
  - [x] Update unit tests in [`shader_program.test.ts`](../webgl/shaders/shader_program.test.ts).
- [x] **Renderer Uniform Synchronization ([`src/scene/renderer/scene_renderer_types.ts`](../scene/renderer/scene_renderer_types.ts))**
  - [x] Update `StandardShaderUniforms.u_cameraPosition` to `Vector3Like | Float32Array`.
  - [x] Update scratch buffer handling in [`material_binder.ts`](../scene/materials/material_binder.ts).
  - [x] Update unit tests in [`scene_renderer.test.ts`](../scene/renderer/scene_renderer.test.ts) and [`material_binder.test.ts`](../scene/materials/material_binder.test.ts).
- [x] **Unlit Material ([`src/scene/materials/unlit_material.ts`](../scene/materials/unlit_material.ts))**
  - [x] Update [`unlit_material_types.ts`](../scene/materials/unlit_material_types.ts) `color` option to accept `RgbLike | RgbaLike`.
  - [x] Update `UnlitMaterial.setColor` and unit tests in [`unlit_material.test.ts`](../scene/materials/unlit_material.test.ts).
- [x] **Galactic Cloud Material & Constants ([`src/scene/materials/galactic_cloud_material.ts`](../scene/materials/galactic_cloud_material.ts))**
  - [x] Update `DEFAULT_HORIZON_COLOR_CENTER` and `DEFAULT_HORIZON_COLOR_OUTER` in [`galactic_cloud_material_constants.ts`](../scene/materials/galactic_cloud_material_constants.ts) to `RgbLike`.
  - [x] Update `horizonColorCenter`, `horizonColorOuter`, `cloudColorPrimary`, and `cloudColorSecondary` in [`galactic_cloud_material_types.ts`](../scene/materials/galactic_cloud_material_types.ts) to `RgbLike`.
  - [x] Update unit tests in [`galactic_cloud_material.test.ts`](../scene/materials/galactic_cloud_material.test.ts).
- [x] **Galaxy Material ([`src/scene/materials/galaxy_material.ts`](../scene/materials/galaxy_material.ts))**
  - [x] Update galaxy color uniform options to `RgbLike`.
  - [x] Update [`galaxy_material_types.ts`](../scene/materials/galaxy_material_types.ts) and unit tests in [`galaxy_material.test.ts`](../scene/materials/galaxy_material.test.ts).
- [x] **Textures ([`src/webgl/textures/`](../webgl/textures/))**
  - [x] Update [`solid_color_texture_types.ts`](../webgl/textures/solid_color_texture_types.ts) and [`solid_color_texture.ts`](../webgl/textures/solid_color_texture.ts) to accept `RgbaLike` or `RgbLike` in `setColor`.
  - [x] Update [`solid_color_cube_texture_types.ts`](../webgl/textures/solid_color_cube_texture_types.ts) and [`solid_color_cube_texture.ts`](../webgl/textures/solid_color_cube_texture.ts).
  - [x] Update unit tests in [`solid_color_texture.test.ts`](../webgl/textures/solid_color_texture.test.ts).

---

## Phase 6: Galaxy Backdrop Parameters & Controller

- [x] **Galaxy Parameter Types ([`src/galaxy_backdrop/parameters/types.ts`](../galaxy_backdrop/parameters/types.ts))**
  - [x] Refactor color properties from `[number, number, number]` to `RgbLike`:
    - [x] `horizonColorCenter: RgbLike`
    - [x] `horizonColorOuter: RgbLike`
    - [x] `cloudColorPrimary: RgbLike`
    - [x] `cloudColorSecondary: RgbLike`
    - [x] `coreColor: RgbLike`
    - [x] `coreBlazeColor: RgbLike`
    - [x] `armInnerColor: RgbLike`
    - [x] `armOuterColor: RgbLike`
    - [x] `accentColor: RgbLike`
- [x] **Defaults & Presets ([`src/galaxy_backdrop/parameters/index.ts`](../galaxy_backdrop/parameters/index.ts))**
  - [x] Update default parameter values to `{ r, g, b }` literals.
  - [x] Update presets in [`src/galaxy_backdrop/parameters/presets/`](../galaxy_backdrop/parameters/presets/).
- [x] **Galaxy Scene & Controller ([`src/galaxy_backdrop/galaxy_scene.tsx`](../galaxy_backdrop/galaxy_scene.tsx))**
  - [x] Align [`use_galaxy_controller.ts`](../galaxy_backdrop/use_galaxy_controller.ts) and scene uniform bindings with `RgbLike` parameters.
  - [x] Update unit tests in `src/galaxy_backdrop/`.

---

## Phase 7: UI Components & Settings Dialogs

- [x] **Color Item Component ([`src/components/color_item/color_item.tsx`](../components/color_item/color_item.tsx))**
  - [x] Update props to accept `color: RgbLike` and `onChange: (color: RgbLike) => void`.
  - [x] Update component implementation and design doc in [`design.md`](../components/color_item/design.md).
  - [x] Update unit tests in [`color_item.test.tsx`](../components/color_item/color_item.test.tsx).
- [x] **Galaxy Settings Dialog Sections ([`src/galaxy_backdrop/galaxy_settings_dialog/`](../galaxy_backdrop/galaxy_settings_dialog/))**
  - [x] Update [`colors_glow_section.tsx`](../galaxy_backdrop/galaxy_settings_dialog/colors_glow_section.tsx) to bind `ColorItem` directly to `RgbLike` parameters.
  - [x] Update [`galactic_cloud_section.tsx`](../galaxy_backdrop/galaxy_settings_dialog/galactic_cloud_section.tsx) to bind `ColorItem` directly to `RgbLike` horizon parameters.
  - [x] Update any settings dialog unit tests.

---

## Phase 8: Verification & Quality Gates

- [ ] Run full lint suite: `npm run lint` (ensure zero ESLint or hook rule warnings).
- [ ] Run TypeScript type checker: `npm run typecheck` (ensure zero type errors).
- [ ] Run test suite: `npm test` (ensure all unit tests pass).
- [ ] Run production build: `npm run build` (ensure clean Parcel bundle generation).
