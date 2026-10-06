# Running Tests Guidelines

This document details test execution workflows, token-efficiency standards for AI agents, and debugging strategies across different development scenarios. For instructions on authoring test suites, mock subsystems, and custom matchers, see [unit_testing_guidelines.md](unit_testing_guidelines.md).

---

## 1. Principles & Token Efficiency

- **Human vs. Agent Optimization:** Human developers benefit from verbose output with per-file execution timings. Autonomous agents benefit from compact token-efficient summaries to protect context window limits and avoid wasting budget on passing specs.
- **Cascade Prevention:** When a breaking architectural change occurs, running an unconstrained test suite can dump dozens of stack traces, consuming thousands of tokens. Agents must use bail-on-first-failure flags during regression checks.
- **Targeted Root Cause Isolation:** When diagnosing a specific failure, agents must target the specific file or spec rather than running the full repository suite repeatedly.

---

## 2. Command Scenarios Matrix

### General Smoke Check ("Are Things Still Good?")
- **Purpose:** Fast repository-wide sanity check during active agent development or refactoring.
- **Command:** `npm run test:smoke`
- **Internal Pipeline:** `tsc --noEmit && vitest run --reporter=dot --bail 1`
- **Output Characteristics:**
  - On pass: ~10 lines (~80 tokens) using compact dot indicators (`.`).
  - On failure: Bails immediately on the first failed assertion, preventing cascading failure dumps.

### Targeted Debugging ("Find the Root Cause")
- **Purpose:** Deep-dive investigation when debugging a known failing class or module.
- **Command:** `npx vitest run <path/to/test.ts>`
- **Example:** `npx vitest run src/scene/core/transform.test.ts`
- **Output Characteristics:**
  - Uses default reporter to show full describe/it tree hierarchy.
  - Displays exact assertion diffs, expected vs. received values, and complete stack trace for the target module only.

### Single Spec Isolation
- **Purpose:** Isolating a single failing test case within a file to eliminate noise from sibling tests.
- **Command:** `npx vitest run <path/to/test.ts> -t "<test-name-pattern>"`
- **Example:** `npx vitest run src/scene/core/transform.test.ts -t "dirty flag"`
- **Output Characteristics:** Only executes the matching spec; near-zero terminal output.

### Dirty / Work-in-Progress Check
- **Purpose:** Testing only files modified or staged in Git on the active branch.
- **Command:** `npx vitest run --changed`
- **Output Characteristics:** Skips untouched modules, focusing feedback on recent edits.

### Full Repository Verification (Human & Release Gate)
- **Purpose:** Full build and test verification before staging merges or releases.
- **Commands:**
  - `npm test`: Runs `tsc --noEmit` followed by full-verbosity `vitest run` across all test files.
  - `npm run test:watch`: Interactive watch mode for local human development (re-runs on save).
  - `npm run test:coverage`: Generates full V8 code coverage reports.
  - `npm run typecheck`: Pure TypeScript type verification (`tsc --noEmit`).

---

## 3. Agent Troubleshooting Decision Tree

When encountering test failures, agents must follow this structured diagnosis path:

1. **Check Type Errors First:**
   - If `npm run test:smoke` fails at the TypeScript stage, run `npm run typecheck` to isolate compiler diagnostics before investigating test logic.
2. **Run Targeted File:**
   - Switch from `npm run test:smoke` to `npx vitest run <failing-file>` to inspect the full failure diff and stack trace.
3. **Isolate Specific Spec:**
   - If multiple specs in the file fail, isolate the first failing spec using `-t "<spec-name>"` to pinpoint the initial broken assumption.
4. **Pure-CPU Inspection:**
   - Inspect matrix math, dirty propagation, or spy call logs. Never insert long-lived `console.log` statements in production code.
5. **Re-verify Smoke:**
   - Once the targeted test passes (`npx vitest run <file>`), run `npm run test:smoke` to ensure no side-effect regressions occurred across other modules.
