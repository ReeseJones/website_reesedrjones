# Lit & Web Component Authoring Guidelines

Design principles, architecture standards, and authoring conventions for Lit Web Components in this codebase.

---

## 1. Core Architecture & Component Model

- **Stateful Lifecycle Ownership:** Lit components inherit from `LitElement` and function as persistent, stateful controllers. They are ideal for bridging imperative, long-lived runtime instances (such as WebGL scene graph nodes, cameras, render passes, and animation loops) into the declarative DOM tree.
- **Persistent Object Identity:** Unlike React function components which execute on every render pass, a Lit component instance remains allocated from `connectedCallback()` until `disconnectedCallback()`. WebGL handles, dirty flags, GPU buffers, and programmatic engine nodes live directly on the component class instance without artificial `useRef` bridges.
- **Pure, Side-Effect-Free Module Imports:**
  - Modules declaring `LitElement` classes must NEVER auto-register the custom element via top-level execution of `customElements.define()` or decorators that invoke registration on import.
  - Importing an element class must be completely free of side effects, allowing consumers, bundlers, and test suites to import classes without modifying the global `window.customElements` registry.
- **Explicit, Flag-Guarded Setup Functions:**
  - Provide a dedicated, exported setup function (e.g., `registerSceneElement()`, `registerSceneElements()`) that registers the element with the browser's custom element registry.
  - The setup function must be internally guarded against redundant registration: check `if (!customElements.get(TAG_NAME))` or track an internal registration flag before executing `customElements.define()`.
  - Calling the setup function multiple times across different entry points or render cycles must be idempotent and safe.
- **Tag Name Prefixing vs. Class Naming Convention:**
  - **HTML Tag Names (`rj-` Prefix):** All custom elements registered in the browser must be prefixed with `rj-` (e.g., `<rj-scene>`, `<rj-perspective-camera>`, `<rj-scene-group>`, `<rj-scene-node>`) to establish a unified library namespace and prevent collisions with standard HTML elements.
  - **Class Definitions (No Prefix):** Element class definitions must NOT contain the `rj-` prefix. Maintain clean, descriptive PascalCase domain names (e.g., `SceneElement`, `PerspectiveCameraElement`, `SceneGroupElement`, `SceneNodeElement`). The `rj-` prefix applies strictly to HTML tag names and registry strings.

---

## 2. Type Separation Standard

- **Dedicated Types Modules:** All component property interfaces, element attributes, emitted custom event details, and internal state contracts must reside in a companion types file (e.g., `perspective_camera_element_types.ts`, `scene_element_types.ts`).
- **Interface Imports:**
  ```ts
  import type { PerspectiveCameraElementProps } from "./perspective_camera_element_types";
  ```
- **Native Element Map Augmentation (`HTMLElementTagNameMap`):**
  - Each custom element definition must include an ambient declaration augmenting `HTMLElementTagNameMap` mapping its `rj-*` tag name directly to the concrete class type:
  ```ts
  declare global {
      interface HTMLElementTagNameMap {
          "rj-perspective-camera": PerspectiveCameraElement;
      }
  }
  ```
- **Strongly-Typed Custom Event Classes (`HTMLElementEventMap`):**
  - Adhere strictly to the project-wide DOM Event standard in [typescript_guidelines.md](typescript_guidelines.md#8-dom-event-architecture-custom-event-subclasses-prohibition-of-customevent). Never dispatch generic `CustomEvent<T>`.
  - Create dedicated classes extending `Event` with encapsulated bubbling/composed defaults and direct properties. Augment `HTMLElementEventMap` using the static `TYPE` constant:
  ```ts
  export class SceneNodeAttachedEvent extends Event {
      public static readonly TYPE = "scene-node-attached";
      public readonly node: ISceneNode;
      public readonly element: HTMLElement;

      public constructor(node: ISceneNode, element: HTMLElement) {
          super(SceneNodeAttachedEvent.TYPE, { bubbles: true, composed: true });
          this.node = node;
          this.element = element;
      }
  }

  declare global {
      interface HTMLElementEventMap {
          [SceneNodeAttachedEvent.TYPE]: SceneNodeAttachedEvent;
      }
  }
  ```
- **Context Key Symbols in Type Files:**
  - All `@lit/context` tokens must be keyed using unique `Symbol()` identifiers (e.g., `Symbol("rj-scene-context")`) rather than arbitrary strings to guarantee strict pointer equality (`===`) and prevent namespace collisions.
  - Context tokens must be defined and exported directly within the companion type module (e.g., `scene_element_types.ts`).
  ```ts
  import { createContext } from "@lit/context";
  import type { ISceneContext } from "./scene_element_types";

  export const sceneContext = createContext<ISceneContext>(
      Symbol("rj-scene-context")
  );
  ```
  - **Rationale:** Defining context tokens in the types file allows both providers and consumers to import the token cleanly without pulling in component implementation classes or introducing circular dependency chains.
- **Rationale:** Augmenting the native browser element and event maps provides seamless compile-time type safety across all DOM traversal, element creation, and event dispatch APIs without requiring cast assertions, while keeping the type definitions cleanly decoupled from framework-specific JSX wrappers.

---

## 3. Reactive Properties & Lifecycle Protocol

- **Static Properties Declaration (Decoratorless Workflow):**
  - Define all reactive properties using Lit's standard static properties class field: `public static override properties = { ... }` paired with TypeScript ambient property declarations: `public declare prop: type;`.
  - Initialize default property values in the class `constructor()`.
  - Internal state variables are simple private/protected class fields (e.g. `private _activeState: boolean = false;`) that trigger updates via `this.requestUpdate()` when reactive re-rendering is needed.
  - Example:
    ```ts
    export class PerspectiveCameraElement extends LitElement {
        public static override properties = {
            fov: { type: Number, reflect: true },
            position: { converter: vector3Converter, reflect: true },
        };

        public declare fov: number;
        public declare position: Vector3Tuple;

        private _activeState: boolean = false;

        public constructor() {
            super();
            this.fov = 60;
            this.position = [0, 0, 0];
        }
    }
    ```
  - Always specify the property `type` (e.g., `Number`, `Boolean`, `String`, `Object`) for primitive attributes, and configure `reflect: true` only when the attribute needs to be mirrored to the DOM for CSS styling or external inspection. Complex objects, arrays, or non-serialized properties must specify `attribute: false`.
  - **Prohibition of Decorators:** Do not use experimental or Stage 3 decorators (`@property`, `@state`, or the `accessor` keyword). The project's build pipeline (Parcel 2 and SWC) is strictly standard ECMAScript without decorator transpilation.
- **Property Mutation vs. Dirty Checking:**
  - Leverage `updated(changedProperties: PropertyValues<this>)` for fine-grained change reaction.
  - Check `changedProperties.has("propName")` to cascade changes into the underlying programmatic engine, updating only dirty flags or dirty uniform matrices.
- **Lifecycle Cleanup Integrity:**
  - In `connectedCallback()`, attach the underlying programmatic engine node to its parent or register with the enclosing scene controller. Always call `super.connectedCallback()`.
  - In `disconnectedCallback()`, unregister from the scene, detach from parent nodes, and release GPU listeners. Always call `super.disconnectedCallback()`.
  - Ensure lifecycle cleanup is idempotent: re-attaching a detached element must seamlessly re-integrate into the scene without resource leaking or state corruption.
- **Prohibition of Empty / No-Op Lifecycle Overrides:**
  - Do NOT declare lifecycle hooks (`updated`, `connectedCallback`, `disconnectedCallback`, `firstUpdated`) if the element does not perform active work, state changes, or cleanup.
  - Never author methods that solely delegate to `super.<lifecycle>()`. Adhere to [typescript_guidelines.md](typescript_guidelines.md#10-prohibition-of-superfluous--no-op-method-overrides).

---

## 4. DOM Hierarchy & Rendering Hygiene

- **Light DOM for Scene Graph Hierarchy:**
  - For non-visual structural components (e.g., `<scene-node>`, `<perspective-camera>`, `<scene-group>`) that exist solely to construct a scene hierarchy, override `createRenderRoot()` to return `this` (rendering into the Light DOM rather than creating a Shadow Root).
  - **Rationale:** Light DOM rendering allows child elements to traverse the DOM hierarchy via standard methods (`this.parentElement`, `this.closest("scene-element")`) without fighting Shadow DOM boundary encapsulation.
- **Zero Render-Loop Overhead:**
  - A Lit component's `render()` method must remain computationally lightweight and must never drive WebGL rendering ticks.
  - Visual elements (such as `<webgl-canvas>`) host the rendering `<canvas>` surface and kick off requestAnimationFrame loops independently of Lit's property update cycles.
  - Structural scene elements render either nothing or an empty `<slot></slot>` to project child custom elements.

---

## 5. Context Protocol Architecture (`@lit/context`)

- **Standard W3C Context Protocol:**
  - Hierarchical communication across DOM trees must use `@lit/context` (`ContextProvider` and `ContextConsumer`) rather than fragile CSS selector traversals (`closest()`).
  - **Shadow DOM & Slot Piercing:** Context requests dispatch composed DOM events (`context-request`, with `composed: true`), allowing context to cross Shadow DOM boundaries and `<slot>` projections transparently.
- **Multi-Tier Context Keying via Symbols:**
  - Create dedicated context keys via `createContext<T>(Symbol("key"))` in companion type files for distinct architectural responsibilities. Using `Symbol()` guarantees strict reference identity and eliminates string comparisons or namespace collisions:
    - `webglCanvasContext`: Provides the WebGL2 rendering device, canvas dimensions, resolution, and resource manager. Provided by `<rj-webgl-canvas>`.
    - `sceneContext`: Provides the root `IScene` engine, active camera registrar, and demand-driven frame subscription loop. Provided by `<rj-scene>`.
    - `parentNodeContext`: Provides the immediate parent `ISceneNode`. Provided by `<rj-scene>` and re-provided by each structural node (`<rj-scene-group>`, `<rj-perspective-camera>`).
- **Context Shadowing for Hierarchy:**
  - Each nested scene node provides `parentNodeContext` initialized to its own programmatic node. Child nodes naturally consume their nearest ancestor node without querying tag names.
  - Higher-tier contexts (`webglCanvasContext`, `sceneContext`) pass straight through to all descendants without being shadowed.
- **Provider & Consumer Hygiene:**
  ```ts
  // Provider pattern
  private parentProvider = new ContextProvider(this, {
      context: parentNodeContext,
      initialValue: this.node,
  });

  // Consumer pattern with reactive callback
  private parentConsumer = new ContextConsumer(this, {
      context: parentNodeContext,
      subscribe: true,
      callback: (parent) => {
          if (parent) {
              parent.addChild(this.node);
          }
      },
  });
  ```

---

## 6. GPU Resource Management: Property Forwarding vs. Child Elements

- **Direct Property Forwarding for GPU Assets:**
  - Meshes, geometries, textures, and shader materials must be passed directly as object properties on elements (e.g., `<rj-model-instance .geometry={geom} .material={mat}>`) rather than instantiated as declarative child DOM elements.
- **Rationale for Property Forwarding:**
  - **Asset Reuse & Memory Optimization:** 3D engines require sharing a single GPU vertex buffer or shader program across dozens or hundreds of mesh instances. Property forwarding encourages instantiating assets once in memory and passing references.
  - **DOM & Garbage Collection Efficiency:** Creating declarative tags for every geometry and material (`<rj-model-instance><rj-box-geometry /><rj-standard-material /></rj-model-instance>`) triples the DOM element count and creates unnecessary DOM mutation overhead.
  - **React 19 Native Support:** React 19 natively passes JavaScript object references directly to Custom Element properties without string conversion or synthetic wrappers.

---

## 7. React 19 Interoperability Standard

- **Direct Property and Event Binding:**
  - React 19 natively passes objects, numbers, and functions directly as properties on custom elements without synthetic wrappers.
  - Standard React JSX attributes map cleanly to Lit custom elements:
    ```tsx
    <rj-perspective-camera
        fov={60}
        aspect={16 / 9}
        near={0.1}
        far={1000}
        makeDefault
    />
    ```
- **React Ref Stability:**
  - Standard React `ref` attributes attached to custom elements yield the underlying `LitElement` class instance directly.
- **Event Listeners in JSX:**
  - Custom events dispatched with kebab-case (e.g., `onscene-node-attached`) can be listened to in React 19 using native lowercase event props:
    ```tsx
    <rj-scene onscene-camera-changed={handleCameraChanged}>
    ```

---

## 8. Testing Lit Elements

- **Pure TypeScript File Naming:**
  - Name test files with pure TypeScript extensions matching `*element*.test.ts` (e.g., `scene_element.test.ts`, `perspective_camera_element.test.ts`). Do not use `.tsx` as Lit components do not use JSX syntax.
- **Happy DOM Environment Routing:**
  - Vitest is configured to automatically route any test file matching `*element*.{test,spec}.ts` into the `dom` project running Happy DOM, while excluding them from the headless Node project.
- **Explicit Per-Suite Element Setup:**
  - Tests must never rely on global element registration in test setup scripts.
  - Each unit test file is strictly responsible for registering only the element it tests by calling its specific setup function inside `beforeAll()`:
    ```ts
    beforeAll(() => {
        setupPerspectiveCameraElement();
    });
    ```
- **Asynchronous Update Timing:**
  - Lit batches property updates asynchronously. When asserting on reactive changes, always await the element's update cycle before making assertions:
    ```ts
    element.fov = 75;
    await element.updateComplete;
    expect(element.camera.fov).toBe(75);
    ```
- **Fixture Lifecycle & Isolation:**
  - Instantiate elements via `document.createElement("rj-*")` and mount to `document.body` in `beforeEach()`.
  - Always clean up fixtures in `afterEach()` via `element.remove()` to prevent DOM leaking across tests.
  - Mock hardware WebGL contexts (`createMockWebGL2Context()`) at boundary lines. Adhere to [unit_testing_guidelines.md](unit_testing_guidelines.md) and [agent_test_implementor_guidelines.md](agent_test_implementor_guidelines.md).

---

## 9. Reference Documentation & Tutorial Series

For comprehensive deep-dives, concept indexes, and advanced architectural guides, refer to the following companion documents:

- **Quick Reference & Concept Index:**
  - [Lit Architectural Cheat Sheet & Concept Index](lit_cheat_sheet.md): Fast index for properties, state, reactive lifecycle hooks, data flow, and DOM access.
- **Deep-Dive Tutorial Guides:**
  - [Lit Reactive Controllers Guide](lit_controllers_guide.md): Encapsulating non-rendered logic, lifecycle hooks, and controllers for animation loops, resize observation, orbit controls, and input.
  - [Reactive Properties, State & Custom Converters Guide](lit_properties_and_converters_guide.md): Static properties declaration, reflection patterns, in-place mutation dirty-checking, and `ComplexAttributeConverter` (vectors, arrays, colors, JSON).
  - [Lit Context Architecture & Hierarchical State Guide](lit_context_guide.md): W3C Context Community Protocol, symbol-keyed context tokens in `*_types.ts`, context shadowing, and multi-tier state stacks.
  - [Working with Lists, Iterables & Virtualization Guide](lit_lists_and_iteration_guide.md): `Array.map()`, built-in iteration directives, differential keyed updates with `repeat()`, and `@lit-labs/virtualizer`.
  - [Async Directives & Streaming Data Guide](lit_async_directives_guide.md): `AsyncDirective` lifecycle, micro-DOM updates via `this.setValue()`, `until()`, suspense patterns, observable streams, and GPU readbacks.
  - [DOM Access, Shadow Roots & Light DOM Guide](lit_dom_access_guide.md): Template `ref()` directives, element queries, slotted content access, and Light DOM scene graph architecture.
- **Curriculum Roadmap & Task List:**
  - [Lit Guidelines Task List](lit_guidelines_tasklist.md): Master checklist and progress tracking for the Lit documentation curriculum.

