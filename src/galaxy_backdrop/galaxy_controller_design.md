# Galaxy Controller & Multi-Galaxy Architecture Design

Design specification for decoupling the 3D galaxy simulation from a monolithic React singleton context into an encapsulated, hook-driven controller architecture (`useGalaxyController`) supporting multiple independent galaxy instances.

---

## 1. Overview & Problem Statement

### Current Architecture: Monolithic `GalaxyContext`
Currently, the galaxy backdrop is managed by a single ambient React context ([galaxy_context.tsx](galaxy_context.tsx)) wrapping the entire application layout in [../layouts/layout.tsx](../layouts/layout.tsx). This context bundles:
*   Backdrop parameter state (`GalaxyParameters`) and `localStorage` persistence.
*   The singleton `GalaxyRenderer` instance and WebGL2 canvas lifecycle.
*   DOM container node attachment (`setBackdropContainer`).
*   Settings dialog visibility state (`isSettingsOpen`, `openSettings`, `closeSettings`).
*   Preset selection and parameter dispatchers (`updateParameters`, `resetParameters`).

### Architectural Limitations & Pain Points
*   **Singleton Lock-in:** The system is tied to a single global background canvas. It is impossible to render multiple galaxies independently (for instance, an interactive galaxy preview card on a project page, side-by-side parameter comparisons, or celestial collision visualizers).
*   **High-Frequency Re-render Cascade:** Parameter updates dispatched from [galaxy_settings_dialog/galaxy_settings_dialog.tsx](galaxy_settings_dialog/galaxy_settings_dialog.tsx) at 60–120 FPS trigger React re-renders across the entire context subscription tree, including [../layouts/layout.tsx](../layouts/layout.tsx), [../components/navbar.tsx](../components/navbar.tsx), and all child section components, even though the WebGL canvas only needs direct imperative uniform/VBO updates.
*   **Coupled UI Concerns:** The settings dialog open/close state is bundled with the 3D physics and rendering engine, forcing unrelated components (like the navigation bar gear button) to subscribe to the heavy galaxy simulation state.
*   **Inflexible Inspector:** The settings dialog hardcodes consumption of the global context, preventing it from being used as a general-purpose inspector for any arbitrary galaxy instance.

---

## 2. Design Goals

*   **Hook-Driven Encapsulation:** Encapsulate all simulation state, renderer lifecycle, canvas mounting, and parameter mutations inside a composable hook: `useGalaxyController`.
*   **Multi-Instance Support:** Enable rendering multiple galaxies concurrently on the same page, each with its own parameters, presets, canvas, and rendering loop.
*   **Zero Re-render Bleed:** Confine React re-renders during slider scrubbing strictly to the inspector/dialog UI; the outer application layout and other galaxies must remain untouched.
*   **Reusable Inspector Pattern:** Transform `GalaxySettingsDialog` into a standalone inspector component that accepts a `GalaxyController` instance as a prop.
*   **WebGL Context Management:** Provide clean resource management and lifecycle handling that respects browser WebGL context limits (eviction safety, automatic pausing when off-screen).
*   **Thin UI Coordination:** Replace the fat global context with a lightweight UI trigger mechanism for site-wide dialog control, completely decoupling navigation from 3D physics.

---

## 3. WebGL Architecture & Multi-Galaxy Rendering Models

A fundamental question when rendering multiple galaxies is whether to share a single WebGL context or use multiple canvases.

### WebGL Context Realities
*   **1:1 Canvas Binding:** In the WebGL2 specification, a `WebGL2RenderingContext` is strictly bound to a single `<canvas>` DOM element. A single context cannot draw across multiple `<canvas>` elements.
*   **Browser Context Limits:** Web browsers enforce a maximum pool of simultaneous active WebGL contexts per page (typically 8 to 16 on desktop, 8 on mobile). Exceeding this limit causes the browser to silently evict and destroy the oldest context (`webglcontextlost`).

### Supported Multi-Galaxy Strategies

#### Strategy A: Independent Canvas Model (Primary)
Each galaxy instance controls its own `<canvas>` element via its own `GalaxyRenderer` instance.

*   **Use Cases:**
    *   One full-page site backdrop + 1 to 3 embedded interactive galaxy visualizers or project cards on a single page.
    *   Side-by-side comparison of different galactic morphology presets (e.g. Pin-prick vs. Orb, or 2-arm vs. 5-arm spirals).
*   **Resource Management:**
    *   Because modern pages will rarely have more than 2–4 galaxies visible at once, this is well within the 8–16 browser context limit.
    *   **Off-screen Pausing:** Each instance uses an `IntersectionObserver` to halt its `requestAnimationFrame` loop when scrolled out of view, reducing GPU load to zero for non-visible instances.
    *   **Context Loss Handling:** Explicit listeners for `webglcontextlost` and `webglcontextrestored` ensure graceful recovery.

#### Strategy B: Single-Canvas Multi-Object Scene Graph (Future Extension)
For scenarios requiring dozens of simultaneous galaxies (e.g., a galactic cluster simulation or interacting binary galaxy mergers), a single full-screen WebGL canvas can render multiple galaxy entities in a single draw pass or batched draw calls:
*   Each galaxy entity maintains its own local transformation matrix (position, orientation, scale), arm parameters, and star buffer.
*   The single `GalaxyRenderer` loops through registered galaxy entities, binding uniforms and drawing each star buffer in succession.
*   Alternatively, multiple viewports can be drawn on a single canvas using `gl.viewport()` and `gl.scissor()` mapped to floating DOM placeholder rects.

The proposed `useGalaxyController` architecture naturally supports Strategy A today while providing the clean abstraction needed to route into Strategy B later.

---

## 4. Types & Interfaces

### 4.1 Controller Configuration Options (`GalaxyControllerOptions`)

```typescript
export interface GalaxyControllerOptions {
    /** Initial configuration parameters or partial overrides */
    initialParams?: Partial<GalaxyParameters>;
    /** Initial preset ID to load (defaults to "pinprick" or "orb_default") */
    initialPresetId?: string;
    /** Optional localStorage key for parameter persistence. Set to null for ephemeral instances. */
    storageKey?: string | null;
    /** Whether to automatically track container/window resize. Defaults to true. */
    autoResize?: boolean;
    /** Whether to automatically pause rendering when off-screen via IntersectionObserver. Defaults to true. */
    pauseWhenHidden?: boolean;
    /** Callback fired when the WebGL context is initialized and ready */
    onReady?: (renderer: GalaxyRenderer) => void;
}
```

### 4.2 Galaxy Controller Instance (`GalaxyController`)

The controller object returned by `useGalaxyController` acts as the complete programmatic interface for a galaxy instance:

```typescript
export interface GalaxyController {
    /** Current parameter state (triggers re-renders only within subscriber components) */
    params: GalaxyParameters;
    /** Batched parameter mutator updating both React state and GPU uniforms/VBO */
    updateParameters: (partial: Partial<GalaxyParameters>) => void;
    /** Reverts parameters to default values */
    resetParameters: () => void;
    /** Applies a predefined preset by identifier */
    applyPreset: (presetId: string) => void;
    /** Currently active preset ID, or "custom" if parameters diverged */
    currentPresetId: string;
    /** Callback ref to attach to the container element hosting the canvas */
    containerRef: (node: HTMLElement | null) => void;
    /** Direct callback ref if attaching to an existing canvas element */
    canvasRef: (node: HTMLCanvasElement | null) => void;
    /** Whether the WebGL2 context and buffers are compiled and actively rendering */
    isReady: boolean;
    /** Direct reference to the underlying WebGL2 renderer engine */
    renderer: GalaxyRenderer | null;
}
```

### 4.3 Component Props

#### Reusable Galaxy View Component (`GalaxyViewProps`)
A turnkey component that provisions or mounts a galaxy instance into any view:

```typescript
export interface GalaxyViewProps {
    /** Existing controller instance, or options to auto-instantiate one */
    controller?: GalaxyController;
    options?: GalaxyControllerOptions;
    className?: string;
    style?: React.CSSProperties;
    /** Optional overlay content rendered directly above the galaxy canvas */
    children?: React.ReactNode;
}
```

#### Reusable Inspector Dialog (`GalaxySettingsDialogProps`)
Refactored inspector that inspects any passed galaxy instance:

```typescript
export interface GalaxySettingsDialogProps {
    /** The target galaxy controller to inspect and tune */
    galaxy: GalaxyController;
    /** Whether the dialog is visible */
    isOpen: boolean;
    /** Callback invoked when the user requests closing the dialog */
    onClose: () => void;
    /** Optional custom modal title (defaults to "Galaxy Settings") */
    title?: string;
    className?: string;
}
```

### 4.4 Scoped Inspector Context (`GalaxyInspectorContext`)
To keep the six settings sections ([galaxy_settings_dialog/camera_perspective_section.tsx](galaxy_settings_dialog/camera_perspective_section.tsx), etc.) modular and clean without deep prop drilling, a localized context is created **strictly within the dialog boundary**:

```typescript
export interface GalaxyInspectorContextValue {
    galaxy: GalaxyController;
}
```
*   This context is only provided inside `<GalaxySettingsDialog>` and consumed by its direct section children via `useGalaxyInspector()`.
*   Parameter updates during scrubbing stay isolated inside the dialog modal and do not bubble up or re-render parent trees.

### 4.5 Thin Backdrop UI Trigger Context (`BackdropUIContext`)
For global site chrome (e.g. [../components/navbar.tsx](../components/navbar.tsx) needing to toggle the backdrop settings dialog), a minimal UI context is provided at the root:

```typescript
export interface BackdropUIContextValue {
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    toggleSettings: () => void;
}
```
*   Contains **zero** physics parameters, zero star buffers, and zero WebGL dependencies.
*   Only re-renders when the modal opens or closes, completely eliminating frame drops during live slider scrubbing.

---

## 5. Architectural Data Flow

### Before: Fat Monolithic Context
```
[User drags slider in dialog]
          │
          ▼
   [GalaxyContext]  <── Holds params, dialog open state, renderer, canvas
   ┌──────┴──────────────────────────────┐
   ▼                                     ▼
[GalaxyRenderer]               [Layout Re-renders]
(Uniform / VBO update)         (Navbar, Outlet, ScrollRegion, Footer, Dialog)
                               * Massive 60-120 FPS re-render storm across DOM *
```

### After: Decoupled Controller Architecture
```
[User drags slider in dialog]
          │
          ▼
[GalaxyInspectorContext]  <── Scoped strictly inside <GalaxySettingsDialog>
          │
          ▼
[galaxy.updateParameters]
   ┌──────┴──────────────────────────────┐
   ▼                                     ▼
[GalaxyRenderer]               [Dialog Section Sliders]
(Immediate GPU update)         (Local slider position update only)

[Layout]                       [Navbar]
* Untouched (0 re-renders) *   * Untouched (0 re-renders) *
```

---

## 6. Implementation Procedures & Algorithms

### Procedure 1: `useGalaxyController` Lifecycle
1.  **Parameter Initialization:**
    *   Determine platform profile (mobile viewport/UA vs desktop).
    *   Merge defaults: `DEFAULT_GALAXY_PARAMETERS` + platform overrides + options overrides.
    *   If `storageKey` is provided, attempt loading saved overrides from `localStorage`.
    *   Store active parameters in React state (`params`) and keep an up-to-date ref (`paramsRef`) for non-reactive tick loops.
2.  **Mounting & Context Binding:**
    *   When `containerRef` or `canvasRef` receives a DOM node, verify connectivity.
    *   If a container is supplied, dynamically construct the `<canvas>` with `.hero-effect` class and append it.
    *   Instantiate `new GalaxyRenderer(canvas, paramsRef.current)`.
    *   Call `renderer.initialize()`. If successful, store reference in state/ref and set `isReady = true`.
3.  **Resize & Visibility Observation:**
    *   Attach `ResizeObserver` to the container/canvas to trigger `renderer.resize()`.
    *   If `pauseWhenHidden` is true, attach `IntersectionObserver` to automatically halt loop execution when the canvas is off-screen.
    *   Attach `document.visibilitychange` to halt rendering when switching browser tabs.
4.  **Parameter Mutation Pipeline:**
    *   `updateParameters(partial)`:
        *   Update React state `params` to keep UI controls synchronized.
        *   Forward `partial` directly to `renderer.updateParameters(partial)`.
        *   If `storageKey` is present, write updated configuration to `localStorage`.
5.  **Teardown:**
    *   On unmount or node change, disconnect `ResizeObserver` and `IntersectionObserver`.
    *   Call `renderer.destroy()`, safely releasing GPU buffers, shader programs, and event listeners.
    *   Remove canvas DOM element if created dynamically.
    *   Reset `isReady = false`.

### Procedure 2: Multi-Galaxy Composition in Pages
To embed an independent galaxy inside any feature page or comparison view:

1.  Call `useGalaxyController` with independent parameters:
    ```tsx
    const miniGalaxy = useGalaxyController({
        initialParams: { starCount: 50000, style: "orb" },
        storageKey: null, // Ephemeral, does not touch site backdrop storage
    });
    ```
2.  Render the canvas using the callback ref or `<GalaxyView>`:
    ```tsx
    <div className="galaxy-card">
        <GalaxyView controller={miniGalaxy} />
        <button onClick={() => setIsInspectorOpen(true)}>Inspect</button>
    </div>
    ```
3.  Mount `<GalaxySettingsDialog galaxy={miniGalaxy} isOpen={isInspectorOpen} onClose={...} />`.
4.  Each galaxy maintains its own independent simulation and inspector without interfering with the site backdrop.

---

## 7. Migration Plan

*   **Step 1: Create `useGalaxyController` Hook**
    *   Implement in `src/galaxy_backdrop/use_galaxy_controller.ts`.
    *   Export interfaces and helper types.
*   **Step 2: Create Turnkey `GalaxyView` Component**
    *   Implement in `src/galaxy_backdrop/galaxy_view.tsx` with container sizing and canvas mounting.
*   **Step 3: Refactor `GalaxySettingsDialog` as an Inspector**
    *   Update `galaxy_settings_dialog.tsx` to accept `galaxy: GalaxyController` prop.
    *   Introduce `GalaxyInspectorContext` scoped within the dialog for section components.
    *   Update section components to consume `useGalaxyInspector()`.
*   **Step 4: Update Site Backdrop in `Layout` & `Navbar`**
    *   In `src/layouts/layout.tsx`, instantiate `const backdropGalaxy = useGalaxyController(...)`.
    *   Provide lightweight `BackdropUIContext` for dialog toggle state.
    *   Update `src/components/navbar.tsx` to consume the thin UI context.
*   **Step 5: Deprecate Monolithic `GalaxyContext`**
    *   Remove or alias `galaxy_context.tsx` and ensure all consumers are migrated.
*   **Step 6: Build Verification**
    *   Run `npm run build` to ensure zero compilation or type errors.

---

## 8. Summary of Benefits

*   **Scalability:** Opens the door to multi-galaxy visualizations, side-by-side preset comparisons, and embedded article widgets.
*   **Performance:** Completely eliminates unnecessary re-renders in `Layout`, `Header`, `Navbar`, and route pages during high-frequency slider manipulation.
*   **Decoupled Architecture:** Clean separation between WebGL rendering logic, state management, and UI presentation.
*   **Clean Inspector Reusability:** One settings dialog component can inspect and tune any galaxy in the application.
