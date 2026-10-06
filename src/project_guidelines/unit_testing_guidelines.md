# Unit Testing Guidelines

This document specifies the testing principles, authoring conventions, custom matcher architecture, mock subsystems, and execution workflows across the codebase.

---

## 1. Core Principles & Engineering Standards

- **Mandatory Verification Benchmark:** Unit tests serve as the benchmark for confirming that newly written or refactored code compiles, runs without runtime exceptions, asserts expected behavior and returns, and satisfies its intended contract.
- **Target Classes and Functions:** Unit tests target **classes and functions**. Plain constants, enums, and raw data structures (such as `STANDARD_VERTEX_LAYOUT` or constants in `*_types.ts`) are not tested with standalone unit test files; their correctness is asserted implicitly through the classes and generator functions that consume them.
- **Pure CPU & Headless Execution:** Unit tests must remain fast, deterministic, and runnable in headless CLI/CI environments. Never initialize real browser WebGL2 canvases or context instances in unit tests. Use pure mathematical calculations, interface stubs, and mock fixtures.
- **Headless Node Environment Rationale (Why Not a Web Environment):** Although the application is built strictly for web browsers, unit tests execute in headless Node.js (`environment: "node"`) for clear architectural reasons:
  - **Simulated DOMs Do Not Implement WebGL2:** Environments like `happy-dom` or `jsdom` emulate the HTML DOM tree but lack a WebGL2 implementation; `HTMLCanvasElement.prototype.getContext("webgl2")` returns `null` unless mocked anyway.
  - **Browser Runner Overhead & Flakiness:** Spawning real browser processes (e.g. Playwright or Chromium via Vitest Browser Mode) introduces significant process startup latency, IPC communication overhead, and GPU driver variability across CI runners for operations that do not require GPU hardware.
  - **Mathematical & Contract Scope:** Over 90% of the graphics engine code (matrix and vector calculations, projection mathematics, transform hierarchy dirty propagation, geometry attribute interleaving, buffer packing, state deduplication) is pure CPU logic.
  - **Global Constant Shimming:** Static enum constants (`WebGL2RenderingContext.<CONSTANT>`) are shimmed onto `globalThis.WebGL2RenderingContext` in [`src/testing/setup.ts`](../testing/setup.ts) via Vitest's `setupFiles`, preventing `ReferenceError` on WebGL constants in Node.js.
  - **Deterministic Hardware Boundaries:** WebGL state machine dispatch is verified with deterministic spy fakes ([`createMockWebGL2Context`](../testing/mocks/mock_gl_context.ts)) rather than real GPU rasterization. Actual GPU compilation and visual regression checks are intentionally separated from unit tests.
- **Zero Magic Numbers & High-Readability Assertions:** Never write assertions with incomprehensible raw index arithmetic (such as `expect(attrs[0]).toBeCloseTo(...)`). Instead, use structured test helper decoders (e.g., [`getVertex`](../testing/geometry_test_helpers.ts)) that unpack raw interleaved buffers into named spatial, normal, and texture coordinate fields.
- **Foundation-First Test Progression:** Tests must be implemented and maintained in foundation-first dependency order: low-level mathematical structures and primitive geometries first, followed by composite objects, cameras, materials, and finally renderers.
- **Assert Return Values and Contracts:** Tests must explicitly verify what a function or method **returns** (return values, status flags, fluent chaining contracts like `return this`), rather than only verifying internal side effects.

---

## 2. Test Authoring Protocol: Interface-Driven Testing

When authoring unit tests for any class, module, or function, adhere to the following three-step analysis:

### Step 1: Map the Explicit Public Interface
- Inspect the module's exported type interface (`*_types.ts`) or class definition.
- Create a root `describe('ClassName or FunctionName')` block.
- Create a nested `describe('.methodName()')` or `describe('propertyName')` block for **every** public method, getter, and setter in the interface.

### Step 2: Branch & Parameter Input Matrix
For each public method or property, enumerate the code paths based on unique parameter inputs and edge conditions. Create an `it('should ...')` spec for each:
- **Return Value & Output Verification:** Explicitly assert what the method **returns** for each code path—including return data structures, primitive values, boolean status flags, nullable outputs (`null` / `undefined`), and fluent method chaining (`return this`).
- **Nominal / Happy Path:** Standard valid inputs producing expected returns and state changes.
- **Boundary & Zero Cases:** Zero vectors, negative values, identity matrices, empty arrays, null/undefined optional parameters, asserting fallback or error returns.
- **State Mutation & Dirty Flagging:** Verifying internal flags change, cached values are invalidated, and listeners are triggered.
- **Idempotency & Redundancy:** Calling a method repeatedly with the same arguments (e.g. binding an already-bound buffer or disposing an already-disposed object) must not produce side effects, duplicate operations, or unexpected returns.

### Step 3: Domain-Specific Holistic Requirements
Evaluate the component within the broader 3D engine context:
- **Math Invariants:** Matrix multiplications compose in the correct coordinate space order ($M_{\text{world}} = M_{\text{parent}} \times M_{\text{local}}$); vector normalization results in unit length ($|\vec{v}| \approx 1.0$).
- **Precision Tolerance:** Floating-point operations in 3D calculations must use approximate matching (`toBeCloseTo` or `.toBeMatrixCloseTo()`) rather than strict `toBe()`.
- **Hierarchical Propagation:** Updating a parent transform must cascade dirtiness to downstream children.
- **Deterministic Resource Cleanup:** Disposing an object (`.dispose()`, `.destroy()`) must detach listeners, unbind references, and trigger cleanup hooks without memory leaks.

---

## 3. Custom Vitest Matchers Architecture

Vitest supports custom matchers via `expect.extend({ ... })`. Custom matchers provide idiomatic Vitest assertion chaining, automatic negation handling (`.not`), and rich failure diagnostics tailored to 3D engine data types.

### Step 1: Implement the Matcher Function
Create the matcher in a shared test helper module (e.g., [`src/testing/matrix_test_helpers.ts`](../testing/matrix_test_helpers.ts)). The function receives `this` (with context like `this.isNot`), the received value, the expected value, and any optional parameters:

```ts
import type { MatcherResult } from "vitest";

export function toBeMatrixCloseTo(
    this: { isNot?: boolean } | void,
    received: ArrayLike<number>,
    expected: ArrayLike<number>,
    numDigits: number = 4
): MatcherResult {
    // 1. Validate argument types and lengths
    if (received.length !== expected.length) {
        return {
            pass: false,
            message: () => `expected length ${expected.length}, but received ${received.length}`,
        };
    }

    // 2. Element-wise comparison within tolerance
    const tolerance = Math.pow(10, -numDigits) / 2;
    let failureIndex = -1;
    let failureDiff = 0;

    for (let i = 0; i < received.length; i++) {
        const diff = Math.abs(received[i] - expected[i]);
        if (Number.isNaN(received[i]) || Number.isNaN(expected[i]) || diff >= tolerance) {
            failureIndex = i;
            failureDiff = diff;
            break;
        }
    }

    const pass = failureIndex === -1;

    // 3. Format informative failure diagnostics
    return {
        pass,
        message: () => {
            if (pass) {
                return `expected matrix not to match expected matrix within ${numDigits} decimal places`;
            }
            const is4x4 = received.length === 16;
            const posDesc = is4x4
                ? `index ${failureIndex} (col ${Math.floor(failureIndex / 4)}, row ${failureIndex % 4})`
                : `index ${failureIndex}`;

            return (
                `expected matrix element at ${posDesc} to be close to ${expected[failureIndex]} ` +
                `within ${numDigits} decimal places (tolerance: ${tolerance}), ` +
                `but received ${received[failureIndex]} (diff: ${failureDiff})`
            );
        },
        actual: received,
        expected,
    };
}
```

### Step 2: Register Globally in `setup.ts`
Vitest automatically loads [`src/testing/setup.ts`](../testing/setup.ts) before running any test suite via `setupFiles` in [`vitest.config.mts`](../../vitest.config.mts). Register the custom matcher using `expect.extend`:

```ts
import { expect } from "vitest";
import { toBeMatrixCloseTo } from "./matrix_test_helpers";

expect.extend({
    toBeMatrixCloseTo,
});
```

### Step 3: Augment Vitest TypeScript Interfaces
To enable IDE autocomplete, type checking, and hover documentation without requiring manual imports in individual test files, declare module augmentation in [`src/testing/setup.ts`](../testing/setup.ts):

```ts
interface CustomMatchers<R = unknown> {
    toBeMatrixCloseTo(expected: ArrayLike<number>, numDigits?: number): R;
}

declare module "vitest" {
    interface Assertion<T = any> extends CustomMatchers<T> {}
    interface AsymmetricMatchersContaining extends CustomMatchers {}
}
```

### Step 4: Using Custom Matchers in Test Specs
Once registered, test files can use the custom matcher directly on any `expect()` call:

```ts
// Standard positive assertion
expect(camera.projectionMatrix).toBeMatrixCloseTo(expectedProjection);

// With custom precision tolerance
expect(camera.viewMatrix).toBeMatrixCloseTo(expectedView, 5);

// Negated assertion
expect(camera.projectionMatrix).not.toBeMatrixCloseTo(initialMatrix);
```

---

## 4. Shared Test Helpers & Decoders

Shared testing utilities live in `src/testing/` to prevent duplicate test code and ensure consistent assertions across suites:

- **Matrix Test Matcher & Helper:** [`src/testing/matrix_test_helpers.ts`](../testing/matrix_test_helpers.ts)
  - `toBeMatrixCloseTo`: Custom Vitest matcher for comparing matrices and vectors of any size with column/row diagnostic error messages.
  - `expectMatricesToBeClose`: Functional fallback wrapper.
- **Geometry Attribute Decoder:** [`src/testing/geometry_test_helpers.ts`](../testing/geometry_test_helpers.ts)
  - `getVertex(attributes, vertexIndex)`: Unpacks interleaved vertex buffer data into a typed `{ x, y, z, nx, ny, nz, u, v }` record, avoiding magic offset calculations.

---

## 5. Mocking Architecture & Boundaries

### A. Real Implementations Over Synthetic Mocks
- **Use Real Pure-CPU Classes First:** If a domain class executes purely in CPU memory without GPU drivers or browser DOM dependencies (e.g. [`Scene`](../scene/core/scene.ts), [`SceneNode`](../scene/core/scene_node.ts), [`PerspectiveCamera`](../scene/camera/perspective_camera.ts), [`OrthographicCamera`](../scene/camera/orthographic_camera.ts), [`QuadGeometry`](../scene/models/primitives/quad_geometry.ts), [`CubeGeometry`](../scene/models/primitives/cube_geometry.ts), [`SphereGeometry`](../scene/models/primitives/sphere_geometry.ts), [`UnlitMaterial`](../scene/materials/unlit_material.ts), [`GalaxyMaterial`](../scene/materials/galaxy_material.ts), [`ModelInstance`](../scene/models/model_instance.ts)), **instantiate the real class directly** in tests.
- **Never Write Synthetic Inline Mocks:** Do not author 50-line hand-rolled fake objects (e.g. `createMockCamera()`, `createMockMaterial()`, `createMockGeometry()`) inside test suites. Synthetic fakes duplicate class logic, drift silently from real production code, and undermine test fidelity.
- **Observe Behavior via Spies:** When testing orchestration or leaf systems (like [`SceneRenderer`](../scene/renderer/scene_renderer.ts)) that interact with scene nodes, instantiate real classes and attach targeted Vitest spies (`vi.spyOn(camera, "updateMatrices")`, `vi.spyOn(scene, "update")`).

### B. Hardware Mock Boundary (`src/testing/mocks/`)
Centralized mock generators in `src/testing/mocks/` are reserved exclusively for non-instantiable hardware, driver, or browser environmental barriers:
- **Hardware WebGL Context (`createMockWebGL2Context()`):**
  - File: [`src/testing/mocks/mock_gl_context.ts`](../testing/mocks/mock_gl_context.ts)
  - Returns: `WebGL2RenderingContext`
  - Required because Node.js has no native OpenGL/WebGL2 driver. Implements state machine calls (`createBuffer`, `bindVertexArray`, `drawArrays`, `drawElements`) as `vi.fn()` spies.
- **Context Manager Microkernel (`createMockContextManager()`):**
  - File: [`src/testing/mocks/mock_context_manager.ts`](../testing/mocks/mock_context_manager.ts)
  - Returns: [`IWebGLContextManager`](../webgl/core/context_manager_types.ts)
  - Coordinates GPU resource subsystems (`shaders`, `textures`, `geometries`) with spy-wrapped microkernel methods.
- **Texture Asset Stubs (`createMockTexture()`, `createMockCubeTexture()`):**
  - File: [`src/testing/mocks/mock_texture.ts`](../testing/mocks/mock_texture.ts)
  - Returns: [`ITexture`](../webgl/textures/texture_types.ts), [`ICubeTexture`](../webgl/textures/cube_texture_types.ts)
  - Required because image assets rely on DOM image decoders (`HTMLImageElement`, `ImageBitmap`) unavailable in headless Node.js.

### C. Zero Mock Interfaces Policy
- **No `IMock*` or `mock_*_types.ts`:** Never create dedicated mock interfaces or mock type files. Test fakes and mock factory functions must type their return values directly as the production domain interfaces (e.g. [`IWebGLContextManager`](../webgl/core/context_manager_types.ts), `WebGL2RenderingContext`, [`ITexture`](../webgl/textures/texture_types.ts), [`ICubeTexture`](../webgl/textures/cube_texture_types.ts)).
- **Contract Fidelity:** Returning production interfaces ensures tests assert against real API contracts, eliminates dual-interface maintenance drift, and provides seamless compatibility with production code.
- **Configurable Overrides:** Mock factory functions should accept optional `(label?: string, overrides?: Partial<T>)` to allow test-specific property customizations without bespoke type declarations.

### D. Spy & Lifecycle Verification
- Spy on callbacks and lifecycle methods using `vi.fn()`:
  - Example: `const listener = vi.fn(); geometry.onDispose(listener);`
  - Assert call counts, arguments, and execution order: `expect(listener).toHaveBeenCalledTimes(1);`
- For observing method execution on real class instances, use `vi.spyOn(instance, "methodName")`. Restore spies when necessary with `spy.mockRestore()`.

---

## 6. Parcel Import Rules in Unit Tests

- **GLSL Shaders:**
  - Direct imports of `.vert`, `.frag`, and `.glsl` files are supported out-of-the-box by the Vitest configuration, resolving to the raw shader string (matching `@parcel/transformer-glsl`).
- **Static Assets & Images:**
  - Image imports (`.png`, `.jpg`, `.svg`) resolve to mock asset URL strings in Vitest.
- **Prefix Imports:**
  - Prefixes like `bundle-text:` and `url:` are automatically normalized by the Vitest compatibility plugin.
- **Bundler Glob Imports (DO NOT UNIT TEST):**
  - Files relying on Parcel's proprietary `@parcel/resolver-glob` (such as `src/pages/articles/index_instance.ts`) must **not** be unit tested directly. These are bundler manifest bridges tested via `npm run build`. Test the pure helper functions consuming that data with plain mock objects instead.

---

## 7. Execution Commands & Workflows

For detailed token-efficient agent testing, smoke checks, and failure isolation strategies, refer to [running_tests_guidelines.md](running_tests_guidelines.md).

- **Type Check (TypeScript Validation):**
  - `npm run typecheck` (executes `tsc --noEmit` across all project source and test files).
- **Fast Agent Smoke Test:**
  - `npm run test:smoke` (compact dot reporter, bails on first failure to protect context tokens).
- **Full Suite Run (All Tests & Type Check):**
  - `npm test` (executes `tsc --noEmit` followed by `vitest run` across all test files and exits).
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
