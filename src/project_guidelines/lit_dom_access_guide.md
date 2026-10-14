# Lit DOM Access, Shadow Roots & Light DOM Guide

A comprehensive architectural and practical guide for querying elements, managing projected slotted content, utilizing template refs, and selecting between Shadow DOM and Light DOM rendering in this codebase.

---

## 1. Overview & Architectural Role

Lit elements manage their internal rendering tree via an abstraction called the `renderRoot`. By default, `renderRoot` points to an isolated Shadow Root attached to the custom element host. However, in advanced architectures—especially high-performance 3D scene graphs and WebGL controllers—elements may selectively render directly into the Light DOM.

This guide details:
- **The Query Decorator Suite:** Declarative querying of shadow and light trees via `@query()`, `@queryAll()`, and `@queryAsync()`.
- **Projected Content & Slotted DOM:** Inspecting and responding to user-projected nodes with `@queryAssignedElements()`, `@queryAssignedNodes()`, and `@slotchange` events.
- **Template References (`ref` Directive):** High-efficiency imperative element binding using `createRef()` and callback refs.
- **Light DOM vs. Shadow DOM Selection:** When and why to override `createRenderRoot()` for 3D scene graphs and when to preserve Shadow DOM encapsulation for UI widgets.
- **Lifecycle Timing & Query Safety:** Preventing runtime errors by timing DOM lookups to valid post-render lifecycle phases.

---

## 2. The Query Decorator Suite

Lit provides declarative TypeScript property decorators that convert property accessors into DOM queries against the element's `renderRoot`.

### `@query(selector, cache?)`
Retrieves the first element matching the CSS selector within `this.renderRoot`.

```ts
import { LitElement, html } from "lit";
import { query } from "lit/decorators.js";

export class ViewportElement extends LitElement {
    @query("#render-surface")
    private canvasElement!: HTMLCanvasElement;

    @query(".overlay-panel", true) // cached = true
    private cachedOverlay!: HTMLDivElement;

    protected override render() {
        return html`
            <div class="overlay-panel">HUD</div>
            <canvas id="render-surface"></canvas>
        `;
    }
}
```

- **Execution:** Behind the scenes, `@query(selector)` transforms the property into a getter:
  ```ts
  get canvasElement() {
      return this.renderRoot?.querySelector("#render-surface") ?? null;
  }
  ```
- **Caching (`cache = true`):**
  - When `cache: true` is passed as the second argument, the decorator executes `querySelector()` once on first access and stores the reference in an internal private field.
  - *Best Practice:* Use `cache: true` only for static, non-conditional DOM nodes that remain present throughout the element's lifecycle. Never cache elements that may be conditionally rendered via ternary expressions or directives.

### `@queryAll(selector)`
Queries all matching elements within `this.renderRoot` and returns a static `NodeListOf<Element>`.

```ts
import { LitElement, html } from "lit";
import { queryAll } from "lit/decorators.js";

export class ToolPaletteElement extends LitElement {
    @queryAll("button.tool-btn")
    private toolButtons!: NodeListOf<HTMLButtonElement>;

    public disableAllTools(): void {
        this.toolButtons.forEach((button) => {
            button.disabled = true;
        });
    }

    protected override render() {
        return html`
            <button class="tool-btn">Select</button>
            <button class="tool-btn">Translate</button>
            <button class="tool-btn">Rotate</button>
        `;
    }
}
```

- **Getter Semantics:** `@queryAll` executes `this.renderRoot.querySelectorAll(selector)` fresh on every property access. It does not cache the NodeList.

### `@queryAsync(selector)`
Returns a `Promise` that resolves to the matching element after the pending reactive update cycle completes.

```ts
import { LitElement, html } from "lit";
import { property, queryAsync } from "lit/decorators.js";

export class ModalDialogElement extends LitElement {
    @property({ type: Boolean })
    public isOpen = false;

    @queryAsync("#confirm-action")
    private confirmButton!: Promise<HTMLButtonElement | null>;

    public async focusConfirmation(): Promise<void> {
        this.isOpen = true; // schedules an asynchronous update cycle

        // Awaits this.updateComplete and queries the element once rendered
        const button = await this.confirmButton;
        button?.focus();
    }

    protected override render() {
        if (!this.isOpen) {
            return html``;
        }

        return html`
            <div class="dialog">
                <button id="confirm-action">Confirm</button>
            </div>
        `;
    }
}
```

- **Coordination with `updateComplete`:**
  - `@queryAsync` is specifically designed for elements that are conditionally rendered or rendered asynchronously via directives (like `until()` or `cache()`).
  - It automatically awaits `this.updateComplete` before executing `this.renderRoot.querySelector()`, eliminating manual `await this.updateComplete` boilerplate.

---

## 3. Projected Content & Slotted DOM

In Shadow DOM components, child elements passed between the custom element's opening and closing tags are projected into `<slot>` elements. These elements reside in the host element's **Light DOM**, not the Shadow Root. Consequently, standard `@query()` lookups will NOT find them.

Lit provides specialized decorators to query projected slotted nodes.

### `@queryAssignedElements({ slot?, selector?, flatten? })`
Retrieves an array of child `Element` nodes distributed to a specific `<slot>`.

```ts
import { LitElement, html } from "lit";
import { queryAssignedElements } from "lit/decorators.js";

export class TabContainerElement extends LitElement {
    // Queries all elements assigned to the default unnamed slot
    @queryAssignedElements({ selector: "rj-tab-panel" })
    private panels!: Array<HTMLElement>;

    // Queries elements assigned to a named slot
    @queryAssignedElements({ slot: "header", selector: "rj-tab-button" })
    private tabHeaders!: Array<HTMLButtonElement>;

    protected override render() {
        return html`
            <div class="tab-bar">
                <slot name="header"></slot>
            </div>
            <div class="tab-content">
                <slot></slot>
            </div>
        `;
    }
}
```

- **Options Configuration:**
  - `slot`: Optional string matching the slot's `name` attribute. Omit to query the default unnamed slot.
  - `selector`: Optional CSS selector to filter the assigned elements (e.g., only elements matching `rj-tab-panel`).
  - `flatten`: Boolean (default `false`). If `true`, traverses through nested slot chains to find deeply projected elements.

### `@queryAssignedNodes({ slot?, flatten? })`
Similar to `@queryAssignedElements()`, but returns all assigned DOM `Node` instances, including text nodes, comments, and element nodes.

```ts
import { LitElement, html } from "lit";
import { queryAssignedNodes } from "lit/decorators.js";

export class LabelWrapperElement extends LitElement {
    @queryAssignedNodes({ slot: "label" })
    private labelNodes!: Array<Node>;

    protected override render() {
        return html`<label><slot name="label"></slot></label>`;
    }
}
```

### Reacting to Slot Changes via `@slotchange`
Slotted content can be added, removed, or replaced by consumers at any time. To react dynamically to projection mutations, attach an `@slotchange` event listener:

```ts
import { LitElement, html } from "lit";
import { queryAssignedElements } from "lit/decorators.js";

export class CarouselElement extends LitElement {
    @queryAssignedElements({ selector: "img, picture" })
    private slides!: Array<HTMLElement>;

    private handleSlotChange(): void {
        console.log(`Carousel updated: ${this.slides.length} slides detected.`);
        this.recalculateDimensions();
    }

    private recalculateDimensions(): void {
        // Measure and arrange slides
    }

    protected override render() {
        return html`
            <div class="carousel-track">
                <slot @slotchange=${this.handleSlotChange}></slot>
            </div>
        `;
    }
}
```

> [!NOTE]
> The `@slotchange` event fires exclusively on `<slot>` elements when direct child assigned nodes change. It does not bubble outside the Shadow Root.

---

## 4. Template References via `ref()` Directive

While `@query()` performs CSS selector queries against `renderRoot`, the `ref()` directive (`lit/directives/ref.js`) creates a direct, strongly-typed programmatic pointer to a DOM node during template execution.

### Advantages of `ref()` over `@query()`
- **Zero Query Overhead:** Avoids selector parsing and DOM tree traversal; binds directly to the created DOM node.
- **Resilient to Renaming:** Immune to CSS class or ID renames.
- **Dynamic Array & Loop References:** Can be captured inside loops and mapped templates.

### Object References with `createRef<T>()`
Use `createRef<T>()` to create a reference container holding a `.value` property:

```ts
import { LitElement, html } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import type { Ref } from "lit/directives/ref.js";

export class CanvasRendererElement extends LitElement {
    private canvasRef: Ref<HTMLCanvasElement> = createRef();

    protected override firstUpdated(): void {
        // Safe access after first render
        const canvas = this.canvasRef.value;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx?.fillRect(0, 0, 100, 100);
        }
    }

    protected override render() {
        return html`
            <div class="canvas-container">
                <canvas ${ref(this.canvasRef)} width="800" height="600"></canvas>
            </div>
        `;
    }
}
```

### Callback References
Instead of passing a `Ref` object, pass a callback function to `ref()`. Lit invokes the callback with the DOM element when it mounts, and invokes it with `undefined` when the element is destroyed or unmounted:

```ts
import { LitElement, html } from "lit";
import { ref } from "lit/directives/ref.js";

export class DynamicObserverElement extends LitElement {
    private resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            console.log("Measured size:", entry.contentRect);
        }
    });

    private handleElementLifecycle(element: Element | undefined): void {
        if (element) {
            // Mounted: begin observation
            this.resizeObserver.observe(element);
        } else {
            // Unmounted: stop observation
            this.resizeObserver.disconnect();
        }
    }

    public override disconnectedCallback(): void {
        this.resizeObserver.disconnect();
        super.disconnectedCallback();
    }

    protected override render() {
        return html`
            <div class="observed-box" ${ref(this.handleElementLifecycle)}>
                Resizable content
            </div>
        `;
    }
}
```

---

## 5. Light DOM vs. Shadow DOM Architecture

By default, every `LitElement` invokes `this.attachShadow({ mode: "open" })` and assigns the shadow root to `this.renderRoot`. However, Lit allows full control over root creation by overriding `createRenderRoot()`.

### Overriding `createRenderRoot()` for Light DOM
```ts
export class SceneNodeElement extends LitElement {
    protected override createRenderRoot(): HTMLElement {
        // Render directly into the host element's Light DOM
        return this;
    }
}
```

### Why 3D Scene Graph Elements Use Light DOM
In this project, non-visual structural elements (`<rj-scene>`, `<rj-perspective-camera>`, `<rj-scene-group>`, `<rj-scene-node>`) render into Light DOM rather than Shadow DOM:

- **Natural DOM Traversal:**
  - In a 3D scene hierarchy, elements frequently coordinate with parent and child DOM nodes. Light DOM allows natural standard browser methods:
    ```ts
    const parent = this.parentElement;
    const scene = this.closest("rj-scene");
    ```
  - In contrast, Shadow DOM creates encapsulation barriers that break `closest()` and hide children behind shadow roots.
- **Zero Projection Overhead:**
  - Child elements placed inside `<rj-scene-group><rj-mesh-instance /></rj-scene-group>` exist directly as actual DOM children rather than projected slot assignments.
  - No `<slot></slot>` management is required.
- **Simplified DOM Inspector Debugging:**
  - Developers inspecting the DOM tree in browser DevTools see the clean, unnested hierarchical structure of the 3D scene graph without expanding dozens of nested Shadow Roots.

### When Shadow DOM is Required
Shadow DOM remains the mandatory choice for:
- **Visual UI Widgets & Controls:** (e.g., `<rj-viewport-hud>`, `<rj-material-editor>`, `<rj-stats-overlay>`).
- **Encapsulated Styles:** Scoping CSS styles so component styling never leaks into the host page or vice-versa.
- **Slot Composition:** When complex internal DOM structures require projecting external user markup into specific layout slots.

---

## 6. DOM Lifecycle Timing & Query Safety Rules

A frequent bug in custom element development is attempting to query DOM elements before they have been created. Understanding Lit's lifecycle timing is critical.

### Lifecycle Phases & DOM Availability
- **`constructor()`:**
  - *DOM Status:* Empty host element. `renderRoot` does not exist yet.
  - *Rule:* NEVER perform DOM queries or inspect attributes.
- **`connectedCallback()`:**
  - *DOM Status:* Element attached to parent, but initial template has NOT rendered.
  - *Rule:* Attach global window listeners or context consumers. Do NOT query template children or `renderRoot` elements.
- **`willUpdate()`:**
  - *DOM Status:* Pre-render calculations. Runs before `render()`.
  - *Rule:* Derive reactive properties. DOM has not been updated yet.
- **`render()`:**
  - *DOM Status:* Pure declarative template definition.
  - *Rule:* Return `TemplateResult`. Never perform side-effecting DOM queries here.
- **`firstUpdated(changedProperties)`:**
  - *DOM Status:* Initial template DOM has been instantiated and mounted into `renderRoot`.
  - *Rule:* **Safe for DOM queries.** Ideal for one-time initialization: attaching WebGL contexts to canvas elements, initializing `ResizeObserver`, measuring initial dimensions, or configuring third-party libraries.
- **`updated(changedProperties)`:**
  - *DOM Status:* DOM has been re-rendered to reflect changed properties.
  - *Rule:* Safe for DOM queries and bounding box measurements. If mutating a reactive property here, guard it with conditional checks to avoid infinite loops.

### Coordinating Asynchronous Queries with `updateComplete`
If an element's DOM is affected by a property change, query it only after awaiting `updateComplete`:

```ts
public async selectTab(index: number): Promise<void> {
    this.activeIndex = index;

    // Wait for the render pass to update DOM nodes
    await this.updateComplete;

    // Now query the active DOM element safely
    const activeTab = this.renderRoot.querySelector(".tab.active") as HTMLElement;
    activeTab?.scrollIntoView({ behavior: "smooth" });
}
```

---

## 7. Architectural Rules & Best Practices

- **Explicit Type Assertions on Queries:**
  - Always provide the concrete TypeScript DOM element type on queries (e.g., `@query("canvas") canvas!: HTMLCanvasElement;`).
- **Check for Nullability on Dynamic Nodes:**
  - Any element that is conditionally rendered via `if`, ternary expressions, or directives must be typed as nullable (e.g., `HTMLElement | null`) and guarded before dereferencing.
- **Prefer `ref()` for Critical Native Handles:**
  - For critical native elements like `<canvas>`, prefer `ref(this.canvasRef)` over CSS selectors. It prevents bugs if IDs or class names change.
- **Light DOM for Scene Graph Nodes:**
  - Non-visual structural elements building 3D graphs must override `createRenderRoot() { return this; }`.
- **Shadow DOM for Scoped UI:**
  - Visual UI components with CSS styling must retain Shadow DOM encapsulation.
