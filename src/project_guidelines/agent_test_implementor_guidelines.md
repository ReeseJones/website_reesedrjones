# Agent Test Implementor Guidelines

This document serves as the operational manual for any subagent tasked with authoring, maintaining, or expanding unit tests in this repository.

---

## 1. Mission & Scope Boundary

- **Single Item Focus:** Author a comprehensive, pure-CPU Vitest unit test suite for exactly **one target class or module** assigned by the orchestrator.
- **Classes and Functions Only:** Unit tests exclusively target concrete **classes and functions**. Never author standalone test files for raw constants, enums, or interface definitions.
- **Test File Naming:** Name test files with `.test.ts` (for pure TypeScript and Lit elements) or `.test.tsx` (for React components and hooks).
- **Zero Inline Fake Factories:** Never invent synthetic mock objects (such as `createMockCamera()`, `createMockMaterial()`, `createMockGeometry()`) inside test suites. Always instantiate real domain classes (`PerspectiveCamera`, `UnlitMaterial`, `QuadGeometry`, `ModelInstance`, `Scene`) and observe them with Vitest spies (`vi.spyOn`).
- **Never Commit or Push:** Subagents must **never** run `git commit`, `git push`, or update tracking manifests unless explicitly instructed. Verification and reporting complete your turn.

---

## 2. Pre-Authoring Checklist

Before writing any test code:
1. **Inspect Interface & Implementation:**
   - Read the target's explicit interface file (`*_types.ts`) and implementation file.
2. **Review General Guidelines:**
   - Read [`src/project_guidelines/unit_testing_guidelines.md`](unit_testing_guidelines.md) for custom matchers, math tolerances, and return value assertion rules.
   - Read [`src/project_guidelines/making_react_unit_tests_guidelines.md`](making_react_unit_tests_guidelines.md) when authoring React component or custom hook tests.
   - Read [`src/project_guidelines/making_lit_unit_tests_guidelines.md`](making_lit_unit_tests_guidelines.md) when authoring Lit web component tests.
   - Read [`src/project_guidelines/running_tests_guidelines.md`](running_tests_guidelines.md) for execution workflows and token-efficient testing standards.
3. **Identify Pure-CPU vs. Hardware Dependencies:**
   - For scene nodes, cameras, materials, geometries, and transforms: instantiate the **real classes**.
   - For hardware boundaries (`WebGL2RenderingContext`, `IWebGLContextManager`, `ITexture`, `ICubeTexture`): import pre-built mock factories from `src/testing/mocks/`:
     - `createMockWebGL2Context` from [`src/testing/mocks/mock_gl_context.ts`](../testing/mocks/mock_gl_context.ts)
     - `createMockContextManager`, `createMockShaderProgram` from [`src/testing/mocks/mock_context_manager.ts`](../testing/mocks/mock_context_manager.ts)
     - `createMockTexture`, `createMockCubeTexture` from [`src/testing/mocks/mock_texture.ts`](../testing/mocks/mock_texture.ts)

---

## 3. Test Suite Authoring Protocol

### Root & Method Structure
- **Root Block:** `describe("TargetClassName")` or `describe("targetFunctionName")`
- **Method Blocks:** Create a nested `describe(".methodName()")` or `describe("propertyName")` for **every** explicit public method, getter, and setter on the interface.

### Spec Authoring Rules
- **Assert Return Values & Contracts:** Every `it("should ...")` spec must verify what the method **returns** (return value, boolean status, fluent chaining `return this`), not just internal side effects.
- **Boundary & Nominal Inputs:** Test happy path, zero/negative inputs, empty arrays, and null/undefined fallbacks.
- **Zero Magic Numbers:** Decode buffers with helpers (e.g. `getVertex()` from [`src/testing/geometry_test_helpers.ts`](../testing/geometry_test_helpers.ts)); never assert raw index offsets like `expect(attrs[0])`.
- **Pure CPU Execution:** Tests must run in Node.js without initializing real WebGL2 browser contexts.
- **Idempotency & Lifecycle:** Verify that disposal/destruction methods are idempotent and detach all registered listeners.
- **Lit Element Asynchronous Updates:** Lit property updates batch asynchronously on microtasks. When asserting on rendered DOM output or attribute reflection, always `await element.updateComplete` (see [making_lit_unit_tests_guidelines.md](making_lit_unit_tests_guidelines.md)).

---

## 4. Verification Quality Gate

Before reporting completion to the orchestrating agent, execute and verify:
1. **Targeted Unit Test:**
   ```bash
   npx vitest run <path-to-test-file>
   ```
   *Must pass 100% of authored specs.*
2. **React Hooks & Lint Check (for component & hook authors):**
   ```bash
   npx eslint <path-to-target-file>
   ```
   *Must pass with 0 errors (`rules-of-hooks`, `exhaustive-deps`).*
3. **TypeScript Typecheck:**
   ```bash
   npm run typecheck
   ```
   *Must complete with 0 errors across the entire project (`tsc --noEmit`).*
4. **Full Suite Regression Check:**
   ```bash
   npm test
   ```
   *Must execute linting (`eslint src`), type checking, and all unit tests cleanly. (Tip: during intermediate development iterations, run `npm run test:smoke` to check for regressions without burning context tokens).*

---

## 5. Subagent Completion Report Format

Upon passing all verification gates, reply to the orchestrator with:
- Target file and authored test file path.
- Spec count and outline of describe blocks.
- Explicit confirmation that `npx vitest run <path>`, `npm run typecheck`, and `npm test` passed with 0 errors.
- Stop without executing any git commands.
