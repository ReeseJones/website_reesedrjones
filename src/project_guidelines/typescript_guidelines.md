# TypeScript Guidelines

Principles, standards, and typing patterns for TypeScript code in this repository.

---

## 1. Type Safety & The `unknown` vs. `any` Rule
- **Prefer `unknown` Over `any`:** `unknown` is the type-safe counterpart of `any`. It denotes a value whose shape is undetermined without silencing compiler verification. Always prefer `unknown` over `any`.
- **Mandatory Type Narrowing:** Any value typed as `unknown` must be narrowed using standard runtime checks before properties, indices, or methods are invoked:
  - `typeof val === "number"`, `typeof val === "string"`, `typeof val === "boolean"`
  - `Array.isArray(val)` or `val instanceof Float32Array`
  - Discriminated union property tags (e.g., `event.type === "click"`)
  - User-defined type guards (`(val: unknown): val is SpecificType => ...`)
- **Rare Exceptions for `any`:** The use of `any` is restricted to situations where TypeScript's type system becomes prohibitively complex or structurally impossible to satisfy (e.g., circular type evaluation limits in legacy third-party definitions). When `any` is strictly required, provide an inline code comment justifying why `unknown` or a specific generic cannot be used.

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

