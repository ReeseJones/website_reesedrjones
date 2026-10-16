# WebGLCanvasElement Refactoring & Controller Tasklist

This document tracks the phased implementation and verification progress for refactoring `<rj-webgl-canvas>` and introducing generalized Lit Reactive Controllers.

---

## Phase 1: Generalized Lit Reactive Controllers (`src/controllers/`)

- [x] **1.1 Viewport / Resize Controller**
  - [x] Create `src/controllers/resize_controller_types.ts` defining `ViewportDimensions`, `ResizeControllerOptions`, and `IResizeController`.
  - [x] Create `src/controllers/resize_controller.ts` implementing `ReactiveController` for generic `HTMLElement` instances.
  - [x] Automatically attach `ResizeObserver` in `hostConnected()`, disconnect in `hostDisconnected()`.
  - [x] Measure CSS bounding rect, apply DPR scaling, compute aspect ratio, and trigger host update and optional `onResize` callback.

- [x] **1.2 Visibility Controller**
  - [x] Create `src/controllers/visibility_controller_types.ts` defining `VisibilityControllerOptions` and `IVisibilityController`.
  - [x] Create `src/controllers/visibility_controller.ts` implementing `ReactiveController` for generic `HTMLElement` instances.
  - [x] Combine `IntersectionObserver` (off-screen viewport detection) and `document.visibilitychange` (background tab detection).
  - [x] Automatically manage lifecycle setup and teardown across `hostConnected()` and `hostDisconnected()`.
  - [x] Expose `readonly isVisible: boolean` and trigger host update and optional `onChange(isVisible)` callback.

---

## Phase 2: Converters & Constants Pruning

- [x] **2.1 Color Attribute Converter**
  - [x] Create `src/scene/elements/converters/rgba_color_converter_types.ts` defining `NormalizedRgbaTuple`.
  - [x] Create `src/scene/elements/converters/rgba_color_converter.ts` implementing `ComplexAttributeConverter<NormalizedRgbaTuple>`.
  - [x] Support parsing hex strings (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) and space-delimited floats (`"r g b a"`).
  - [x] Support serializing normalized float tuples back to hex or delimited string in `toAttribute`.

- [x] **2.2 Constants Simplification**
  - [x] Edit `src/scene/elements/webgl_canvas_element_constants.ts`:
    - [x] Delete `ATTR_*` constants (rely on Lit's automatic property-to-attribute mapping).
    - [x] Delete `EVENT_*` constants (rely on static `TYPE` on `Event` subclasses).
    - [x] Delete duplicate simulation deltas and time units (reuse `src/scene/core/animation_frame_manager_constants.ts`).
    - [x] Retain only core defaults: `TAG_RJ_WEBGL_CANVAS`, `DEFAULT_DPR_CAP`, `DEFAULT_CLEAR_COLOR`.

---

## Phase 3: `<rj-webgl-canvas>` Refactoring

- [x] **3.1 Clean Decorators & Bidirectional Reflection**
  - [x] Remove `static override properties` and `public declare` statements.
  - [x] Annotate public properties with `@property({ reflect: true })`:
    - `dprCap` (`type: Number`, `attribute: "dpr-cap"`, `reflect: true`)
    - `renderMode` (`type: String`, `attribute: "render-mode"`, `reflect: true`)
    - `pauseWhenOffscreen` (`type: Boolean`, `attribute: "pause-when-offscreen"`, `reflect: true`)
    - `pauseWhenHidden` (`type: Boolean`, `attribute: "pause-when-hidden"`, `reflect: true`)
  - [x] Eliminated direct WebGL draw calls (`gl.clear`, `gl.clearColor`, `gl.viewport`) and removed `autoClear` / `clearColor` from canvas host.

- [x] **3.2 Zero-Query DOM Reference**
  - [x] Instantiate `private readonly _canvasRef = createRef<HTMLCanvasElement>();`.
  - [x] Bind in template: `<canvas ${ref(this._canvasRef)} part="canvas"></canvas>`.
  - [x] Access directly in `firstUpdated()` via `this._canvasRef.value`.

- [x] **3.3 Controller, Registry & Subscriber Management**
  - [x] Instantiate `ResizeController` targeting the host element with configurable `debounceMs` (defaulting to 100ms) to prevent GPU backbuffer churning during continuous window resize.
  - [x] Instantiate `VisibilityController` to pause/resume animation and rendering.
  - [x] Abstracted subscriber sorting and caching into `PriorityRegistry<T>` (`src/core/collections/priority_registry.ts`).
  - [x] Abstracted subscriber notifications and lifecycle into `WebGLSubscriberManager` (`src/webgl/canvas/webgl_subscriber_manager.ts`).
  - [x] Replace hand-rolled RAF loop with `AnimationFrameManager` from `src/scene/core/animation_frame_manager.ts`.

---

## Phase 4: Unit Testing & Quality Gate

- [x] **4.1 Controller Unit Tests**
  - [x] Author `src/controllers/resize_controller.test.ts` testing `ResizeController` in isolation with a mock host.
  - [x] Author `src/controllers/visibility_controller.test.ts` testing `VisibilityController` in isolation with a mock host.
- [x] **4.2 Converter Unit Tests**
  - [x] Author `src/scene/elements/converters/rgba_color_converter.test.ts` testing hex and float parsing and serialization.
- [x] **4.3 Element Unit Tests**
  - [x] Author `src/scene/elements/webgl_canvas_element.test.ts` covering declarative/programmatic reflection, subscriber execution, context recovery, and `@lit/context` provision.
- [x] **4.4 Full Suite Verification**
  - [x] `npm run lint` (0 errors)
  - [x] `npm run typecheck` (0 errors)
  - [x] `npm test` (100% pass)
  - [x] `npm run build` (production bundle clean)
