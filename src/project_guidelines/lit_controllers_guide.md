# Lit Reactive Controllers: Architecture & WebGL Patterns

Comprehensive guide on authoring, coordinating, and composing Lit Reactive Controllers (`ReactiveController` and `ReactiveControllerHost`) for WebGL, 3D graphics, and complex browser applications.

---

## 1. Overview & Architectural Role

Lit Reactive Controllers provide a first-class composition pattern for encapsulating cohesive, reusable units of state, lifecycle management, and behavior outside of the element class hierarchy.

### Why Reactive Controllers?
- **Decoupled Logic:** Move non-rendering logic (such as input handling, animation loops, and hardware observation) out of bloated element classes into dedicated, testable controller objects.
- **Composition over Inheritance:** Custom Elements must inherit from `HTMLElement` (or `LitElement`). Multiple inheritance is impossible in JavaScript. Controllers allow an element to aggregate multiple independent behaviors (e.g., resizing, orbit controls, and render loop subscriptions) using a "has-a" relationship instead of fragile, deep inheritance chains.
- **Lifecycle Integration:** Controllers tie directly into the host element's lifecycle hooks (`connectedCallback`, `disconnectedCallback`, and the reactive update pipeline), allowing automatic setup and teardown without requiring manual bookkeeping in the host element.
- **3D & WebGL Subsystems:** In a WebGL architecture, controllers bridge long-lived imperative resources (canvas surfaces, render loops, input devices, and WebGL contexts) into the declarative DOM.

---

## 2. The Reactive Controller Lifecycle & Host Coordination

### Core Interfaces

The Lit controller pattern relies on two core contracts defined in `lit`:
- `ReactiveController`: The interface implemented by the controller to hook into host lifecycle events.
- `ReactiveControllerHost`: The interface implemented by `LitElement` (and other reactive hosts) allowing controllers to register, deregister, and request host updates.

```ts
export interface ReactiveController {
    hostConnected?(): void;
    hostDisconnected?(): void;
    hostUpdate?(): void;
    hostUpdated?(): void;
}

export interface ReactiveControllerHost {
    addController(controller: ReactiveController): void;
    removeController(controller: ReactiveController): void;
    requestUpdate(): void;
    readonly updateComplete: Promise<boolean>;
}
```

### Lifecycle Hook Execution Sequence

Controllers registered on a host participate in the host's lifecycle in the order they were added via `addController`:

- **`hostConnected()`:**
  - **When Invoked:** Called when the host element is inserted into the DOM (inside `connectedCallback()`), after the host's own setup.
  - **Intended Responsibilities:** Attach global or window event listeners (`window.addEventListener`), instantiate hardware observers (`ResizeObserver`, `IntersectionObserver`), resume paused animation loops, and acquire external resources.
  - **Idempotency Rule:** Because an element can be detached and re-attached to the DOM multiple times, `hostConnected()` must be fully idempotent and support clean re-initialization.

- **`hostUpdate()`:**
  - **When Invoked:** Called during the reactive update pipeline immediately before the host element's `render()` method is evaluated.
  - **Intended Responsibilities:** Compute derived controller values, synchronize pre-render mathematical state (e.g., updating view matrices or calculating interpolated positions), or request additional property updates before the DOM is painted.

- **`hostUpdated()`:**
  - **When Invoked:** Called immediately after the host element has rendered and updated its DOM (following the host's `updated()` callback).
  - **Intended Responsibilities:** Perform post-render layout measurements, inspect updated DOM nodes, synchronize canvas backing store dimensions with updated style metrics, or trigger secondary effects dependent on rendered DOM elements.

- **`hostDisconnected()`:**
  - **When Invoked:** Called when the host element is removed from the DOM (inside `disconnectedCallback()`).
  - **Intended Responsibilities:** Remove all window and DOM event listeners, disconnect observers (`observer.disconnect()`), cancel pending `requestAnimationFrame` IDs, and release references to prevent memory leaks.

### Host Registration & Update Triggers

- **Registration Pattern:**
  - A controller typically stores a reference to its host in its constructor and registers itself immediately:
  ```ts
  export class AnimationLoopController implements ReactiveController {
      private readonly host: ReactiveControllerHost;

      public constructor(host: ReactiveControllerHost) {
          this.host = host;
          this.host.addController(this);
      }
  }
  ```
- **Triggering Host Updates via `host.requestUpdate()`:**
  - When internal controller state changes (e.g., input values change, window resizes, or an asset completes loading), the controller calls `this.host.requestUpdate()`.
  - This marks the host element as dirty and schedules a batched microtask render cycle, exactly as if a reactive `@property()` on the host had changed.
- **De-registration:**
  - If a controller's lifetime is shorter than the host element's lifetime, calling `host.removeController(this)` cleanly removes it from subsequent lifecycle notifications.

---

## 3. Composition vs. Inheritance

A recurring architectural flaw in complex Web Component libraries is the "God Element" inheritance hierarchy:

```
// ANTI-PATTERN: Deep, rigid inheritance hierarchy
HTMLElement
  └── BaseElement
        └── InteractiveElement (adds pointer listeners)
              └── ResizableElement (adds ResizeObserver)
                    └── WebGLCanvasElement (adds render loop)
                          └── SceneViewerElement (adds camera controls)
```

### Problems with Class Inheritance for Web Components:
- **Fragile Base Class:** Modifying `InteractiveElement` risks breaking every downstream subclass in unexpected ways.
- **Monolithic Bloat:** A subclass inherits all overhead and event listeners of its ancestors, even if it only needs one specific capability (e.g., an overlay needing resize tracking without pointer orbit controls).
- **Incompatible Branching:** What if an element needs `ResizableElement` behavior and audio playback behavior, but audio inherits from a different branch? JavaScript single inheritance cannot express this cleanly.

### The Controller Composition Model ("Has-A"):

```
// RECOMMENDED: Composable, focused controllers
SceneViewerElement (LitElement)
  ├── ResizeController (observes element / canvas boundaries)
  ├── AnimationLoopController (drives RAF ticks and calculates delta)
  ├── OrbitControlsController (interprets pointer drag to spherical angles)
  └── KeyboardInputController (tracks active WASD keys)
```

- Each controller has a single, well-defined responsibility.
- Controllers can be attached to any component implementing `ReactiveControllerHost`.
- Controllers can be tested independently in isolation with a lightweight mock host.
- Elements only pay for the capabilities they instantiate.

---

## 4. Concrete 3D/WebGL Controller Implementations

### 4.1 Animation Frame & Render Loop Subscriber Controller

Manages a high-performance `requestAnimationFrame` loop, computing delta time, elapsed time, and frame rates while automatically pausing when the host element is detached from the DOM.

```ts
// animation_loop_controller_types.ts
export type FrameCallback = (deltaTime: number, elapsedTime: number) => void;

export interface IAnimationLoopController {
    readonly isRunning: boolean;
    readonly fps: number;
    start(): void;
    stop(): void;
}
```

```ts
// animation_loop_controller.ts
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { FrameCallback, IAnimationLoopController } from "./animation_loop_controller_types";

export class AnimationLoopController implements ReactiveController, IAnimationLoopController {
    private readonly host: ReactiveControllerHost;
    private readonly onTick: FrameCallback;
    private frameId: number | null = null;
    private lastTimestamp: number = 0;
    private elapsed: number = 0;
    private frameCount: number = 0;
    private lastFpsCalculationTime: number = 0;
    private currentFps: number = 0;
    private running: boolean = false;

    public constructor(host: ReactiveControllerHost, onTick: FrameCallback) {
        this.host = host;
        this.onTick = onTick;
        this.host.addController(this);
    }

    public get isRunning(): boolean {
        return this.running;
    }

    public get fps(): number {
        return this.currentFps;
    }

    public hostConnected(): void {
        this.start();
    }

    public hostDisconnected(): void {
        this.stop();
    }

    public start(): void {
        if (this.running) {
            return;
        }
        this.running = true;
        this.lastTimestamp = performance.now();
        this.lastFpsCalculationTime = this.lastTimestamp;
        this.frameCount = 0;
        this.frameId = requestAnimationFrame(this.handleFrame);
    }

    public stop(): void {
        this.running = false;
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    private handleFrame = (timestamp: number): void => {
        if (!this.running) {
            return;
        }

        const rawDelta = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        // Clamp delta to prevent simulation explosion after backgrounding tab (max 100ms)
        const deltaTime = Math.min(rawDelta, 0.1);
        this.elapsed += deltaTime;

        // Calculate rolling FPS once per second
        this.frameCount++;
        if (timestamp - this.lastFpsCalculationTime >= 1000) {
            this.currentFps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsCalculationTime));
            this.frameCount = 0;
            this.lastFpsCalculationTime = timestamp;
            // Notify host to re-render if it displays an FPS counter
            this.host.requestUpdate();
        }

        this.onTick(deltaTime, this.elapsed);
        this.frameId = requestAnimationFrame(this.handleFrame);
    };
}
```

### 4.2 Viewport Resize & ResizeObserver Controller

Observes an element or canvas surface, computing physical device-pixel dimensions and aspect ratios, notifying the host element when layout changes occur.

```ts
// resize_controller_types.ts
export interface ViewportDimensions {
    readonly width: number;
    readonly height: number;
    readonly devicePixelRatio: number;
    readonly aspect: number;
}
```

```ts
// resize_controller.ts
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { ViewportDimensions } from "./resize_controller_types";

export interface ResizeControllerOptions {
    readonly target?: HTMLElement;
    readonly observeDevicePixelContentBox?: boolean;
}

export class ResizeController implements ReactiveController {
    private readonly host: ReactiveControllerHost & HTMLElement;
    private readonly options: ResizeControllerOptions;
    private observer: ResizeObserver | null = null;

    private currentDimensions: ViewportDimensions = {
        width: 1,
        height: 1,
        devicePixelRatio: 1,
        aspect: 1,
    };

    public constructor(host: ReactiveControllerHost & HTMLElement, options: ResizeControllerOptions = {}) {
        this.host = host;
        this.options = options;
        this.host.addController(this);
    }

    public get dimensions(): ViewportDimensions {
        return this.currentDimensions;
    }

    public hostConnected(): void {
        const target = this.options.target ?? this.host;
        this.observer = new ResizeObserver(this.handleResize);
        this.observer.observe(target);
        this.measureImmediate(target);
    }

    public hostDisconnected(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    private measureImmediate(target: HTMLElement): void {
        const rect = target.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.floor(rect.width * dpr));
        const height = Math.max(1, Math.floor(rect.height * dpr));

        this.currentDimensions = {
            width,
            height,
            devicePixelRatio: dpr,
            aspect: width / height,
        };
        this.host.requestUpdate();
    }

    private handleResize = (entries: ResizeObserverEntry[]): void => {
        const entry = entries[0];
        if (!entry) {
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        let width: number;
        let height: number;

        // Use devicePixelContentBoxSize when available for pixel-perfect canvas backing stores
        if (entry.devicePixelContentBoxSize && entry.devicePixelContentBoxSize.length > 0) {
            width = entry.devicePixelContentBoxSize[0].inlineSize;
            height = entry.devicePixelContentBoxSize[0].blockSize;
        } else {
            width = Math.max(1, Math.floor(entry.contentRect.width * dpr));
            height = Math.max(1, Math.floor(entry.contentRect.height * dpr));
        }

        if (width === this.currentDimensions.width && height === this.currentDimensions.height) {
            return;
        }

        this.currentDimensions = {
            width,
            height,
            devicePixelRatio: dpr,
            aspect: width / height,
        };

        this.host.requestUpdate();
    };
}
```

### 4.3 Pointer Lock & Mouse Orbit Interaction Controller

Translates mouse drag movements into spherical coordinates (azimuth, elevation, and radius) for 3D camera positioning, with optional Pointer Lock API support.

```ts
// orbit_controls_controller_types.ts
export interface SphericalCoordinates {
    readonly azimuth: number;
    readonly elevation: number;
    readonly radius: number;
}

export interface OrbitControlsOptions {
    readonly minElevation?: number;
    readonly maxElevation?: number;
    readonly minRadius?: number;
    readonly maxRadius?: number;
    readonly rotateSpeed?: number;
    readonly zoomSpeed?: number;
}
```

```ts
// orbit_controls_controller.ts
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { OrbitControlsOptions, SphericalCoordinates } from "./orbit_controls_controller_types";

export class OrbitControlsController implements ReactiveController {
    private readonly host: ReactiveControllerHost & HTMLElement;
    private readonly options: Required<OrbitControlsOptions>;

    private azimuth: number = 0;
    private elevation: number = 0.2;
    private radius: number = 10;
    private isDragging: boolean = false;
    private lastPointerX: number = 0;
    private lastPointerY: number = 0;

    public constructor(host: ReactiveControllerHost & HTMLElement, options: OrbitControlsOptions = {}) {
        this.host = host;
        this.options = {
            minElevation: options.minElevation ?? -Math.PI / 2 + 0.05,
            maxElevation: options.maxElevation ?? Math.PI / 2 - 0.05,
            minRadius: options.minRadius ?? 1,
            maxRadius: options.maxRadius ?? 100,
            rotateSpeed: options.rotateSpeed ?? 0.005,
            zoomSpeed: options.zoomSpeed ?? 0.05,
        };
        this.host.addController(this);
    }

    public get coordinates(): SphericalCoordinates {
        return {
            azimuth: this.azimuth,
            elevation: this.elevation,
            radius: this.radius,
        };
    }

    public hostConnected(): void {
        this.host.addEventListener("pointerdown", this.handlePointerDown);
        window.addEventListener("pointermove", this.handlePointerMove);
        window.addEventListener("pointerup", this.handlePointerUp);
        this.host.addEventListener("wheel", this.handleWheel, { passive: false });
    }

    public hostDisconnected(): void {
        this.host.removeEventListener("pointerdown", this.handlePointerDown);
        window.removeEventListener("pointermove", this.handlePointerMove);
        window.removeEventListener("pointerup", this.handlePointerUp);
        this.host.removeEventListener("wheel", this.handleWheel);
        this.isDragging = false;
    }

    private handlePointerDown = (event: PointerEvent): void => {
        if (event.button !== 0) {
            return;
        }
        this.isDragging = true;
        this.lastPointerX = event.clientX;
        this.lastPointerY = event.clientY;
        this.host.setPointerCapture(event.pointerId);
    };

    private handlePointerMove = (event: PointerEvent): void => {
        if (!this.isDragging) {
            return;
        }

        const deltaX = event.clientX - this.lastPointerX;
        const deltaY = event.clientY - this.lastPointerY;
        this.lastPointerX = event.clientX;
        this.lastPointerY = event.clientY;

        this.azimuth -= deltaX * this.options.rotateSpeed;
        this.elevation += deltaY * this.options.rotateSpeed;

        // Clamp elevation to avoid gimbal lock flipping
        this.elevation = Math.max(
            this.options.minElevation,
            Math.min(this.options.maxElevation, this.elevation)
        );

        this.host.requestUpdate();
    };

    private handlePointerUp = (event: PointerEvent): void => {
        if (this.isDragging) {
            this.isDragging = false;
            try {
                this.host.releasePointerCapture(event.pointerId);
            } catch {
                // Ignore if pointer capture already ended
            }
        }
    };

    private handleWheel = (event: WheelEvent): void => {
        event.preventDefault();
        const zoomDelta = Math.sign(event.deltaY) * this.options.zoomSpeed * this.radius;
        this.radius = Math.max(
            this.options.minRadius,
            Math.min(this.options.maxRadius, this.radius + zoomDelta)
        );
        this.host.requestUpdate();
    };
}
```

### 4.4 Keyboard & Input Device Controller

Tracks active pressed keys with anti-sticking safeguards (listening to `blur` and `visibilitychange`), computing normalized directional movement vectors for camera navigation.

```ts
// keyboard_controller_types.ts
export interface MovementVector {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}
```

```ts
// keyboard_controller.ts
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { MovementVector } from "./keyboard_controller_types";

export class KeyboardInputController implements ReactiveController {
    private readonly host: ReactiveControllerHost;
    private readonly activeKeys = new Set<string>();

    public constructor(host: ReactiveControllerHost) {
        this.host = host;
        this.host.addController(this);
    }

    public isKeyPressed(code: string): boolean {
        return this.activeKeys.has(code);
    }

    public getMovementVector(): MovementVector {
        let x = 0;
        let y = 0;
        let z = 0;

        // Forward / Backward (Z-axis in typical camera coordinates)
        if (this.activeKeys.has("KeyW") || this.activeKeys.has("ArrowUp")) z -= 1;
        if (this.activeKeys.has("KeyS") || this.activeKeys.has("ArrowDown")) z += 1;

        // Strafe Left / Right (X-axis)
        if (this.activeKeys.has("KeyA") || this.activeKeys.has("ArrowLeft")) x -= 1;
        if (this.activeKeys.has("KeyD") || this.activeKeys.has("ArrowRight")) x += 1;

        // Elevation Up / Down (Y-axis)
        if (this.activeKeys.has("KeyE") || this.activeKeys.has("Space")) y += 1;
        if (this.activeKeys.has("KeyQ") || this.activeKeys.has("ShiftLeft")) y -= 1;

        // Normalize movement vector if moving diagonally
        const length = Math.hypot(x, y, z);
        if (length > 0) {
            x /= length;
            y /= length;
            z /= length;
        }

        return { x, y, z };
    }

    public hostConnected(): void {
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
        window.addEventListener("blur", this.clearAllKeys);
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    public hostDisconnected(): void {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
        window.removeEventListener("blur", this.clearAllKeys);
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        this.clearAllKeys();
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        // Prevent key tracking during active text input in textareas or inputs
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
            return;
        }

        if (!this.activeKeys.has(event.code)) {
            this.activeKeys.add(event.code);
            this.host.requestUpdate();
        }
    };

    private handleKeyUp = (event: KeyboardEvent): void => {
        if (this.activeKeys.has(event.code)) {
            this.activeKeys.delete(event.code);
            this.host.requestUpdate();
        }
    };

    private clearAllKeys = (): void => {
        if (this.activeKeys.size > 0) {
            this.activeKeys.clear();
            this.host.requestUpdate();
        }
    };

    private handleVisibilityChange = (): void => {
        if (document.hidden) {
            this.clearAllKeys();
        }
    };
}
```

---

## 5. Integrating Multiple Controllers in a WebGL Element

The following example demonstrates how a single WebGL canvas element cleanly integrates the resize, animation loop, orbit controls, and keyboard controllers without code clutter:

```ts
// webgl_viewport_element.ts
import { LitElement, html, css, type PropertyValues } from "lit";
import { ResizeController } from "./resize_controller";
import { AnimationLoopController } from "./animation_loop_controller";
import { OrbitControlsController } from "./orbit_controls_controller";
import { KeyboardInputController } from "./keyboard_controller";

export class WebGLViewportElement extends LitElement {
    public static override styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
            touch-action: none;
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
        .stats-overlay {
            position: absolute;
            top: 8px;
            left: 8px;
            font-family: monospace;
            font-size: 12px;
            color: #00ffcc;
            pointer-events: none;
        }
    `;

    // 1. Controller composition: four focused controllers attached to this host
    private resize = new ResizeController(this);
    private orbit = new OrbitControlsController(this);
    private keyboard = new KeyboardInputController(this);
    private loop = new AnimationLoopController(this, (dt, elapsed) => this.renderFrame(dt, elapsed));

    private canvas: HTMLCanvasElement | null = null;
    private gl: WebGL2RenderingContext | null = null;

    protected override firstUpdated(): void {
        this.canvas = this.renderRoot.querySelector("canvas");
        if (this.canvas) {
            this.gl = this.canvas.getContext("webgl2");
        }
    }

    private renderFrame(deltaTime: number, elapsedTime: number): void {
        if (!this.gl || !this.canvas) {
            return;
        }

        // Synchronize canvas buffer with ResizeController measurements
        const dims = this.resize.dimensions;
        if (this.canvas.width !== dims.width || this.canvas.height !== dims.height) {
            this.canvas.width = dims.width;
            this.canvas.height = dims.height;
            this.gl.viewport(0, 0, dims.width, dims.height);
        }

        // Query movement and orbit states
        const move = this.keyboard.getMovementVector();
        const coords = this.orbit.coordinates;

        // Perform clear pass & 3D rendering using controller inputs
        this.gl.clearColor(0.05, 0.05, 0.08, 1.0);
        this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);

        // WebGL draw calls execute here using coords, move, dt, and elapsed
    }

    protected override render() {
        return html`
            <canvas></canvas>
            <div class="stats-overlay">
                FPS: ${this.loop.fps} | Dims: ${this.resize.dimensions.width}x${this.resize.dimensions.height}
            </div>
        `;
    }
}
```

---

## 6. Testing Controllers in Isolation

Because reactive controllers rely on `ReactiveControllerHost`, they can be thoroughly unit tested without instantiating complex DOM trees or booting an entire custom element.

### Lightweight Mock Host Fixture

Adhering to [unit_testing_guidelines.md](unit_testing_guidelines.md), create a lightweight mock host:

```ts
// test/fixtures/mock_controller_host.ts
import { vi } from "vitest";
import type { ReactiveController, ReactiveControllerHost } from "lit";

export class MockControllerHost implements ReactiveControllerHost {
    public readonly controllers: ReactiveController[] = [];
    public updateRequestedCount: number = 0;
    public updateComplete: Promise<boolean> = Promise.resolve(true);

    public addController(controller: ReactiveController): void {
        this.controllers.push(controller);
    }

    public removeController(controller: ReactiveController): void {
        const index = this.controllers.indexOf(controller);
        if (index !== -1) {
            this.controllers.splice(index, 1);
        }
    }

    public requestUpdate(): void {
        this.updateRequestedCount++;
    }

    public triggerConnected(): void {
        for (const controller of this.controllers) {
            controller.hostConnected?.();
        }
    }

    public triggerDisconnected(): void {
        for (const controller of this.controllers) {
            controller.hostDisconnected?.();
        }
    }

    public triggerUpdate(): void {
        for (const controller of this.controllers) {
            controller.hostUpdate?.();
        }
    }

    public triggerUpdated(): void {
        for (const controller of this.controllers) {
            controller.hostUpdated?.();
        }
    }
}
```

### Unit Test Example

```ts
// keyboard_controller.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KeyboardInputController } from "./keyboard_controller";
import { MockControllerHost } from "./test/fixtures/mock_controller_host";

describe("KeyboardInputController", () => {
    let host: MockControllerHost;
    let controller: KeyboardInputController;

    beforeEach(() => {
        host = new MockControllerHost();
        controller = new KeyboardInputController(host);
        host.triggerConnected();
    });

    afterEach(() => {
        host.triggerDisconnected();
    });

    it("registers itself on the host upon creation", () => {
        expect(host.controllers).toContain(controller);
    });

    it("tracks keydown and keyup events to update active keys", () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
        expect(controller.isKeyPressed("KeyW")).toBe(true);
        expect(host.updateRequestedCount).toBe(1);

        window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
        expect(controller.isKeyPressed("KeyW")).toBe(false);
        expect(host.updateRequestedCount).toBe(2);
    });

    it("calculates normalized forward diagonal movement vector correctly", () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" })); // z = -1
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" })); // x = +1

        const move = controller.getMovementVector();
        const expected = 1 / Math.SQRT2;
        expect(move.x).toBeCloseTo(expected);
        expect(move.y).toBe(0);
        expect(move.z).toBeCloseTo(-expected);
    });

    it("clears all active keys on window blur to prevent sticky inputs", () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA" }));
        expect(controller.isKeyPressed("KeyA")).toBe(true);

        window.dispatchEvent(new Event("blur"));
        expect(controller.isKeyPressed("KeyA")).toBe(false);
        expect(controller.getMovementVector()).toEqual({ x: 0, y: 0, z: 0 });
    });
});
```

---

## 7. Guidelines & Traps to Avoid

- **Avoid Infinite Update Loops:**
  - Never call `this.host.requestUpdate()` inside `hostUpdate()` or `hostUpdated()` unless guarded by strict condition checks. Doing so will schedule a continuous stream of microtask updates and trigger browser execution halts or stack overflows.
- **Always Clean Up Listeners in `hostDisconnected()`:**
  - Event listeners attached to `window` or `document` retain the controller in memory via closures if not explicitly detached in `hostDisconnected()`, creating severe memory leaks.
- **Design for Idempotency:**
  - In dynamic applications, elements are frequently detached and re-attached (e.g., when switching tabs, re-parenting elements, or slotting into views). Ensure `hostConnected()` cleanly reinitializes state without assuming it is only called once.
- **Export Types in Dedicated `*_types.ts` Files:**
  - Always decouple controller configuration options, state types, and callback signatures into companion `*_types.ts` files according to [typescript_guidelines.md](typescript_guidelines.md).
- **Keep Controllers Non-Visual:**
  - Reactive controllers should not return HTML or manage template trees. If a unit of logic requires rendering DOM structure, it belongs in a dedicated Custom Element or a Lit template directive.
