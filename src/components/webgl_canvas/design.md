# Reusable WebGL Canvas & Context Management Design

Design specification for a reusable WebGL canvas component (`WebGLCanvas`), headless lifecycle hook (`useWebGLCanvas`), and scoped multi-subscriber render bus (`useWebGLFrame`, `useWebGLPass`, `useWebGLContext`) providing robust WebGL/WebGL2 context management, context loss and restoration handling, multi-component rendering pipelines, high-DPI scaling, browser context quota safety, and power-efficient throttling.

---

## 1. Overview & Motivation

### Current State: Ad-Hoc WebGL Initialization
Currently, 3D graphics in the application (such as [../../galaxy_backdrop/galaxy_renderer.ts](../../galaxy_backdrop/galaxy_renderer.ts)) directly call `canvas.getContext("webgl2", ...)` and manually coordinate resize observation, pixel ratios, event listeners, and animation loops.

### The Problems with Unmanaged WebGL
*   **Context Loss Crashes:** WebGL contexts can be lost at any time due to GPU driver timeouts, device sleep/wake cycles, mobile app switching, or operating system memory pressure. Without listening for `webglcontextlost` and calling `event.preventDefault()`, the browser marks the context permanently destroyed, crashing the simulation and leaving a blank or frozen canvas.
*   **Browser Context Quota & Silent Eviction:** Browsers impose a strict limit of 8–16 simultaneous active WebGL contexts per page/origin. When unmounting canvas components, if WebGL contexts are not explicitly released via the `WEBGL_lose_context` extension, they linger in GPU memory until garbage collection. Navigating between pages or opening multiple canvas views can silently evict active contexts.
*   **Inability to Share a Canvas Across Components:** Multiple features often need to participate in the same canvas (e.g. background galaxy simulation, foreground particle sparks, post-processing filters, or HTML HUD coordinate trackers). Without a subscriber pipeline, a single monolithic class must own all drawing, preventing modular feature composition.
*   **High-DPI Fill-Rate Bottlenecks:** On modern mobile and desktop displays with device pixel ratios (DPR) of 2.0 or 3.0, an uncapped backing buffer can require 4× to 9× the fragment fill rate and memory allocation (`width × DPR × height × DPR × 4 bytes`). A managed canvas must enforce configurable DPR capping.
*   **Battery Drain from Off-Screen Rendering:** Continuously running `requestAnimationFrame` loops when a canvas is scrolled off-screen or when the browser tab is hidden drains battery and consumes GPU cycles unnecessarily.

---

## 2. Design Goals

*   **Universal Reusability:** Provide a declarative React component (`<WebGLCanvas />`) and headless hooks that work with any WebGL/WebGL2 renderer.
*   **Multi-Subscriber Render Pipeline:** Allow multiple independent components to render into the same canvas or observe frame ticks via prioritized render passes (`useWebGLPass`, `useWebGLFrame`).
*   **Zero React Re-render Overhead for Frame Ticks:** Imperative render ticks execute directly via a mutable subscriber registry at 60–120 FPS without causing React Virtual DOM re-renders.
*   **Resilient Context Loss & Restoration Fan-Out:** Automate the complete context loss lifecycle (`webglcontextlost` $\to$ pause loop $\to$ `webglcontextrestored` $\to$ fan out restore event to all registered passes $\to$ recompile shaders/re-upload buffers $\to$ resume rendering).
*   **Deterministic Quota & Memory Management:** Explicitly release GPU contexts immediately on unmount via the `WEBGL_lose_context` extension to prevent browser context exhaustion.
*   **Intelligent DPR & Viewport Synchronization:** Automatically handle `ResizeObserver` callbacks, synchronize `canvas.width`/`height` backing stores with CSS dimensions, clamp DPR to safe thresholds, and trigger viewport updates.
*   **Adaptive Power Throttling:** Automatically halt the animation loop when the canvas is scrolled outside the viewport (via `IntersectionObserver`) or when the browser tab is hidden (via `document.visibilityState`).
*   **DOM Overlay Integration:** Support rendering HTML overlays, HUDs, or tooltips directly alongside the canvas within a clean coordinate container.
*   **Graceful Fallbacks:** Render a customizable fallback UI when WebGL/WebGL2 is unsupported or when context recovery fails.

---

## 3. WebGL Context Realities & Lifecycle Management

### 3.1 Why WebGL Contexts Are Lost
A WebGL context is a hardware-accelerated resource managed by the operating system and GPU driver. Context loss occurs when:
*   The GPU resets due to a driver crash, update, or excessive workload (TDR — Timeout Detection and Recovery).
*   The device enters sleep mode, powers down display hardware, or swaps apps on mobile (iOS/Android).
*   The browser reaches its global context pool limit (8–16 contexts) and evicts the oldest context to service a newly requested one.
*   The browser or operating system faces extreme VRAM pressure and reclaims GPU resources.

### 3.2 The Context Loss & Restoration Protocol
To gracefully survive context loss, an application must follow this exact browser contract:

*   **Handling `webglcontextlost`:**
    1.  The browser fires the `webglcontextlost` event on the `<canvas>`.
    2.  The application **must** call `event.preventDefault()`. If `preventDefault()` is not called, the browser treats the loss as permanent and will never restore the context.
    3.  The animation loop must immediately halt. Any WebGL calls made on a lost context will fail silently or log console warnings.
    4.  The canvas fans out `onContextLost` to all registered passes/subscribers so they can invalidate GPU references (shaders, buffers, VAOs, textures).
*   **Handling `webglcontextrestored`:**
    1.  When GPU resources become available again, the browser fires `webglcontextrestored` on the `<canvas>`.
    2.  The underlying `WebGL2RenderingContext` instance is restored, but **all previously uploaded GPU resources are completely gone**. Every buffer, VAO, texture, and shader program must be recreated and re-uploaded from CPU data.
    3.  The canvas fans out `onContextRestored` to all registered passes in priority order to recreate their GPU resources.
    4.  Resume the animation loop and redraw the frame.

### 3.3 Deterministic Disposal via `WEBGL_lose_context`
When a React component unmounts, merely removing the `<canvas>` from the DOM does not immediately destroy the WebGL context. The context remains alive in the browser's context pool until V8/SpiderMonkey garbage-collects the JavaScript wrapper.

To prevent hitting the 8–16 context quota ceiling:
*   On unmount, request the `WEBGL_lose_context` extension:
    ```typescript
    const loseContextExt = gl.getExtension("WEBGL_lose_context");
    loseContextExt?.loseContext();
    ```
*   This explicitly instructs the browser to free the underlying GPU context and context slot immediately.

---

## 4. Types & Interfaces

### 4.1 Context Configuration (`WebGLContextOptions`)

```typescript
export interface WebGLContextOptions {
    /** Target WebGL API version. Defaults to "webgl2" with optional fallback to "webgl". */
    version?: "webgl2" | "webgl";
    /** WebGL context initialization attributes passed to getContext() */
    attributes?: WebGLContextAttributes;
    /** Maximum allowed device pixel ratio. Defaults to 1.5 to balance sharpness and fill rate. */
    dprCap?: number;
    /** Render loop mode: "continuous" runs requestAnimationFrame; "on-demand" renders only when requested. */
    renderMode?: "continuous" | "on-demand";
    /** Automatically pause the render loop when scrolled off-screen. Defaults to true. */
    pauseWhenOffscreen?: boolean;
    /** Automatically pause the render loop when the browser tab is hidden. Defaults to true. */
    pauseWhenHidden?: boolean;
}
```

### 4.2 Standard Canvas Dimensions (`CanvasDimensions`)

```typescript
export interface CanvasDimensions {
    /** Backing store width in physical device pixels (canvas.width) */
    width: number;
    /** Backing store height in physical device pixels (canvas.height) */
    height: number;
    /** Layout width in CSS pixels (rect.width) */
    cssWidth: number;
    /** Layout height in CSS pixels (rect.height) */
    cssHeight: number;
    /** Effective device pixel ratio applied (clamped by dprCap) */
    dpr: number;
    /** Aspect ratio (width / height) */
    aspect: number;
}
```

### 4.3 Animation Frame Time Info (`TimeInfo`)

```typescript
export interface TimeInfo {
    /** Total elapsed time in seconds since the canvas initialized */
    time: number;
    /** Delta time in seconds since the previous frame (clamped to prevent physics explosion after tab switch) */
    dt: number;
    /** Monotonically increasing frame counter */
    frameCount: number;
}
```

### 4.4 Multi-Subscriber Contract (`WebGLSubscriber`)

Contract implemented by any layer, pass, or observer registered with the canvas:

```typescript
export interface WebGLSubscriber {
    /** Unique identifier for the subscriber */
    id: string;
    /** Execution order: lower numbers render first (e.g. 0 = background clear, 10 = galaxy, 100 = overlay) */
    priority: number;
    /** Called when the subscriber is registered or when context becomes available */
    init?: (gl: WebGL2RenderingContext, dims: CanvasDimensions) => void;
    /** Called on each animation tick to draw or compute frame updates */
    render?: (gl: WebGL2RenderingContext, timeInfo: TimeInfo, dims: CanvasDimensions) => void;
    /** Called whenever the canvas backing dimensions change */
    resize?: (gl: WebGL2RenderingContext, dims: CanvasDimensions) => void;
    /** Called when the browser loses the WebGL context */
    onContextLost?: (event: WebGLContextEvent) => void;
    /** Called when the browser restores the WebGL context */
    onContextRestored?: (gl: WebGL2RenderingContext, dims: CanvasDimensions) => void;
    /** Called when the subscriber unregisters */
    destroy?: () => void;
}
```

### 4.5 Scoped Canvas Context Value (`WebGLCanvasContextValue`)

Provided by `<WebGLCanvas>` strictly to its child subtree:

```typescript
export interface WebGLCanvasContextValue {
    /** The active WebGL2 context (null if unmounted or lost) */
    gl: WebGL2RenderingContext | null;
    /** True if the client device supports the requested WebGL version */
    isSupported: boolean;
    /** True if the WebGL context is currently lost */
    isContextLost: boolean;
    /** Current backing store and CSS dimensions */
    dimensions: CanvasDimensions;
    /** Registers a subscriber and returns an unsubscribe callback */
    subscribe: (subscriber: WebGLSubscriber) => () => void;
    /** Manually triggers a single frame render (useful for on-demand mode) */
    requestRender: () => void;
}
```

### 4.6 Component Props (`WebGLCanvasProps`)

```typescript
export interface WebGLCanvasProps {
    /** Configuration options for context, DPR, and throttling */
    options?: WebGLContextOptions;
    /** Fallback UI rendered if WebGL is unsupported */
    fallback?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    /** Child components: headless WebGL passes and/or DOM overlays */
    children?: React.ReactNode;
    /** Optional callback ref to the underlying HTMLCanvasElement */
    canvasRef?: React.Ref<HTMLCanvasElement>;
    /** Direct context created callback */
    onContextCreated?: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => void;
}
```

---

## 5. Architectural Pipeline & Multi-Subscriber Model

```
                    <WebGLCanvas> (Host & Context Provider)
                                    │
                                    ├── Scoped React Context (<WebGLCanvasContext>)
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
  <GalaxyBackdropLayer>    <ForegroundParticles>      <TelemetryHUD>
  (Priority: 0 - BG)       (Priority: 10 - FG)        (Priority: 100 - Observer)
  • Clears framebuffer     • Draws sparks             • Computes FPS
  • Draws 300k stars       • Blends over stars        • Renders HTML badge
```

### Render Loop Execution Algorithm (Frame Tick)
1.  Verify context is alive and canvas is visible (`!isOffscreen && !isHidden`).
2.  Compute clamped $\Delta t$ ($\max(\Delta t, 0.1)$) and increment frame counter.
3.  Sort registered subscribers by `priority` in ascending order.
4.  Execute `subscriber.render(gl, timeInfo, dimensions)` for each subscriber in sequence.
5.  If `renderMode === "continuous"`, queue the next `requestAnimationFrame`.

### Context Loss Fan-Out Algorithm
1.  Intercept `webglcontextlost` event on `<canvas>`.
2.  Execute `event.preventDefault()`.
3.  Halt the active `requestAnimationFrame` loop.
4.  Set `isContextLost = true` in context state.
5.  Iterate through all registered subscribers and invoke `subscriber.onContextLost(event)`.

### Context Restored Fan-Out Algorithm
1.  Intercept `webglcontextrestored` event on `<canvas>`.
2.  Set `isContextLost = false` in context state.
3.  Re-synchronize backing dimensions and `gl.viewport(0, 0, width, height)`.
4.  Iterate through all registered subscribers in priority order and invoke `subscriber.onContextRestored(gl, dimensions)`.
5.  Reset `lastTime = performance.now()` to avoid physics jumps.
6.  Restart `requestAnimationFrame` loop.

---

## 6. Hook Specifications

### 6.1 `useWebGLFrame(callback, priority)`
Convenience hook for running per-frame drawing or telemetry logic:
*   Registers an anonymous subscriber with the given `priority`.
*   Executes on every frame tick without triggering React re-renders.
*   Automatically unregisters on component unmount.

### 6.2 `useWebGLPass(pass)`
Convenience hook for comprehensive graphics layers requiring full lifecycle management:
*   Accepts `init`, `render`, `resize`, `onContextLost`, `onContextRestored`, and `destroy`.
*   Maintains subscriber synchronization across React dependency updates.
*   Automatically unregisters on unmount.

### 6.3 `useWebGLContext()`
Hook to access current canvas state:
*   Returns `gl`, `dimensions`, `isContextLost`, `isSupported`, `subscribe`, and `requestRender`.
*   Throws an explicit error if called outside `<WebGLCanvas>`.

---

## 7. DOM & CSS Guidelines Conformance

Following [../../project_guidelines/html_layout_guidelines.md](../../project_guidelines/html_layout_guidelines.md) and [../../project_guidelines/css_guidelines.md](../../project_guidelines/css_guidelines.md):

*   **Direct `<canvas>` Output (Zero Wrapper Divs):**
    ```html
    <canvas class="webgl-canvas"></canvas>
    <!-- Renderless pass components return null, resulting in a single clean DOM node -->
    ```
*   **Elimination of Single-Child Wrapper Anti-Pattern:** The component avoids wrapping the `<canvas>` in a synthetic `<div>`. If a feature uses renderless WebGL layers (`useWebGLPass` returning `null`), the rendered DOM output is strictly the `<canvas>` element alone.
*   **Direct Attribute Binding:** Standard HTML attributes (`id`, `aria-*`, `className`, `style`) apply directly to the `<canvas>` DOM node.
*   **DOM Overlays in Parent Flow:** If a feature incorporates HTML overlay elements (like an FPS badge or interactive tooltip), they sit naturally as siblings within the existing parent layout container (e.g. `.anim-background` or a card container) rather than being trapped in an artificial intermediate wrapper.
*   **Default 100% Sizing:** `.webgl-canvas` expands to fill its layout container (`display: block; width: 100%; height: 100%;`).
*   **Low Specificity CSS:** Scoped via a single class `.webgl-canvas` with zero tag qualifiers and zero `!important`.

---

## 8. Summary of Benefits

*   **Multi-Component Composition:** Multiple layers, post-processing filters, and UI overlays cleanly share a single WebGL canvas.
*   **Crash-Proof Recovery:** Context loss and restoration is fanned out to all layers automatically.
*   **Performance Isolation:** 120 FPS frame ticks run purely in WebGL without thrashing React Virtual DOM.
*   **Quota Safety:** Explicit context release via `WEBGL_lose_context` ensures page transitions never leak GPU context slots.
*   **Standardized Infrastructure:** Once built, any feature on the website can mount a canvas or hook into an existing canvas with a few lines of code.
