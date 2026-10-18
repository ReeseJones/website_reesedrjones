# Lit Architectural Cheat Sheet & Concept Index

A conceptual index, architectural cheat sheet, and operational reference for building web components with Lit in this codebase.

---

## 1. Overview & Architectural Role

Lit provides a lightweight, reactive abstraction over standard Web Components. In this project:
- Lit components function as persistent stateful controllers bridging the declarative DOM with imperative subsystems (such as WebGL2 rendering loops, scene graphs, cameras, and asset managers).
- Unlike virtual-DOM frameworks that repeatedly re-invoke functional components, a Lit component instance remains allocated throughout its DOM lifecycle, preserving internal object identities, GPU handles, and dirty flags.

---

## 2. Properties and State

Reactive properties and internal state form the foundation of Lit's reactive data-binding system. Modifying a reactive property or state variable schedules an asynchronous, batched render cycle.

### Reactive Properties vs. Internal State
- **Public Reactive Properties (Static `properties` Field):**
  - Exposed as the element's public API for consumers via `public static override properties = { ... }` and `public declare prop: type;`.
  - Automatically synchronized with corresponding HTML attributes (kebab-cased by default).
  - Configurable with built-in or custom attribute converters.
  - Can be reflected back into DOM attributes (`reflect: true`) when required for CSS styling or external inspection.
- **Internal State Fields (Decoratorless):**
  - Private or protected class fields (e.g., `private _open: boolean = false;`).
  - Triggers the reactive update cycle by calling `this.requestUpdate()` when reassigned.
  - Has zero HTML attribute footprint and does not observe or reflect to the DOM.
  - Ideal for UI flags, internal timers, temporary input buffers, and active interaction modes.

### Template Binding Syntax
Lit's `html` tagged template literal provides four distinct expression bindings:
- **Property Binding (`.prop=${value}`):**
  - Directly sets a JavaScript property on the target element or custom element instance.
  - Bypasses string serialization entirely; passes complex objects, arrays, functions, and class instances directly.
- **Attribute Binding (`attr=${value}`):**
  - Sets an HTML attribute string via `setAttribute()`. If `value` is nullish (`null` or `undefined`), the attribute is removed.
- **Boolean Attribute Binding (`?attr=${booleanValue}`):**
  - Toggles the existence of a boolean attribute (e.g., `?disabled=${isDisabled}`).
  - Adds the attribute if truthy; removes the attribute completely if falsy.
- **Event Listener Binding (`@event=${this.handleEvent}`):**
  - Attaches an event listener to the target node.
  - Supports listener options via event directive configurations when needed.

### Reactivity Mechanics & Mutation Rules
- **Equality & Dirty Checking:**
  - By default, Lit compares new values against previous values using strict inequality (`newVal !== oldVal`).
  - In-place mutations (e.g., calling `array.push()`, `map.set()`, or mutating nested object properties) do not alter reference identity and will NOT trigger an automatic update.
- **Handling Reference Mutations:**
  - *Pattern A (Immutable Reassignment):* Create a new reference (e.g., `this.items = [...this.items, newItem]`).
  - *Pattern B (Explicit Update Request):* Mutate the instance in place, then explicitly call `this.requestUpdate("propertyName")`.
- **Custom Change Predicate (`hasChanged`):**
  - Supply a custom `hasChanged(newVal, oldVal): boolean` predicate in the property options to customize equality (e.g., deep value checking, vector component equality, or ignoring NaN transitions).

### Property Reconciliation Patterns
- **Pre-Render Reconciling (`willUpdate(changedProperties)`):**
  - The ideal lifecycle hook for computing derived properties that depend on other reactive properties before templates are rendered.
  - Runs synchronously before `render()`, both in the browser and in server-side rendering (SSR) environments. Does NOT require DOM access.
- **Browser API Reconciling (`update(changedProperties)`):**
  - Overridden when reactive properties must sync with browser APIs (e.g., `localStorage`, `matchMedia`) prior to rendering. Always call `super.update(changedProperties)` to proceed with rendering.
- **Post-Render Reconciling (`updated(changedProperties)`):**
  - Used when state adjustments depend strictly on measurements of the newly rendered DOM (e.g., measuring bounding rects or canvas sizes).
  - *Caution:* Mutating reactive properties in `updated()` triggers a secondary render cycle. Guard all mutations with strict conditional checks to prevent infinite re-rendering loops.

---

## 3. The Lit Lifecycle

Lit integrates the native browser Custom Element lifecycle with its own asynchronous, microtask-batched reactive update loop.

### Native Custom Element Lifecycle Hooks
- **`constructor()`:**
  - Invoked when the element is instantiated (`document.createElement()`, `new ElementClass()`, or parser creation).
  - Must call `super()`.
  - Initializes default properties, registers Lit reactive controllers, and sets up immutable configuration.
  - *Restriction:* Must never inspect attributes, access children, or mutate DOM here.
- **`connectedCallback()`:**
  - Invoked when the element is inserted into the document DOM.
  - Must call `super.connectedCallback()`.
  - Used for attaching global window/document listeners, subscribing to services, establishing context connections, and initializing GPU or canvas resources.
  - May execute multiple times if an element is detached and re-attached.
- **`disconnectedCallback()`:**
  - Invoked when the element is removed from the document DOM.
  - Must call `super.disconnectedCallback()`.
  - Crucial for deterministic cleanup: removing window event listeners, cancelling animation frames, disconnecting observers, and releasing GPU buffers.
- **`attributeChangedCallback(name, oldVal, newVal)`:**
  - Native hook managed internally by Lit to map observed attributes to reactive properties via configured converters.

### Lit Reactive Update Lifecycle Sequence
When reactive state changes or `requestUpdate()` is called, Lit batches modifications into an asynchronous microtask:

1. **`requestUpdate(name?, oldValue?)`:**
   - Enqueues a render task. Multiple synchronous property changes are coalesced into a single update cycle.
2. **`performUpdate()`:**
   - Executes the batched update work. Can be awaited or customized for specialized scheduling.
3. **`shouldUpdate(changedProperties: PropertyValues): boolean`:**
   - Pure predicate returning whether rendering should continue. Defaults to `true`. Can be overridden to throttle rendering.
4. **`willUpdate(changedProperties: PropertyValues)`:**
   - Pre-render hook for computing derived state. Runs immediately before `update()` and `render()`.
5. **`update(changedProperties: PropertyValues)`:**
   - Renders DOM by calling `render()`, reflects properties marked with `reflect: true` to HTML attributes, and commits template changes to the render root.
6. **`render(): TemplateResult`:**
   - Must remain a pure function returning HTML template expressions. Must never produce side effects or mutate element state.
7. **`firstUpdated(changedProperties: PropertyValues)`:**
   - Executes exactly once after the component's initial DOM has been created and mounted into `renderRoot`.
   - The authoritative entry point for initial DOM queries, canvas context acquisition, measuring layout geometry, and initializing WebGL/3D render targets.
8. **`updated(changedProperties: PropertyValues)`:**
   - Executes after every render pass (including the first). Receives a map of previous values for all properties modified during the cycle.
   - Ideal for cascading dirty flags to non-rendered engines (e.g., updating WebGL uniform buffers or camera matrices).

### Asynchronous Batching & Coordination (`updateComplete`)
- Lit property updates are inherently asynchronous to guarantee high rendering performance.
- The `this.updateComplete` property returns a `Promise<boolean>` that resolves when the current update cycle finishes:
  - In unit tests, always await `element.updateComplete` after mutating properties before asserting DOM state or computed side effects.
  - Can be chained or overridden via `getUpdateComplete()` to coordinate with child component updates or external animations.

---

## 4. Data Flow and State Management

Lit components enforce clear unidirectional data flow patterns across tree hierarchies.

### Downward Data Flow (Properties & Bindings)
- Parents communicate downwards to children by binding directly to properties (`.property=${data}`).
- Avoid converting rich objects or typed arrays into JSON strings; use property bindings to preserve object references and memory efficiency.

### Upward Communication (Strongly-Typed Custom Events)
- Children communicate upward to ancestors by dispatching custom DOM events.
- **Project Architectural Standard:**
  - Never dispatch generic untyped `CustomEvent<T>`.
  - Adhere to the project event standard by subclassing `Event` directly with encapsulated details and strongly-typed payloads.
  - Augment `HTMLElementEventMap` to provide full compile-time autocompletion across `addEventListener()`.
  - Set `bubbles: true` and `composed: true` to enable events to traverse across Shadow DOM boundaries and `<slot>` projections.

### Hierarchical Context Broadcast (`@lit/context`)
- Used for distributing shared infrastructure (e.g., WebGL canvas contexts, camera references, theme settings) down arbitrary subtrees without prop drilling.
- Built on the W3C Context Community Protocol using composed DOM events.
- **Project Standard:** All context keys must be unique `Symbol()` identifiers exported from companion `*_types.ts` files, guaranteeing reference identity and zero circular imports.

### Cohesive Non-Rendered State (Lit Reactive Controllers)
- Non-visual logic, subscriptions, input listeners, and state machines are encapsulated into standalone classes implementing `ReactiveController`.
- Controllers attach to the host element via `host.addController(this)` and hook directly into `hostConnected()`, `hostDisconnected()`, `hostUpdate()`, and `hostUpdated()`.
- Keeps component classes clean and focused strictly on presentation or scene-graph structural role.

---

## 5. Accessing the DOM

Lit manages rendering into a component's render root (`shadowRoot` by default, or light DOM when overridden). Accessing DOM nodes must follow lifecycle timing rules.

### Query Decorator Suite
- **`@query(selector)`:**
  - Acts as a getter property returning `this.renderRoot.querySelector(selector)`.
  - Returns `null` if the element has not yet rendered.
- **`@queryAll(selector)`:**
  - Acts as a getter returning `this.renderRoot.querySelectorAll(selector)` as a `NodeList`.
- **`@queryAsync(selector)`:**
  - Returns a `Promise<Element | null>` that awaits `this.updateComplete` before executing the query selector.
  - Essential when querying child elements whose rendering is deferred or conditionally controlled by state.

### Projected Content & Slotted DOM Queries
- **`@queryAssignedElements({ slot?, selector? })`:**
  - Queries DOM nodes distributed into a `<slot>` from outside the shadow boundary, filtering strictly for HTML elements.
- **`@queryAssignedNodes({ slot?, flatten? })`:**
  - Retrieves all distributed nodes, including text nodes and comments.
- **Slot Change Events (`@slotchange`):**
  - Listen for distribution updates directly on slot elements: `<slot @slotchange=${this.handleSlotChange}></slot>`.

### Template References (`ref()` Directive)
- The `ref()` directive attaches an element reference directly within the template expression:
  - `ref(this.canvasRef)`: Binds an instance of `createRef<HTMLCanvasElement>()`.
  - `ref((element) => { ... })`: Invokes a callback when the rendered DOM node is created or destroyed.
- Recommended when working with dynamically generated nodes in loops or bridging third-party libraries requiring direct DOM nodes.

### Light DOM vs. Shadow DOM Selection
- **Default Shadow DOM:** Used for encapsulated visual UI components where CSS isolation, internal scoped structure, and `<slot>` projections are desired.
- **Light DOM Override (`createRenderRoot() { return this; }`):**
  - Mandatory for structural scene graph elements (`<rj-scene>`, `<rj-perspective-camera>`, `<rj-scene-group>`).
  - Allows child elements to query ancestors directly via `this.parentElement` or `this.closest()` and preserves standard DOM traversal without piercing shadow roots.

### DOM Access Lifecycle Timing Rules
- **Before `firstUpdated()`:** The DOM has NOT been created. Attempting to query `this.renderRoot` or DOM elements in `constructor()`, `connectedCallback()`, or `willUpdate()` will return `null` or empty collections.
- **In `firstUpdated()`:** DOM is fully mounted and ready for initial binding, canvas setup, and layout inspection.
- **In `updated()`:** DOM reflects the latest property values committed in the current cycle.

---

## 6. Conceptual Index Summary

- **Static `properties`:** Exposes public attributes and reactive properties with converters and optional reflection without decorators.
- **Internal State Fields:** Private/protected class fields triggering updates via `requestUpdate()` without attribute exposure.
- **`requestUpdate()`:** Manually schedules a batched reactive update cycle.
- **`updateComplete`:** A Promise resolving once microtask batching and DOM commits are complete.
- **`willUpdate()`:** Synchronous pre-render computation for derived properties across client and SSR.
- **`firstUpdated()`:** One-time post-mount hook for DOM queries, canvas contexts, and listeners.
- **`updated()`:** Post-render hook for dirty-flag propagation and layout measurements.
- **`ReactiveController`:** Standalone non-rendered behavior and lifecycle manager.
- **`@lit/context`:** Subtree state broadcast protocol piercing shadow boundaries.
- **`@query()` / `@queryAsync()`:** Declarative DOM querying coordinated with render roots and update timing.
- **`ref()`:** Inline template directive for direct element reference capture.
