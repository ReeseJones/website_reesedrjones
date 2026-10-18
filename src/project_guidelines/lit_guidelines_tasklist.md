# Lit Guidelines & Tutorial Series Task List

Comprehensive task checklist and roadmap for expanding the project's Lit and Web Component documentation, cheat sheets, and tutorial guides.

---

## Overview

This checklist tracks the research, structural authoring, and documentation tasks required to create a complete reference library and tutorial series for Lit in this codebase.

All guidelines and tutorials produced under this plan adhere to project standards:
- **No Markdown Tables:** Bulleted and nested lists are used exclusively for structural formatting.
- **Relative Markdown Links:** All cross-document links are repository-relative or file-relative (e.g., [lit_guidelines.md](lit_guidelines.md)).
- **Conceptual Indexing:** Concepts, architectural trade-offs, and lifecycles are synthesized directly rather than duplicating third-party snippets verbatim.
- **Repository Architecture Alignment:** Strict adherence to type separation (`*_types.ts`), explicit setup functions (`register*Element()`), custom event classes (`Event` subclasses), and React 19 interop.

---

## Master Checklist

### Phase 1: Lit Core Cheat Sheet & Concept Index
Comprehensive quick-reference guide indexing foundational Lit mechanics.

- [x] **Task 1.1: Author Core Lit Cheat Sheet (`src/project_guidelines/lit_cheat_sheet.md`)**
  - Synthesize and index key concepts from official Lit documentation and the cheat sheet.
  - **Properties & State Index:**
    - Property declaration with static `properties` class fields and `declare` properties (decoratorless workflow).
    - Attribute vs. property expressions (`attr=${v}`, `.prop=${v}`, `?attr=${v}`).
    - Change detection mechanics, dirty checking, mutation caveats with Arrays and Objects (`requestUpdate()`), and custom `hasChanged()` equality predicates.
  - **Lit & Custom Element Lifecycle Index:**
    - Native browser lifecycle: `constructor()`, `connectedCallback()`, `disconnectedCallback()`, `adoptedCallback()`, `attributeChangedCallback()`.
    - Lit reactive update lifecycle: `requestUpdate()`, `performUpdate()`, `shouldUpdate()`, `willUpdate()`, `update()`, `render()`, `firstUpdated()`, `updated()`.
    - Asynchronous batching mechanics and `updateComplete` promise coordination.
    - Contextual placement of side effects, DOM access, and property reconciliation across lifecycle hooks.
  - **Data Flow & State Management Index:**
    - Unidirectional data flow: downward passing via properties and bindings.
    - Upward communication: dispatching strongly-typed custom DOM events (`composed`, `bubbles`).
    - Subtree broadcast: decoupled state sharing via `@lit/context`.
    - Cohesive state encapsulation via Lit Reactive Controllers.
  - **DOM Access & Shadow Root Querying Index:**
    - Static querying decorators: `@query()`, `@queryAll()`.
    - Asynchronous deferred querying: `@queryAsync()` coordinating with `updateComplete`.
    - Projected DOM access: `@queryAssignedElements()`, `@queryAssignedNodes()`, and `<slot>` change events.
    - Imperative template references via the `ref()` directive and callback hooks.
    - Light DOM overrides (`createRenderRoot() { return this; }`) for scene graphs.

---

### Phase 2: In-Depth Research & Tutorial Guides (Multi-Document Series)
Detailed tutorial modules providing actionable guidelines, architectural patterns, and type-safe idioms.

- [x] **Task 2.1: Lit Reactive Controllers Guide (`src/project_guidelines/lit_controllers_guide.md`)**
  - **Core Concept:** Encapsulation of non-rendered logic, state, and lifecycle hooks into reusable companion controllers.
  - **`ReactiveController` Interface:**
    - `hostConnected()`: setup listeners, start intervals/timers, attach GPU resources.
    - `hostDisconnected()`: cleanup listeners, clear timers, release GPU references.
    - `hostUpdate()`: pre-render state calculation and synchronization.
    - `hostUpdated()`: post-render DOM inspection and layout measurement.
  - **Host Registration & Coordination:** Registering via `host.addController(this)` and coordinating updates via `host.requestUpdate()`.
  - **Controller Patterns in 3D & WebGL:**
    - Animation loop / frame subscriber controller.
    - Pointer lock and orbit control listeners.
    - Responsive viewport resize and ResizeObserver controllers.
    - Keyboard / input device controllers.

- [x] **Task 2.2: Reactive Properties, State & Custom Converters Guide (`src/project_guidelines/lit_properties_and_converters_guide.md`)**
  - **`@property()` vs. `@state()`:**
    - `@property()`: Public component API, maps to HTML attributes, supports reflection and external bindings.
    - `@state()`: Private/protected internal state, triggers re-rendering without exposing DOM attributes.
  - **Property Options Standard:**
    - `attribute`: Custom attribute naming or attribute disabling (`attribute: false`).
    - `reflect`: Principles for when to reflect to DOM (theming/styling only) vs. avoiding attribute thrashing.
    - `type`: Built-in primitive converters (`String`, `Number`, `Boolean`, `Array`, `Object`).
    - `hasChanged`: Fine-grained change detection predicates.
  - **Custom Attribute Converters:**
    - `ComplexAttributeConverter` interface (`fromAttribute(value, type)`, `toAttribute(value, type)`).
    - Custom parser implementations:
      - 3D Vector / Coordinate tuple strings (e.g., `"1.0 2.5 -0.5"` -> `Vector3Tuple`).
      - Delimited array / list converters.
      - Date / ISO timestamp converters.
      - JSON configuration converters with error resilience.

- [x] **Task 2.3: Lit Context Architecture & Hierarchical State Guide (`src/project_guidelines/lit_context_guide.md`)**
  - **W3C Context Community Protocol:** Mechanism for passing data down arbitrary subtrees across Shadow DOM and `<slot>` boundaries without prop drilling.
  - **Symbol-Keyed Context Tokens:** Defining and exporting unique tokens in `*_types.ts` to prevent naming collisions and guarantee reference equality.
  - **Provider & Consumer Implementation Patterns:**
    - Imperative `ContextProvider` and `ContextConsumer` controllers.
    - Declarative `@provide({ context })` and `@consume({ context, subscribe: true })` decorators.
    - Context shadowing for hierarchical graphs (e.g., parent/child scene nodes).
    - Multi-tier context stacks: WebGL canvas context -> Scene engine context -> Parent node context.

- [x] **Task 2.4: Working with Lists, Iterables & Virtualization Guide (`src/project_guidelines/lit_lists_and_iteration_guide.md`)**
  - **Template Iteration Strategies:**
    - Standard `Array.prototype.map()` for simple, small collections.
    - Built-in `map()`, `range()`, and `join()` directives.
  - **Differential Keyed List Updates via `repeat()`:**
    - Key extraction function: tracking item identity across array reordering, filtering, and additions.
    - Template item rendering function.
    - Performance implications: node reuse vs. tearing down and reconstructing DOM nodes.
  - **Lit Virtualizer (`@lit-labs/virtualizer`):**
    - High-density lists and unbounded collections.
    - Viewport windowing and lazy rendering.
    - Layout configurations: vertical, horizontal, grid layouts.
    - Scroll positioning and scroll anchoring.

- [x] **Task 2.5: Async Directives & Streaming Data Guide (`src/project_guidelines/lit_async_directives_guide.md`)**
  - **Directive Fundamentals:**
    - Difference between simple synchronous directives and `AsyncDirective`.
    - Lifecycle of `AsyncDirective`: `render()`, `update()`, `disconnected()`, `reconnected()`.
  - **Built-in Async Utilities:**
    - `until()`: Resolving promises with loading fallbacks and placeholder states.
    - `suspend()`: Suspense boundaries and coordination with async operations.
  - **Custom Async Directive Authoring:**
    - Managing external asynchronous streams (Observables, WebSockets, EventSources, GPU async readbacks).
    - Preventing memory leaks: tracking active promises and discarding outdated responses.
    - Calling `this.setValue()` to push updates directly into DOM nodes without re-evaluating the parent template.

- [x] **Task 2.6: DOM Access, Shadow Roots & Light DOM Guide (`src/project_guidelines/lit_dom_access_guide.md`)**
  - **Query Decorator Suite:**
    - `@query("selector")`: Instant lookup in `renderRoot`.
    - `@queryAll("selector")`: NodeList retrieval.
    - `@queryAsync("selector")`: Returning a Promise that resolves after `updateComplete`.
  - **Projected DOM & Slotted Content:**
    - `@queryAssignedElements()` and `@queryAssignedNodes()`.
    - Listening to `<slot>` change events (`@slotchange=${this.handleSlotChange}`).
  - **Imperative Element References via `ref()` Directive:**
    - `createRef()` and attaching via `ref(this.myRef)`.
    - Callback references for dynamic mount/unmount triggers.
  - **Light DOM vs. Shadow DOM Selection:**
    - Overriding `createRenderRoot() { return this; }` for scene hierarchy and 3D nodes.
    - Shadow DOM benefits for self-contained UI components (encapsulated styles and slots).
    - Lifecycle timing rules: never querying DOM before `firstUpdated()` has run.

---

### Phase 3: Integration & Cross-Referencing
Ensure seamless navigation, cross-referencing, and adherence across all repository guidelines.

- [x] **Task 3.1: Update Index in Primary Lit Guidelines (`src/project_guidelines/lit_guidelines.md`)**
  - Add cross-references to the Cheat Sheet and Tutorial Guides.
  - Ensure terminology and architectural conventions are aligned across all documents.

- [x] **Task 3.2: Update Main Guidelines Reference (`AGENTS.md`)**
  - Add references to the new Lit guides and cheat sheets under the Guideline Reference Index.

---

## Progress Log

- **Phase 1 Complete:** Authored [lit_cheat_sheet.md](lit_cheat_sheet.md).
- **Phase 2 Complete:** Authored all 6 tutorial guides:
  - [lit_controllers_guide.md](lit_controllers_guide.md)
  - [lit_properties_and_converters_guide.md](lit_properties_and_converters_guide.md)
  - [lit_context_guide.md](lit_context_guide.md)
  - [lit_lists_and_iteration_guide.md](lit_lists_and_iteration_guide.md)
  - [lit_async_directives_guide.md](lit_async_directives_guide.md)
  - [lit_dom_access_guide.md](lit_dom_access_guide.md)
- **Phase 3 Complete:** Cross-referenced all guides across [lit_guidelines.md](lit_guidelines.md) and [AGENTS.md](../../AGENTS.md). All planned curriculum tasks complete!
