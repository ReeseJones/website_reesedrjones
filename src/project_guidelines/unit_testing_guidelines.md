# Unit Testing Guidelines

This document specifies the testing principles, conventions, execution commands, and agent behavioral standards for unit testing across the codebase.

---

## 1. Core Principles & Agent Obligations

- **Verification Benchmark:** Unit tests serve as the mandatory benchmark for confirming that newly written or refactored code compiles, runs without runtime exceptions, asserts expected behavior and returns, and satisfies its intended contract.
- **Agent Duty to Verify:** Whenever an agent introduces or modifies architectural components, math routines, scene nodes, or subsystems, the agent must run the corresponding unit tests to verify behavior and returns before marking the task complete.
- **Never Spin Up Real WebGL Contexts:** Unit tests must remain fast, deterministic, and runnable in headless CLI/CI environments. Never initialize real browser WebGL2 canvases in unit test files. Use interface stubs and mock fixtures.

---

## 2. Test Authoring Protocol: Interface-Driven Testing

When writing unit tests for any class, module, or subsystem, agents must adhere to the following three-step analysis:

### Step 1: Map the Explicit Public Interface
- Inspect the module's exported type interface (`*_types.ts`) or class definition.
- Create a root `describe('ClassName or ModuleName')` block.
- Create a nested `describe('.methodName()')` or `describe('propertyName')` block for **every** public method, getter, and setter in the interface.

### Step 2: Branch & Parameter Input Matrix
For each public method or property, enumerate the code paths based on unique parameter inputs and edge conditions. Create an `it('should ...')` spec for each:
- **Return Value & Output Verification:** Explicitly assert what the method **returns** for each code path—including return data structures, primitive values, boolean status flags, nullable outputs (`null` / `undefined`), and fluent method chaining (`return this`). Never verify internal side-effects alone; always assert the returns.
- **Nominal / Happy Path:** Standard valid inputs producing expected returns and state changes.
- **Boundary & Zero Cases:** Zero vectors, negative values, identity matrices, empty arrays, null/undefined optional parameters, asserting fallback or error returns.
- **State Mutation & Dirty Flagging:** Verifying internal flags change, cached values are invalidated, and listeners are triggered.
- **Idempotency & Redundancy:** Calling a method repeatedly with the same arguments (e.g. binding an already-bound buffer) must not produce side effects, duplicate operations, or unexpected returns.

### Step 3: Domain-Specific Holistic Requirements
Evaluate the component within the broader 3D engine context:
- **Math Invariants:** Matrix multiplications compose in the correct coordinate space order ($M_{\text{world}} = M_{\text{parent}} \times M_{\text{local}}$); vector normalization results in unit length ($|\vec{v}| \approx 1.0$).
- **Precision Tolerance:** Floating-point operations in 3D calculations must use `expect(val).toBeCloseTo(expected, numDigits)` rather than strict `toBe()`.
- **Hierarchical Propagation:** Updating a parent transform must invalidate downstream children.
- **Deterministic Resource Cleanup:** Disposing an object (`.dispose()`, `.destroy()`) must detach listeners, unbind references, and trigger cleanup hooks without memory leaks.

---

## 3. Mocking Architecture

### A. Context Manager Stubbing (`createMockContextManager()`)
- High-level scene components ([`ModelInstance`](../scene/models/model_instance.ts), [`Material`](../scene/materials/material.ts), [`SceneRenderer`](../scene/renderer/scene_renderer.ts)) consume the [`IWebGLContextManager`](../webgl/core/context_manager_types.ts) interface.
- Never instantiate a real `WebGLContextManager` when testing scene nodes or materials.
- Use [`createMockContextManager()`](../testing/mocks/mock_context_manager.ts) which provides pre-configured `vi.fn()` spies for pipeline states, geometry binding, and shader acquisition.

### B. Hardware WebGL Context Mocking (`createMockWebGL2Context()`)
- Subsystems like [`GeometryManager`](../webgl/geometry/geometry_manager.ts), [`TextureManager`](../webgl/textures/texture_manager.ts), or [`VertexBuffer`](../webgl/geometry/vertex_buffer.ts) interact directly with `WebGL2RenderingContext`.
- Use [`createMockWebGL2Context()`](../testing/mocks/mock_gl_context.ts), which implements the WebGL2 state machine calls (`createBuffer`, `bindVertexArray`, `bufferData`, `deleteBuffer`) as spy functions.

### C. Spy & Lifecycle Verification
- Spy on callbacks using `vi.fn()`:
  - Example: `const listener = vi.fn(); geometry.onDispose(listener);`
  - Assert call counts and arguments: `expect(listener).toHaveBeenCalledTimes(1);`

---

## 4. Parcel Import Rules in Unit Tests

- **GLSL Shaders:**
  - Direct imports of `.vert`, `.frag`, and `.glsl` files are supported out-of-the-box by the Vitest configuration, resolving to the raw shader string (matching `@parcel/transformer-glsl`).
- **Static Assets & Images:**
  - Image imports (`.png`, `.jpg`, `.svg`) resolve to mock asset URL strings in Vitest.
- **Prefix Imports:**
  - Prefixes like `bundle-text:` and `url:` are automatically normalized by the Vitest compatibility plugin.
- **Bundler Glob Imports (DO NOT UNIT TEST):**
  - Files relying on Parcel's proprietary `@parcel/resolver-glob` (such as `src/pages/articles/index_instance.ts`) must **not** be unit tested directly. These are bundler manifest bridges tested via `npm run build`. Test the pure helper functions consuming that data with plain mock objects instead.

---

## 5. Execution Commands & Workflows

- **Full Suite Run (All Tests):**
  - `npm test` (executes `vitest run` across all test files and exits).
- **Targeted Incremental Development (Watch Mode):**
  - `npm run test:watch` (launches Vitest interactive watcher; re-runs only changed files on save).
- **Targeted Directory / File Run:**
  - Run a specific directory or file without running the full suite:
    - `npx vitest run src/maths/`
    - `npx vitest run src/scene/core/transform.test.ts`
- **Targeted Test Name Filter (`-t`):**
  - Run only specs matching a regex pattern:
    - `npx vitest run -t "dirty flag"`
- **Code Coverage Report:**
  - `npm run test:coverage` (runs V8 coverage analysis, prints terminal summary, and outputs HTML report to `coverage/`).
