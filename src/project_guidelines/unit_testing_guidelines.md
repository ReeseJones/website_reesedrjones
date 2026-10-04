# Unit Testing Guidelines

This document specifies the testing principles, authoring conventions, custom matcher architecture, mock subsystems, and execution workflows across the codebase.

---

## 1. Core Principles & Engineering Standards

- **Mandatory Verification Benchmark:** Unit tests serve as the benchmark for confirming that newly written or refactored code compiles, runs without runtime exceptions, asserts expected behavior and returns, and satisfies its intended contract.
- **Target Classes and Functions:** Unit tests target **classes and functions**. Plain constants, enums, and raw data structures (such as `STANDARD_VERTEX_LAYOUT` or constants in `*_types.ts`) are not tested with standalone unit test files; their correctness is asserted implicitly through the classes and generator functions that consume them.
- **Pure CPU & Headless Execution:** Unit tests must remain fast, deterministic, and runnable in headless CLI/CI environments. Never initialize real browser WebGL2 canvases or context instances in unit tests. Use pure mathematical calculations, interface stubs, and mock fixtures.
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

## 5. Mocking Architecture

### A. Zero Mock Interfaces Policy
- **No `IMock*` or `mock_*_types.ts`:** Never create dedicated mock interfaces or mock type files. Test fakes and mock factory functions must type their return values directly as the production domain interfaces (e.g. [`IWebGLContextManager`](../webgl/core/context_manager_types.ts), `WebGL2RenderingContext`, [`ITexture`](../webgl/textures/texture_types.ts), [`ICubeTexture`](../webgl/textures/cube_texture_types.ts)).
- **Contract Fidelity:** Returning production interfaces ensures tests assert against real API contracts, eliminates dual-interface maintenance drift, and provides seamless compatibility with production code.
- **Configurable Overrides:** Mock factory functions should accept optional `(label?: string, overrides?: Partial<T>)` to allow test-specific property customizations without bespoke type declarations.

### B. Centralized Mock Generators (`src/testing/mocks/`)
Group all shared mock generators in `src/testing/mocks/` rather than duplicating stubs inline across test files:
- **Hardware WebGL Context (`createMockWebGL2Context()`):**
  - File: [`src/testing/mocks/mock_gl_context.ts`](../testing/mocks/mock_gl_context.ts)
  - Returns: `WebGL2RenderingContext`
  - Used by low-level subsystems ([`GeometryManager`](../webgl/geometry/geometry_manager.ts), [`TextureManager`](../webgl/textures/texture_manager.ts), [`VertexBuffer`](../webgl/geometry/vertex_buffer.ts)).
  - Implements the WebGL2 state machine calls (`createBuffer`, `bindVertexArray`, `bufferData`, `deleteBuffer`) as `vi.fn()` spies. Never instantiate real WebGL contexts.
- **Context Manager Stubbing (`createMockContextManager()`):**
  - File: [`src/testing/mocks/mock_context_manager.ts`](../testing/mocks/mock_context_manager.ts)
  - Returns: [`IWebGLContextManager`](../webgl/core/context_manager_types.ts)
  - Used by high-level scene components ([`ModelInstance`](../scene/models/model_instance.ts), [`Material`](../scene/materials/material.ts), [`SceneRenderer`](../scene/renderer/scene_renderer.ts)).
  - Provides pre-configured `vi.fn()` spies for pipeline states, geometry binding, and shader acquisition.
- **Texture & Cubemap Mocking (`createMockTexture()`, `createMockCubeTexture()`):**
  - File: [`src/testing/mocks/mock_texture.ts`](../testing/mocks/mock_texture.ts)
  - Returns: [`ITexture`](../webgl/textures/texture_types.ts), [`ICubeTexture`](../webgl/textures/cube_texture_types.ts)
  - Used by material tests, skybox tests, and rendering pipeline tests. Provides pure CPU mocks with spy-wrapped lifecycle hooks (`dispose`, `onDispose`, `bind`).

### C. Spy & Lifecycle Verification
- Spy on callbacks and lifecycle methods using `vi.fn()`:
  - Example: `const listener = vi.fn(); geometry.onDispose(listener);`
  - Assert call counts, arguments, and execution order: `expect(listener).toHaveBeenCalledTimes(1);`
- For mocking return values or async behavior on standard interface methods, use Vitest's `vi.mocked()` or configure spy behaviors on creation.

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
