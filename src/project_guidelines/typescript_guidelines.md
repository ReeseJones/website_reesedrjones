# TypeScript Guidelines

Principles, standards, and typing patterns for TypeScript code in this repository.

---

## 1. Type Safety: Favoring `unknown` Over `any`, Type Narrowing & Escalation
- **Heavily Favor `unknown` Over `any`:** `unknown` is the type-safe counterpart of `any`. It denotes a value whose shape is undetermined without silencing compiler verification. Heavily favor `unknown` over `any` across all type definitions, parameters, return types, generic defaults, event payloads, and deserialized inputs. Never use `any` as a convenience shortcut or placeholder.
- **Prefer Type Checking & Narrowing Over Casting:** Prefer type checking and narrowing with guards or other built-in mechanisms to arrive at the correct type instead of type casting (`as Type` or `<Type>`). Type casting bypasses compiler safety, conceals type mismatches, and introduces brittle runtime assumptions. Instead of casting, use TypeScript's built-in narrowing mechanisms and guards:
  - **Primitive checks:** `typeof val === "number"`, `typeof val === "string"`, `typeof val === "boolean"`, `typeof val === "function"`
  - **Instance & prototype checks:** `val instanceof TargetClass`, `val instanceof HTMLElement`, `val instanceof Float32Array`
  - **Array checks:** `Array.isArray(val)`
  - **Property existence checks:** `"propName" in val` (using the `in` operator on `object`)
  - **Discriminated unions:** Matching literal tags (e.g., `event.type === "click"`, `msg.kind === "ready"`)
  - **User-defined type guards:** Functions with type predicates (`(val: unknown): val is SpecificType => ...`)
  - **Assertion functions:** Functions with assertion signatures (`asserts val is SpecificType`)
- **Escalation to Prompters & Mandatory Documentation for `any`:** The use of `any` is strictly forbidden under normal circumstances. If a situation arises where `any` appears strictly necessary or unavoidable (e.g., intractable circular type evaluation in third-party library definitions or compiler limits):
  - **Bring it up to the prompters:** Agents and developers must halt and explicitly bring it up to the prompter (the user) before introducing `any`, explaining why the type system cannot resolve the type cleanly and outlining alternatives.
  - **Document if `any` must be used:** If approved by the prompter, the use of `any` must be thoroughly documented in-place with an inline code comment detailing the exact technical justification, why `unknown` or a generic parameter was insufficient, and the context of the prompter approval.

---

## 2. Generic Records & Dictionary Typing
- **Constraint Standards:** When constraining open dictionary objects or arbitrary property maps, use `Record<string, unknown>` instead of `Record<string, any>`.
- **Interface vs. Record Compatibility (`object` vs. `Record<string, unknown>`):** In TypeScript, interfaces declared via `interface Foo { ... }` do not have an implicit string index signature. Constraining a generic parameter as `<T extends Record<string, unknown>>` will reject interface types that lack explicit `[key: string]: unknown` index declarations. For generic parameter dictionaries (such as `ShaderProgram<TUniforms>`), use `<TUniforms extends object = Record<string, unknown>>` to cleanly support both TypeScript `interface` hierarchies and `type` records.
- **Key Constraints:** Use `Record<string, unknown>` (or `Record<string, never>` when no arbitrary properties should be supplied) rather than untyped object wrappers.

---

## 3. Contravariant Generics & Heterogeneous Registries
- **Container / Registry Abstractions:** When an infrastructure container or registry (such as [`WebGLContextManager`](../webgl/context_manager.ts)) stores instances of generic types (e.g., `ShaderProgram<TUniforms>`) without invoking generic consumer methods (such as `setUniforms`):
  - Use `ShaderProgram<never>` (or `ShaderProgram<Record<string, unknown>>`) rather than `ShaderProgram<any>`.
  - Contravariant parameter positions (`setUniforms(uniforms: Partial<TUniforms>)`) naturally permit assigning `ShaderProgram<SpecificUniforms>` to `ShaderProgram<never>` because `never` accepts no invalid uniform inputs.
  - This preserves type safety while avoiding loose `any` escape hatches.

---

## 4. DOM, Browser APIs & CSS Typing
- **Interface Augmentation:** Extend global browser types (e.g., `interface Window`) via ambient or module declarations rather than casting `window as any`.
- **CSS Custom Properties:** In React `style` objects, type CSS variables using template literals (`[name as `--${string}`]: value`) rather than `[name as any]: value`.
- **React Event Targets:** Type React synthetic events to their concrete DOM node types (e.g., `React.FocusEvent<HTMLElement>`) instead of `React.FocusEvent<any>`.

---

## 5. Separation of Interfaces & Types from Implementations
- **Dedicated Type Modules:** Separate type interfaces and type declarations into dedicated type files (e.g., `types.ts`, `*_types.ts`) away from class, function, and variable definitions.
- **Dependency Isolation & Tree-Shaking:** Consumers that only need types for annotations or contracts should never be forced to import runtime implementation code, heavyweight third-party libraries (e.g., PixiJS, WebGL runtime), or module side-effects.
- **Cycle Prevention:** Splitting interfaces from concrete classes eliminates circular dependency graphs between collaborating components or managers.
- **No Barrel Files:** Even when types are split into separate files, do not create barrel files (`index.ts` re-exporting types and classes together). Import types directly from their respective type files using `import type { ... } from "./..._types"`.

---

## 6. Standalone Pure Functions vs. Class Methods
- **Avoid Pseudo-Instance Methods:** If a class member method does not read or mutate instance state (`this`), or only accesses trivial contextual data (such as a debug label) that can be passed as an argument, do not declare it as an instance method.
- **Prefer Standalone Module Functions:** Extract such routines into dedicated standalone functions (`function doWork(...)`) in appropriate utility modules rather than static class methods:
  - **Tree-Shaking & Lean Classes:** Standalone functions avoid bloating class constructor objects and allow bundlers to perform granular dead-code elimination.
  - **Explicit Dependencies:** All required context (e.g., `gl: WebGL2RenderingContext`, `label: string`) is passed explicitly via arguments.
  - **Zero Implicit Coupling:** Guarantees that the function has no side-effects on instance state and does not depend on object lifecycles.
  - **Isolated Testability & Reusability:** Pure standalone functions can be directly tested and shared across modules without instantiating class hierarchies or mocking complex constructor dependencies.

---

## 7. Encapsulation & Member Visibility: Avoiding Protected State
- **Default to `private` for Internal State:** All internal state variables, cache fields, backing storage, and non-exported helper methods must default to `private`. Never use `protected` as a default or convenience modifier.
- **Zero `protected` Members on Leaf Classes:** Concrete classes not explicitly designed as base classes for inheritance (such as `PerspectiveCamera`, `GalaxyMaterial`, `CubeGeometry`) must never declare `protected` members. If a class has no derived subclasses, every internal member must be `private`.
- **Avoid Protected State / Variables:** Base classes must not expose raw mutable state fields to subclasses:
  - **Fragile Base Class Risk:** Directly exposing mutable state allows derived classes to mutate fields without triggering cache invalidation, dirty tracking, or invariant verification in the base class.
  - **Read-Only Access via Getters:** When derived classes need to observe base class state, base classes should provide public or protected read-only getters (`this.near`, `this.far`, `this.transform`) rather than exposing raw backing variables (`this._near`, `this._far`, `this._transform`).
  - **Behavioral Mutation Methods:** If derived classes need to alter base lifecycle or invalidation states, provide explicit protected methods (e.g., `protected markProjectionDirty(): void`) rather than allowing subclasses to set raw flags (`this._isProjDirty = true`).
- **Restrict `protected` to Template Method Hooks:** The `protected` modifier is strictly reserved for:
  - Abstract methods intended for subclasses to implement (e.g., `protected abstract updateProjectionMatrix(): void`).
  - Virtual lifecycle hooks or extension callbacks (e.g., `protected onBeforeRender(): void`).
  - Controlled base mutators that enforce invariants and manage dirty flags.

---

## 8. DOM Event Architecture: Custom `Event` Subclasses (Prohibition of `CustomEvent`)
- **Subclass `Event` Directly:** Never dispatch generic `CustomEvent<T>` or rely on `.detail` property bags for custom application or component events. Create dedicated classes extending the browser's native `Event`.
- **Encapsulated Event Defaults:** Custom event classes must define a `public static readonly TYPE = "event-name"` constant and encapsulate default dispatch configurations (`bubbles: true`, `composed: true`) in their constructor:
  ```ts
  export class SceneCameraChangedEvent extends Event {
      public static readonly TYPE = "scene-camera-changed";
      public readonly camera: ICamera | null;

      public constructor(camera: ICamera | null) {
          super(SceneCameraChangedEvent.TYPE, { bubbles: true, composed: true });
          this.camera = camera;
      }
  }
  ```
- **Direct First-Class Properties:** Payload data must be exposed as strongly-typed, `readonly` direct properties on the event instance (`event.camera`) rather than wrapped inside `.detail.camera`.
- **Global `HTMLElementEventMap` Augmentation:** Augment `HTMLElementEventMap` using the static `TYPE` constant to ensure `addEventListener` and `removeEventListener` are strictly type-safe without manual event casting:
  ```ts
  declare global {
      interface HTMLElementEventMap {
          [SceneCameraChangedEvent.TYPE]: SceneCameraChangedEvent;
      }
  }
  ```
- **Runtime `instanceof` Narrowing:** Custom event classes provide clean runtime type guards (`if (event instanceof SceneCameraChangedEvent)`) without unsafe type assertions.

---

## 9. Browser & Hardware API Boundaries: Factory Object Dependency Injection

Any time codebase logic interacts with browser-native hardware, DOM observers, or platform classes (such as `ResizeObserver`, `IntersectionObserver`, `MutationObserver`, `AudioContext`, `Worker`, `WebSocket`, `IndexedDB`), it must follow the **3-Tier Factory Object Dependency Injection Pattern**.

### Core Rules

- **Zero Inline Instantiation:** Never call `new BrowserAPI(...)` directly inside services, managers, hooks, or reactive controllers.
- **Zero Fallback Branches:** Do NOT author `typeof BrowserAPI !== "undefined"` fallback branches. Relying on environment checks creates dead code branches, hides test coverage gaps, and complicates execution across non-DOM environments. The factory must be a **required** dependency.
- **Pure Interfaces in Dedicated Types Modules:** Separate the target's contract and factory interfaces into dedicated `*_types.ts` files, adhering to Section 5.

### The 3-Tier Structure

1. **Target Contract Interface (`*_types.ts`):**
   Define a minimal, strongly-typed interface capturing the contract methods needed from the browser class:
   ```ts
   export interface IResizeObserverLike {
       observe(target: Element, options?: ResizeObserverOptions): void;
       unobserve(target: Element): void;
       disconnect(): void;
   }
   ```

2. **Factory Object Interface (`*_types.ts`):**
   Define an explicit factory interface containing a `.create()` method that returns the contract interface:
   ```ts
   export interface IResizeObserverFactory {
       create(callback: ResizeObserverCallback): IResizeObserverLike;
   }
   ```
   In options or constructor parameters, require this factory explicitly:
   ```ts
   export interface ResizeControllerOptions {
       readonly observerFactory: IResizeObserverFactory;
       readonly target?: HTMLElement;
       // ... other options
   }
   ```

3. **Standalone Default Factory Module (`*_factory.ts`):**
   In a separate, dedicated module (outside the controller or service file), implement and export a standalone default factory singleton:
   ```ts
   import type { IResizeObserverFactory } from "./resize_controller_types";

   export const defaultResizeObserverFactory: IResizeObserverFactory = {
       create(callback: ResizeObserverCallback) {
           return new ResizeObserver(callback);
       },
   };
   ```

### Benefits for Architecture & Testing

- **Decoupled Engine Logic:** Engine services and controllers remain pure TypeScript modules with zero hidden dependencies on global browser state.
- **Hermetic Unit Testing:** Unit tests for controllers and services can run in headless Node.js by passing a mock factory (`{ create: vi.fn(() => mockInstance) }`) without requiring DOM shims or browser environments.
- **Native Spyability in Consumers:** High-level consumer components or custom elements that consume the default factory singleton can be tested by cleanly spying on the method (`vi.spyOn(defaultResizeObserverFactory, "create")`) and restoring it (`spy.mockRestore()`), eliminating all need for monkey-patching `globalThis`.

---

## 10. Prohibition of Superfluous & No-Op Method Overrides

- **No Pure Pass-Through Super Delegations:** Never declare an `override` method, lifecycle hook, or constructor whose sole action is delegating directly to `super.methodName(...args)`.
- **Zero Typing Justification:** TypeScript classes automatically inherit all base class method signatures and return types. Overriding a method purely to restate the parent's signature or parameter types provides zero type-safety benefits to callers and creates dead code, redundant call frames, and maintenance overhead.
- **Lifecycle Hook Cleanliness:** In component lifecycle hierarchies (such as Lit Web Components, React class components, or custom DOM controllers):
  - Do not implement `connectedCallback()`, `disconnectedCallback()`, `updated()`, or `firstUpdated()` unless the class executes concrete setup, resource unregistration, DOM listeners, or reactive property diffing.
  - Stubs or scaffolding left behind from template generators or incomplete refactors must be removed immediately.
- **When Overrides Are Justified:** An `override` method is appropriate ONLY when:
  - Executing custom logic, state updates, validation, or side-effects before or after calling `super`.
  - Implementing or fulfilling an `abstract` method or virtual extension hook defined by the base contract.
  - Explicitly specializing or narrowing the return type of a method that cannot be expressed via generics on the base class.

---

## 11. Constants & Magic Numbers: Judicious Use vs. Constant Over-Extraction

Constants are intended to communicate intent, prevent magic-number hazards, and consolidate values that drive algorithmic calculations or shared contract configurations. However, extracting trivial values into top-level constants creates indirection, boilerplate, and maintenance overhead without providing safety or readability.

### What Should Be a Constant

- **Algorithmic Values & Math Invariants:** Values involved in complex mathematical formulas, physics calculations, procedural generation curves (e.g., galaxy arm spiral pitches, density decay coefficients), camera easing factors, and interpolation coefficients.
- **Arbitrary Index & Protocol Values:** Seemingly arbitrary or opaque hardware/protocol values that carry specific domain semantics, such as:
  - WebGL generic vertex attribute indices (e.g., `POSITION_LOC = 0`, `TEXCOORD_LOC = 1`).
  - Texture unit bindings (e.g., `TEXTURE_UNIT_0 = 0`).
  - Bitmasks and flag bitshifts.
  - Byte stride or offset alignments in raw binary buffers.
- **Shared API Contracts & Config Defaults:** Default fallback values or priority enums that are explicitly shared across multiple distinct consumer files as part of a public interface contract.

### What Should NOT Be a Constant (Keep Inline)

- **Lit & React Template Attributes:** Direct template attributes and props such as element dimensions, pixel widths, dash speeds, anchors, rotation offsets, titles, and test identifiers. Inline literals (`<rj-polyline line-width={16} dash-speed={1} />` or `size={{ x: 32, y: 32 }}`) are immediately legible in the declarative tree and should not be extracted to top-level constants.
- **Trivial Booleans and Primitives:** Do not create constants for self-evident defaults (e.g., `DEFAULT_HIDDEN = false`, `DEFAULT_NAME = ""`, `DEFAULT_PRIORITY = 0`). Initialize properties directly in class field declarations, constructor signatures, or destructuring defaults.
- **One-Off Geometry/Vector Literals in Declarative Trees:** Vectors or dimensions used exclusively to configure a single declarative template instance.
- **Backwards-Compatibility Constant Aliases:** Never retain alias exports (e.g., `export const FOO_ELEMENT_NAME = FOO_NAME;`). Update references cleanly across the codebase.
