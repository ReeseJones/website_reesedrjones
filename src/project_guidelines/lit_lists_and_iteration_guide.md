# Working with Lists, Iterables, and Virtualization in Lit

A comprehensive guide to iterating, diffing, and virtualizing collections in Lit web components, covering built-in iteration helpers, differential keyed rendering with `repeat()`, and high-density viewport windowing with `@lit-labs/virtualizer`.

---

## 1. Overview & Architectural Strategy

Rendering dynamic collections is a critical performance path for single-page applications, telemetry dashboards, scene graph inspectors, and WebGL asset managers. In Lit, template expressions evaluate into lightweight DOM parts. Depending on collection size, mutability, and item statefulness, you must select the appropriate rendering strategy:

- **Unkeyed Positional Mapping (`Array.prototype.map()` / `map()`):**
  - Fastest for static collections or append-only lists with stateless DOM nodes.
  - Updates DOM child nodes by index position.
- **Differential Keyed Rendering (`repeat()`):**
  - Essential when lists undergo reordering, sorting, filtering, middle insertions, or deletions.
  - Tracks individual item identities to reorder, move, and preserve DOM elements and their internal state (e.g., input focus, active animations, WebGL canvas contexts, Web Component lifecycles).
- **Viewport Virtualization (`@lit-labs/virtualizer`):**
  - Mandatory for large or unbounded datasets (hundreds to tens of thousands of items).
  - Constrains the live DOM footprint by instantiating only elements visible within the viewport plus an offscreen buffer pool.

---

## 2. Simple List Rendering & Built-in Iteration Directives

### Standard `Array.prototype.map()`
For simple, small, or static collections, standard JavaScript array transformations within template expressions are concise and idiomatic:

```typescript
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

interface ShaderUniformItem {
  readonly name: string;
  readonly type: string;
}

@customElement("shader-uniform-list")
export class ShaderUniformList extends LitElement {
  @property({ type: Array })
  public uniforms: readonly ShaderUniformItem[] = [];

  protected override render(): TemplateResult {
    return html`
      <ul class="uniform-list">
        ${this.uniforms.map(
          (uniform) => html`
            <li class="uniform-item">
              <span class="name">${uniform.name}</span>
              <span class="type">${uniform.type}</span>
            </li>
          `,
        )}
      </ul>
    `;
  }
}
```

- **Mechanics of Positional Reconciliation:**
  - Lit evaluates the array of `TemplateResult` instances returned by `map()`.
  - When the array changes, Lit diffs by array index:
    - If index `0` changes, the existing DOM node at index `0` has its property bindings updated in place.
    - If items are removed from the end, trailing DOM nodes are detached.
    - If items are prepended, all existing nodes are mutated in place to match the new shifted indices, and a new node is created at the end.
  - Positional reconciliation is optimal when items are purely functional projections of input props without local DOM state.

---

### Built-in Iteration Directives

Lit provides specialized directives in `lit/directives/` that work directly with general iterables (`Set`, `Map`, `Generator`, `Array`) without requiring explicit array allocations.

#### 1. The `map()` Directive (`lit/directives/map.js`)
Unlike `Array.prototype.map()`, Lit's `map()` directive accepts any JavaScript `Iterable`:

```typescript
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";

@customElement("texture-cache-monitor")
export class TextureCacheMonitor extends LitElement {
  // Map or Set collections can be iterated directly without Array.from()
  @property({ attribute: false })
  public textureRegistry: ReadonlyMap<string, number> = new Map();

  protected override render(): TemplateResult {
    return html`
      <dl class="texture-stats">
        ${map(
          this.textureRegistry,
          ([uuid, byteSize]) => html`
            <dt>${uuid}</dt>
            <dd>${(byteSize / 1024).toFixed(1)} KB</dd>
          `,
        )}
      </dl>
    `;
  }
}
```

- **Key Advantage:** Eliminates intermediate array allocations when rendering from generator functions, `Set`, or `Map` collections.

---

#### 2. The `range()` Directive (`lit/directives/range.js`)
Generates an integer sequence iterable on the fly, eliminating ad-hoc array creation loops like `Array.from({ length })`:

```typescript
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { range } from "lit/directives/range.js";
import { map } from "lit/directives/map.js";

@customElement("render-pass-stepper")
export class RenderPassStepper extends LitElement {
  @property({ type: Number })
  public totalPasses = 4;

  @property({ type: Number })
  public activePass = 0;

  protected override render(): TemplateResult {
    return html`
      <nav class="pass-stepper" aria-label="Render passes">
        ${map(
          range(this.totalPasses),
          (stepIndex) => html`
            <button
              type="button"
              class="step-indicator ${stepIndex === this.activePass ? "active" : ""}"
              @click=${() => this.selectPass(stepIndex)}
            >
              Pass ${stepIndex + 1}
            </button>
          `,
        )}
      </nav>
    `;
  }

  private selectPass(index: number): void {
    this.activePass = index;
  }
}
```

- **Function Signatures:**
  - `range(end)`: Produces values from `0` to `end - 1` with step `1`.
  - `range(start, end, step?)`: Produces values from `start` up to (exclusive) `end` using the defined `step`.

---

#### 3. The `join()` Directive (`lit/directives/join.js`)
Intersperses separators or template elements between items of an iterable without generating trailing dividers:

```typescript
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { join } from "lit/directives/join.js";

@customElement("scene-breadcrumb")
export class SceneBreadcrumb extends LitElement {
  @property({ type: Array })
  public pathSegments: readonly string[] = ["Root", "Scene", "MeshGroup", "MeshNode"];

  protected override render(): TemplateResult {
    return html`
      <div class="breadcrumb">
        ${join(
          map(this.pathSegments, (segment) => html`<span class="crumb">${segment}</span>`),
          html`<span class="separator" aria-hidden="true">/</span>`,
        )}
      </div>
    `;
  }
}
```

- **Eliminates Trailing Delimiters:** Avoids awkward conditional templates or CSS `:last-child` workarounds for textual or decorative separators.

---

## 3. High-Performance Differential Keyed Rendering with `repeat()`

When a collection undergoes sorting, filtering, insertion at arbitrary indices, or element swapping, unkeyed positional mapping causes severe performance and UI fidelity bugs. The `repeat()` directive provides keyed DOM node reconciliation.

### Importing & Syntax
```typescript
import { repeat } from "lit/directives/repeat.js";
```

The `repeat()` directive provides two overload signatures:
- **Keyed (3 Arguments - Preferred for dynamic lists):**
  `repeat(items, keyFn, templateFn)`
- **Positional (2 Arguments - Equivalent to index-based mapping):**
  `repeat(items, templateFn)`

```typescript
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

interface TrackedMeshNode {
  readonly id: string;
  readonly label: string;
  readonly polyCount: number;
}

@customElement("scene-mesh-tree")
export class SceneMeshTree extends LitElement {
  @property({ type: Array })
  public meshNodes: readonly TrackedMeshNode[] = [];

  protected override render(): TemplateResult {
    return html`
      <div class="mesh-tree">
        ${repeat(
          this.meshNodes,
          (node) => node.id,
          (node, index) => html`
            <div class="mesh-item" data-index=${index}>
              <span class="label">${node.label}</span>
              <span class="count">${node.polyCount} polys</span>
              <input type="text" placeholder="Rename node" />
            </div>
          `,
        )}
      </div>
    `;
  }
}
```

---

### The Key Extraction Function (`keyFn`)

The key function receives `(item, index)` and must return an immutable, unique identifier (`string`, `number`, or `Symbol`).

- **Rules for Reliable Keys:**
  - **Must be globally or list-unique:** Duplicate keys cause runtime DOM reconciliation corruption and erroneous node reuse.
  - **Must reflect entity identity, NOT index:** Never use `(item, index) => index` as a key function. Using array indices degrades `repeat()` into identical behavior to unkeyed `map()`.
  - **Must remain stable across reordering:** If item `B` moves from index `3` to index `0`, its key must remain strictly identical.

---

### Preserving DOM Node Identity and State

The distinction between `map()` and `repeat()` is crucial when rendered elements contain internal state that is not managed by Lit's top-level properties:

- **Uncommitted Form Input Values:**
  - If a user types into an `<input>` and the list is resorted or filtered, unkeyed `map()` updates property bindings in-place at each index. The text typed into row 0 stays at row 0 even though row 0 now represents a different entity!
  - `repeat()` physically moves the existing DOM node in the container via native `Node.insertBefore()`, preserving the user's cursor position and uncommitted text.
- **Focus & Selection State:**
  - With `map()`, shifting elements causes active keyboard focus (`document.activeElement`) to land on a completely different item.
  - With `repeat()`, the focused element moves along with its underlying data model.
- **Child Web Components & GPU Canvases:**
  - Custom Web Components may maintain WebGL rendering contexts, internal timers, or dirty flags.
  - `map()` forces components at each index to receive new properties, triggering expensive prop teardown and rebuilding cycles.
  - `repeat()` reorders the actual Web Component instances in the DOM tree with zero recreation overhead.

---

### Performance Comparison: `map()` vs. `repeat()`

The architectural trade-offs between `map()` and `repeat()` dictate when to use each:

- **List Scenario 1: Prepending an Item to an 1,000-element List:**
  - *With `map()`:* Lit updates all 1,000 existing DOM nodes because their indices shifted by +1. It then creates 1 new DOM node at the end. This produces 1,000 property dirty-check evaluations and DOM mutations.
  - *With `repeat()`:* Lit detects all 1,000 existing keys are already rendered. It creates exactly 1 new DOM node for the new key and inserts it at the beginning using `container.insertBefore(newNode, container.firstChild)`. All 1,000 existing nodes remain untouched.
- **List Scenario 2: Reverse Sorting a List:**
  - *With `map()`:* Every single node in the list has its text content, attributes, and property bindings updated to reflect the new item at that index.
  - *With `repeat()`:* Zero node contents are destroyed or rebuilt. Lit performs a minimal sequence of native DOM node moves (`insertBefore`) to rearrange the existing nodes.
- **List Scenario 3: Static or Append-Only List:**
  - *With `map()`:* Lowest computational overhead. Does not build or maintain an internal Map of key-to-node references.
  - *With `repeat()`:* Minor overhead of evaluating key functions and maintaining the key cache.

---

## 4. Lit Virtualizer (`@lit-labs/virtualizer`)

When collections exceed hundreds or thousands of records (e.g., event logs, memory allocators, scene node registries), rendering every DOM node simultaneously causes:
- Excessive memory consumption from thousands of live DOM elements.
- Stalled main-thread garbage collection.
- Sluggish layout recalculation and paint times on scroll.

`@lit-labs/virtualizer` implements viewport windowing, dynamically instantiating only the items currently intersecting the visible scroll container (plus a small overscan buffer).

---

### Component vs. Directive Form

`@lit-labs/virtualizer` provides two interchangeable usage models:

#### Option A: The `<lit-virtualizer>` Custom Element
Imports and registers the declarative `<lit-virtualizer>` element:

```typescript
import { LitElement, html, css, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@lit-labs/virtualizer";

interface TelemetrySample {
  readonly timestamp: number;
  readonly fps: number;
  readonly drawCalls: number;
}

@customElement("telemetry-log-viewer")
export class TelemetryLogViewer extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 400px;
    }
    lit-virtualizer {
      height: 100%;
      overflow-y: auto;
    }
    .telemetry-row {
      display: flex;
      justify-content: space-between;
      height: 36px;
      padding: 0 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
  `;

  @property({ attribute: false })
  public samples: readonly TelemetrySample[] = [];

  protected override render(): TemplateResult {
    return html`
      <lit-virtualizer
        .items=${this.samples}
        .keyFunction=${(sample: TelemetrySample) => sample.timestamp}
        .renderItem=${(sample: TelemetrySample) => html`
          <div class="telemetry-row">
            <span>${new Date(sample.timestamp).toISOString()}</span>
            <span>${sample.fps} FPS</span>
            <span>${sample.drawCalls} calls</span>
          </div>
        `}
      ></lit-virtualizer>
    `;
  }
}
```

---

#### Option B: The `virtualize()` Directive
The `virtualize()` directive applies windowing directly to an existing container element (e.g., `<ul>`, `<div>`), avoiding an extra Shadow DOM layer:

```typescript
import { LitElement, html, css, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { virtualize } from "@lit-labs/virtualizer/virtualize.js";

interface AssetRecord {
  readonly guid: string;
  readonly name: string;
  readonly size: number;
}

@customElement("virtual-asset-list")
export class VirtualAssetList extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 500px;
    }
    .scroll-viewport {
      height: 100%;
      overflow-y: auto;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .asset-item {
      box-sizing: border-box;
      height: 48px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
    }
  `;

  @property({ attribute: false })
  public assets: readonly AssetRecord[] = [];

  protected override render(): TemplateResult {
    return html`
      <ul class="scroll-viewport">
        ${virtualize({
          items: this.assets,
          keyFunction: (asset) => asset.guid,
          renderItem: (asset) => html`
            <li class="asset-item">
              <strong>${asset.name}</strong>
              <span>(${(asset.size / 1024).toFixed(1)} KB)</span>
            </li>
          `,
        })}
      </ul>
    `;
  }
}
```

---

### Layout Models in Lit Virtualizer

By default, virtualizer applies a standard vertical flow layout. Lit Virtualizer includes configurable layout strategies:

- **Flow Layout (Vertical / Horizontal):**
  - Configured with `flow({ direction: "vertical" | "horizontal" })`.
  - Supports single-axis scrolling.
- **Grid Layout (`grid()` from `@lit-labs/virtualizer/layouts/grid.js`):**
  - Arranges items in a virtualized multi-column / multi-row responsive grid.
  - Calculates visible matrix coordinates and positions items via CSS translates.

```typescript
import { LitElement, html, css, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { virtualize } from "@lit-labs/virtualizer/virtualize.js";
import { grid } from "@lit-labs/virtualizer/layouts/grid.js";

interface MaterialThumbnail {
  readonly id: string;
  readonly title: string;
}

@customElement("material-gallery")
export class MaterialGallery extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 600px;
    }
    .gallery-container {
      height: 100%;
      overflow-y: auto;
    }
    .material-card {
      width: 120px;
      height: 120px;
      background: #2a2a2a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  @property({ attribute: false })
  public materials: readonly MaterialThumbnail[] = [];

  protected override render(): TemplateResult {
    return html`
      <div class="gallery-container">
        ${virtualize({
          items: this.materials,
          layout: grid({
            itemSize: { width: "120px", height: "120px" },
            gap: "12px",
          }),
          keyFunction: (item) => item.id,
          renderItem: (item) => html`
            <div class="material-card">
              <span>${item.title}</span>
            </div>
          `,
        })}
      </div>
    `;
  }
}
```

---

### Scroll Positioning, Dynamic Item Sizing & Anchoring

- **Explicit Container Dimensions:**
  - The scroll parent element **must** have an explicit height (e.g., `height: 100%`, `height: 500px`) and `overflow: auto` or `overflow-y: scroll`.
  - If the container expands to fit its content (`height: auto`), the virtualizer measures an infinite viewport and instantiates the entire list at once, defeating virtualization.
- **Dynamic Item Sizing:**
  - Lit Virtualizer supports variable and dynamic item heights via built-in ResizeObserver tracking.
  - When dynamic sizing is enabled, the virtualizer estimates heights for unmeasured elements and adjusts scroll offsets dynamically as real DOM heights are measured upon entering the viewport.
- **Scroll Anchoring & Programmatic Navigation:**
  - To scroll programmatically to an index in `<lit-virtualizer>`, use `.element(index).scrollIntoView()` or the `scrollToIndex(index, { position: "start" | "center" | "end" })` API.
  - To maintain smooth scroll behavior when prepending streaming data (such as realtime telemetry logs), set scroll anchoring or adjust `scrollTop` compensation when prepending items.

---

### Performance Best Practices & Anti-Patterns

- **Mandatory Stable `keyFunction`:**
  - Always provide `.keyFunction`. Without stable keys, item DOM recycling forces complete element rebuilds instead of attribute diffs.
- **Lightweight Item Templates:**
  - Avoid heavy computations, complex SVG parsing, or synchronous layout measurements (`getBoundingClientRect()`, `offsetHeight`) inside `renderItem`.
  - Virtualizer renders and unmounts items at 60–120 FPS during rapid flings; item render functions must remain strictly O(1).
- **Resource Disposal on Virtual Unmount:**
  - When rendering complex custom elements containing WebGL textures, Canvas contexts, or active intervals, listen to the standard `disconnectedCallback()` on the item element to pause animations and release temporary memory while scrolled out of view.

---

## 5. Architectural Decision Matrix

Select the iteration mechanism matching your operational profile:

- **Use `Array.prototype.map()` when:**
  - The collection is small (e.g., under 50 items).
  - The list is static or append-only.
  - Rendered items are purely stateless templates with no inputs, canvas contexts, or component lifecycles.
- **Use `map()` directive when:**
  - Iterating non-Array iterables (`Set`, `Map`, or generator outputs) without creating an intermediate Array copy.
- **Use `range()` and `join()` when:**
  - Rendering integer step sequences, pagination controls, or interspersing breadcrumb and comma separators.
- **Use `repeat()` when:**
  - Collections undergo sorting, reordering, filtering, or arbitrary item insertions/deletions.
  - Items host interactive state (input fields, focus, video/audio playback, WebGL nodes).
  - Component instantiation is expensive and DOM identity preservation is critical.
- **Use `virtualize()` / `<lit-virtualizer>` when:**
  - Collections contain hundreds to tens of thousands of items.
  - DOM node count must remain bounded regardless of dataset magnitude to prevent memory exhaustion and UI frame drops.

---

## 6. Related Guidelines

- Core Lit conventions and element standards: [lit_guidelines.md](lit_guidelines.md)
- Architectural quick reference and lifecycle cheat sheet: [lit_cheat_sheet.md](lit_cheat_sheet.md)
- Reactive state and property converters: [lit_properties_and_converters_guide.md](lit_properties_and_converters_guide.md)
- Async directives and streaming data: [lit_async_directives_guide.md](lit_async_directives_guide.md)
- Unit testing guidelines: [unit_testing_guidelines.md](unit_testing_guidelines.md)
