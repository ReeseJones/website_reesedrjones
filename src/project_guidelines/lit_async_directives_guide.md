# Async Directives and Streaming Data in Lit

A comprehensive architectural guide to authoring asynchronous, streaming, and out-of-band DOM directives in Lit, covering the `AsyncDirective` lifecycle, built-in utilities (`until`, `suspend`), micro-DOM updates via `setValue()`, and custom streaming patterns for WebGL and real-time event feeds.

---

## 1. Overview & Architectural Role

Directives in Lit are functions that customize how expressions are packaged and rendered into DOM parts (`ChildPart`, `AttributePart`, `PropertyPart`, etc.).

While standard Lit components schedule asynchronous render cycles for the entire element via `requestUpdate()`, **Async Directives** operate directly at the individual DOM node level:
- **Targeted Micro-Updates:** An `AsyncDirective` can push new values directly into its bound DOM part using `this.setValue(value)` without causing the parent component to re-render, run its `render()` function, or diff other parts of its template.
- **Independent Lifecycle:** An `AsyncDirective` tracks its own connection to the DOM, handling disconnection and reconnection independently of the host element's top-level state.
- **Ideal Use Cases:** High-frequency telemetry streams, asynchronous GPU buffer/texture readbacks, WebSocket message pipes, and deferred network resource loading.

---

## 2. Directive Architecture & The `AsyncDirective` Lifecycle

Lit differentiates between two foundational directive classes:

- **Synchronous `Directive` (`lit/directive.js`):**
  - Evaluates synchronously during the host element's template evaluation.
  - Receives arguments in `render(...args)` and must synchronously return a renderable value (or `noChange` / `nothing`).
  - Cannot push future updates out-of-band.
- **Asynchronous `AsyncDirective` (`lit/async-directive.js`):**
  - Inherits from `Directive` and maintains state across template evaluations.
  - Can initiate background promises, timers, or observable subscriptions.
  - Can push updates at any arbitrary moment via `this.setValue(value)`.
  - Notified when its enclosing DOM part connects or disconnects.

---

### The `AsyncDirective` Lifecycle Sequence

An `AsyncDirective` participates in a well-defined lifecycle managed by Lit's template engine:

- **1. `constructor(partInfo: PartInfo)`:**
  - Invoked once when the directive expression is first parsed into a DOM part.
  - Inspects `partInfo.type` (`PartType.CHILD`, `PartType.ATTRIBUTE`, `PartType.PROPERTY`, `PartType.BOOLEAN_ATTRIBUTE`, `PartType.EVENT`).
  - Allows throwing an error if the directive is bound to an unsupported part type.
- **2. `update(part: Part, props: unknown[]): unknown`:**
  - Called whenever the host component re-renders and the template expression containing the directive is evaluated.
  - Receives the concrete `Part` and the array of current arguments passed to the directive.
  - Can inspect previous arguments, start or cancel asynchronous operations, and either return an immediate placeholder value or delegate to `this.render(...props)`.
- **3. `render(...args: unknown[]): unknown`:**
  - The pure projection contract of the directive.
  - Synchronously returns the initial value or placeholder for the current render pass.
  - Must define a function signature that matches the arguments accepted by the directive factory.
  - Also executes in Server-Side Rendering (SSR) environments where DOM parts are not connected.
- **4. `this.setValue(value: unknown): void`:**
  - Pushes an asynchronous value directly to the bound DOM part.
  - Updates the DOM immediately without invoking the parent component's `update()` or `render()` methods.
  - Must only be called while `this.isConnected === true`.
- **5. `this.isConnected: boolean`:**
  - Reflects whether the directive's target DOM part is currently connected to the live document DOM tree.
- **6. `disconnected(): void`:**
  - Invoked when the containing DOM subtree is detached from the document (e.g., when removed by a conditional template, virtualizer windowing, or tab switch).
  - **Critical Responsibility:** Must unsubscribe from observables, abort ongoing network/fetch requests, clear intervals, and pause GPU fence polling to prevent memory leaks.
- **7. `reconnected(): void`:**
  - Invoked if the DOM subtree is re-attached to the active document without being re-created.
  - Re-establishes subscriptions, event listeners, and data pipelines that were suspended in `disconnected()`.

---

## 3. Built-in Asynchronous Directives

Lit includes built-in asynchronous directives designed for promise coordination and fallback rendering.

### The `until()` Directive (`lit/directives/until.js`)

`until()` renders placeholder content while waiting for one or more Promises to resolve. It accepts a list of arguments ordered by descending priority:

```typescript
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { until } from "lit/directives/until.js";

interface ShaderCompilationMetadata {
  readonly programId: string;
  readonly compileTimeMs: number;
}

@customElement("shader-inspector")
export class ShaderInspector extends LitElement {
  @property({ attribute: false })
  public compilationPromise?: Promise<ShaderCompilationMetadata>;

  protected override render(): TemplateResult {
    return html`
      <div class="shader-card">
        <h3>GLSL Program Status</h3>
        <div class="status-body">
          ${until(
            this.compilationPromise?.then(
              (meta) => html`
                <div class="success">
                  Program <code>${meta.programId}</code> linked in ${meta.compileTimeMs}ms.
                </div>
              `,
            ),
            html`<div class="loading-state">Compiling GLSL pipeline shaders...</div>`,
          )}
        </div>
      </div>
    `;
  }
}
```

- **Resolution Chaining:** You can pass multiple arguments in descending priority: `until(primaryPromise, cachedPromise, fallbackTemplate)`.
- **Race Condition Safety:** If `primaryPromise` takes longer to resolve than a subsequent promise passed on a later render, `until()` ensures that earlier, stale promises are discarded and never overwrite newer data.

---

### Suspense Coordination

In modern web component architectures, async directives coordinate with suspense containers (such as `@lit-labs/suspend`):
- Rather than displaying localized spinners, child components or directives can signal pending asynchronous work up the DOM tree to a common boundary.
- An async directive throws or signals a promise to the nearest suspense controller, which replaces the subtree with a unified fallback UI until all nested promises settle.

---

## 4. Authoring Custom Async Directives

Custom async directives are created by extending `AsyncDirective` and wrapping the class with the `directive()` factory.

### Pattern A: Real-Time Stream / Observable Directive

This directive subscribes to an external stream or observable, streaming real-time values directly into a DOM part without triggering full component re-renders:

```typescript
import { directive, type PartInfo, PartType } from "lit/directive.js";
import { AsyncDirective } from "lit/async-directive.js";
import { noChange } from "lit";

export interface ObservableStream<T> {
  subscribe(observer: {
    next: (value: T) => void;
    error?: (err: unknown) => void;
    complete?: () => void;
  }): { unsubscribe(): void };
}

class ObserveStreamDirective extends AsyncDirective {
  private _observable?: ObservableStream<unknown>;
  private _subscription?: { unsubscribe(): void };

  public constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD && partInfo.type !== PartType.PROPERTY) {
      throw new Error("observeStream directive can only be used in child or property bindings.");
    }
  }

  public render<T>(observable?: ObservableStream<T>, fallback: unknown = noChange): unknown {
    return fallback;
  }

  public override update<T>(
    _part: unknown,
    [observable, fallback]: [ObservableStream<T> | undefined, unknown?],
  ): unknown {
    // If the observable source has changed, switch subscriptions
    if (this._observable !== observable) {
      this._teardown();
      this._observable = observable;

      if (this.isConnected && observable) {
        this._subscribe(observable);
      }
    }

    return this.render(observable, fallback);
  }

  protected override disconnected(): void {
    // Prevent memory leaks when element leaves DOM
    this._teardown();
  }

  protected override reconnected(): void {
    // Resume streaming when element re-enters DOM
    if (this._observable) {
      this._subscribe(this._observable);
    }
  }

  private _subscribe(observable: ObservableStream<unknown>): void {
    this._subscription = observable.subscribe({
      next: (val: unknown) => {
        if (this.isConnected) {
          // Direct micro-update to the bound DOM node
          this.setValue(val);
        }
      },
      error: (err: unknown) => {
        console.error("Stream directive error:", err);
      },
    });
  }

  private _teardown(): void {
    if (this._subscription) {
      this._subscription.unsubscribe();
      this._subscription = undefined;
    }
  }
}

export const observeStream = directive(ObserveStreamDirective);
```

#### Usage in Component Template:
```typescript
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { observeStream, type ObservableStream } from "./observe_stream_directive.js";

@customElement("telemetry-counter")
export class TelemetryCounter extends LitElement {
  @property({ attribute: false })
  public fpsStream?: ObservableStream<number>;

  protected override render(): TemplateResult {
    // fpsStream pushes 60 times/sec, but only the <span> text node updates!
    // TelemetryCounter never calls its own render() method during ticks.
    return html`
      <div class="counter-badge">
        <span>FPS: ${observeStream(this.fpsStream, "--")}</span>
      </div>
    `;
  }
}
```

---

### Pattern B: WebGL Async GPU Readback Directive

In high-performance graphics, synchronous GPU pixel readbacks (`gl.readPixels()`) stall the CPU pipeline and cause frame drops. Using WebGL2 Pixel Buffer Objects (PBO) with sync fences (`glFenceSync`) allows non-blocking asynchronous readbacks. 

An async directive is the perfect abstraction to bridge GPU completion back into the DOM:

```typescript
import { directive, type PartInfo, PartType } from "lit/directive.js";
import { AsyncDirective } from "lit/async-directive.js";
import { noChange } from "lit";

export interface GpuReadbackTask {
  readonly gl: WebGL2RenderingContext;
  readonly sync: WebGLSync;
  readonly buffer: WebGLBuffer;
  readonly byteLength: number;
}

class GpuPixelReadbackDirective extends AsyncDirective {
  private _activeTask?: GpuReadbackTask;
  private _pollHandle?: number;
  private _taskEpoch = 0;

  public constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) {
      throw new Error("gpuPixelReadback directive must be used in a child binding.");
    }
  }

  public render(_task?: GpuReadbackTask, placeholder: unknown = "Reading GPU..."): unknown {
    return placeholder;
  }

  public override update(
    _part: unknown,
    [task, placeholder]: [GpuReadbackTask | undefined, unknown?],
  ): unknown {
    if (this._activeTask !== task) {
      this._cleanup();
      this._activeTask = task;
      this._taskEpoch++;

      if (this.isConnected && task) {
        this._pollGpuSync(task, this._taskEpoch);
      }
    }
    return this.render(task, placeholder);
  }

  protected override disconnected(): void {
    this._cleanup();
  }

  protected override reconnected(): void {
    if (this._activeTask) {
      this._taskEpoch++;
      this._pollGpuSync(this._activeTask, this._taskEpoch);
    }
  }

  private _pollGpuSync(task: GpuReadbackTask, epoch: number): void {
    const { gl, sync } = task;

    const checkFence = (): void => {
      // Discard polling if directive disconnected or task superseded
      if (!this.isConnected || epoch !== this._taskEpoch) {
        return;
      }

      const status = gl.clientWaitSync(sync, 0, 0);

      if (
        status === WebGL2RenderingContext.ALREADY_SIGNALED ||
        status === WebGL2RenderingContext.CONDITION_SATISFIED
      ) {
        // GPU finished writing to PBO without stalling CPU
        gl.bindBuffer(WebGL2RenderingContext.PIXEL_PACK_BUFFER, task.buffer);
        const output = new Uint8Array(task.byteLength);
        gl.getBufferSubData(WebGL2RenderingContext.PIXEL_PACK_BUFFER, 0, output);
        gl.bindBuffer(WebGL2RenderingContext.PIXEL_PACK_BUFFER, null);

        // Update DOM node with pixel statistics directly
        this.setValue(`Sampled ${output.length} bytes [R:${output[0]} G:${output[1]} B:${output[2]}]`);
      } else {
        // Re-check next animation frame
        this._pollHandle = requestAnimationFrame(checkFence);
      }
    };

    this._pollHandle = requestAnimationFrame(checkFence);
  }

  private _cleanup(): void {
    if (this._pollHandle !== undefined) {
      cancelAnimationFrame(this._pollHandle);
      this._pollHandle = undefined;
    }
  }
}

export const gpuPixelReadback = directive(GpuPixelReadbackDirective);
```

---

### Pattern C: Race Condition Prevention & Safe Discarding

When authoring directives that handle asynchronous promises or fetch requests, arguments may change while a previous promise is still in-flight. Without proper guards, responses will resolve out of order and overwrite fresh state with stale data.

- **Sequence / Epoch Counter:**
  - Maintain an internal sequence counter (e.g., `this._requestEpoch = 0`).
  - Increment the counter on every `update()` call.
  - In the promise resolution callback, compare the captured counter value against `this._requestEpoch`. If they do not match, discard the result immediately.
- **`AbortController` Signal Management:**
  - Instantiate an `AbortController` when starting a fetch or cancellable operation.
  - Call `this._abortController.abort()` inside `disconnected()` and when starting a new operation in `update()`.
- **`this.isConnected` Checking:**
  - Always verify `if (this.isConnected)` before invoking `this.setValue()`.
  - Calling `setValue()` on a disconnected directive throws an error in modern Lit runtimes.

```typescript
// Exemplary epoch and connection verification pattern
private async _loadResource(url: string, epoch: number): Promise<void> {
  try {
    const response = await fetch(url);
    const data = await response.json();

    // Guard against race conditions and unmounts
    if (!this.isConnected || epoch !== this._requestEpoch) {
      return; // Discard outdated response
    }

    this.setValue(this._formatData(data));
  } catch (err: unknown) {
    if (this.isConnected && epoch === this._requestEpoch) {
      this.setValue("Failed to load resource.");
    }
  }
}
```

---

## 5. Architectural Decision: AsyncDirective vs. ReactiveController

Lit offers two primary ways to encapsulate non-visual asynchronous logic: **Reactive Controllers** and **Async Directives**. Choosing between them depends on scope and update granularity:

- **Use a Reactive Controller (`ReactiveController`) when:**
  - The asynchronous state impacts multiple template expressions across the host element.
  - The logic manages host-level concerns (e.g., resizing observers, keyboard shortcuts, window event listeners).
  - You want the host element to trigger its standard lifecycle (`willUpdate()`, `updated()`) and re-evaluate its entire template.
- **Use an Async Directive (`AsyncDirective`) when:**
  - The asynchronous state belongs strictly to a single DOM part or text node.
  - High-frequency data streams (e.g., 60 FPS sensor feeds, audio meters) would cause excessive CPU thrashing if re-rendering the whole component.
  - You are authoring a portable template helper usable inside any component's `html` literal without requiring the component to install a controller.

---

## 6. Related Guidelines

- Core Lit conventions and element standards: [lit_guidelines.md](lit_guidelines.md)
- Architectural quick reference and lifecycle cheat sheet: [lit_cheat_sheet.md](lit_cheat_sheet.md)
- Reactive controllers and lifecycle encapsulation: [lit_controllers_guide.md](lit_controllers_guide.md)
- Working with lists, iteration, and virtualizer: [lit_lists_and_iteration_guide.md](lit_lists_and_iteration_guide.md)
- WebGL pipeline and context management: [webgl_guidelines.md](webgl_guidelines.md)
- Unit testing guidelines: [unit_testing_guidelines.md](unit_testing_guidelines.md)
