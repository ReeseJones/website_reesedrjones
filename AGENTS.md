# AGENTS.md

## Context
- **Project:** Reese Jones's personal website ([reesedrjones.com](https://reesedrjones.com/))
- **Environment:** Browser-only Single Page Application (SPA). No Node.js runtime APIs.
- **Hosting:** Cloudflare via GitHub push (configured in [wrangler.jsonc](wrangler.jsonc)).
- **Branches:** `main` (production, auto-deploys), `staging` (pre-release testing). Check branch before editing/committing.
- **Stack:** React 19, React Router 7, PixiJS 8, TypeScript, SCSS, Parcel 2

## Commands
- `npm run start` — Local dev server with live reload / HMR (cleans `dist`) (Not for agents)
- `npm run clean` — Deletes `.parcel-cache` and `dist` build cache -- useful when parcel gets corrupted.
- `npm run build` — Production build to `./dist`
- `npm run preview` — Build and run local Cloudflare preview (`wrangler dev`) (Not for agents)
- `npm run deploy` — Build and deploy directly to Cloudflare (`wrangler deploy`) (Not for agents)
- `npm test` — Run all unit tests with Vitest
- `npm run test:watch` — Incremental targeted test runner in watch mode
- `npm run test:coverage` — Run unit tests with V8 code coverage report

## Interaction Protocol: Inquiries vs. Implementation
- **Never edit code on inquiries:** Treat any message containing a question mark (`?`) or phrasing like *"Can we..."*, *"Could we..."*, *"Should we..."*, *"What if..."*, or inquiring about possibilities, optimizations, or refactoring strictly as an **inquiry**, NOT authorization to edit files.
- **Forbidden tools during inquiries:** Do NOT invoke file edit tools (`replace_file_content`, `write_to_file`) in response to an inquiry.
- **Required response protocol:**
  - 1. Directly answer the question or analyze the inquiry first.
  - 2. Outline the specific implementation plan, trade-offs, and affected files.
  - 3. Stop and explicitly ask for user confirmation to proceed.
- **Authorization requirement:** Only modify codebase files after the user explicitly replies with approval (e.g., *"Yes, proceed"*, *"Go ahead"*, *"Do it"*, or gives an explicit imperative command with no question mark).

## Mandatory Project Guidelines: Read Before Acting
- **Pre-action requirement:** Always inspect and read the relevant guidelines in [src/project_guidelines/](src/project_guidelines/) before planning, designing, writing, or editing code. Never assume conventions or invent ad-hoc patterns when an established project guideline exists.
- **Guideline reference index:**
  - Git & branch management: [git_guidelines.md](src/project_guidelines/git_guidelines.md) (Always work on `staging`)
  - WebGL & shaders: [webgl_guidelines.md](src/project_guidelines/webgl_guidelines.md)
  - CSS & SCSS styling: [css_guidelines.md](src/project_guidelines/css_guidelines.md)
  - HTML & layout: [html_layout_guidelines.md](src/project_guidelines/html_layout_guidelines.md)
  - TypeScript & typing standards: [typescript_guidelines.md](src/project_guidelines/typescript_guidelines.md)
  - Parcel imports & asset indexing: [using_parcel_guideline.md](src/project_guidelines/using_parcel_guideline.md)
  - Unit testing standards & mocking: [unit_testing_guidelines.md](src/project_guidelines/unit_testing_guidelines.md)

## Rules
- **Unit Testing Benchmark:** Agents must create, use, and run unit tests as the benchmark for compiling code and asserting behavior and returns. Adhere to [unit_testing_guidelines.md](src/project_guidelines/unit_testing_guidelines.md): map each explicit public interface method/property to a `describe` block, test input code paths and edge conditions in `it` specs, assert return values and chaining contracts, verify domain requirements (math invariants, matrix ordering, dirty-flag cascading, deterministic resource disposal), and mock dependencies with test fixtures rather than instantiating real WebGL contexts.
- **Verify builds:** The main agent does not need to run `npm run build` after every step. This work will typically be delegated to subagents and instructed to do so as part of making their design.
- **Client-only:** Never import Node built-in modules (`fs`, `path`, `process`) in app code.
- **Asset imports:** Use relative ESM imports for images/assets (e.g., `import heroImg from "./hero.jpg"`).
- **Formatting:** Do not use markdown tables; prefer bulleted lists.
- **Design Docs:** Should use minimal code, but should feature the API, Types, Interfaces and design goals, as well as steps algorithms and procedures.
- **Markdown Links:** All markdown links within repository files (docs, design documents, AGENTS.md, etc.) must be repository-relative or file-relative (e.g., `[wrangler.jsonc](wrangler.jsonc)`), never local filesystem absolute paths (`file:///...`). This ensures links resolve properly on GitHub.
- **Separate Types from Implementations:** Separate type interfaces and type declarations into dedicated type files (e.g., `types.ts`, `*_types.ts`) away from class, function, and variable definitions. Consumers must import directly from specific target modules without creating `index.ts` barrel aggregators. Separating interface from definition prevents circular dependencies, avoids pulling in heavy implementation modules just to import a type, and maximizes code reusability.
- **Develop on Staging:** Always perform active development and feature edits on the `staging` branch. Never edit or commit directly on `main`. Only merge `staging` into `main` when ready for production release.
- **Never Commit Unless Explicitly Asked:** Agents must NEVER run `git commit` (or push) unless explicitly instructed to do so by the user (e.g., "commit these changes", "make a commit"). Completing an edit or implementation task does NOT imply authorization to commit.
- **No Backwards Compatibility Aliases:** Never retain deprecated methods, properties, transitional types, or alias wrappers (such as `dispose()` delegating to `destroy()` or vice versa) for backwards compatibility. This codebase is a personal application, not a public library or third-party SDK. When a method, function, property, or interface is renamed, replaced, or redesigned, replace it cleanly across the entire codebase and remove all obsolete aliases immediately.
- **File & Inspection Tools:** Always use native inspection tools (`view_file`) and file edit tools (`replace_file_content`, `write_to_file`) instead of running terminal shell commands (`cat`, `type`, `dir`, `Get-Content`, `echo`) to read or write files.

## Design Document Implementation Protocol

When instructed to implement a feature or design document, the main agent must act as an orchestrator and quality gatekeeper across the following phased workflow:

### Phase 1: Implementation Delegation (Subagent 1)
- The main agent spawns an implementation subagent with clear instructions:
  - Read the design document and relevant project guidelines in `src/project_guidelines/`.
  - Author the implementation adhering strictly to type separation (`*_types.ts`), client-only restrictions, and explicit WebGL constants (`WebGL2RenderingContext.<CONSTANT>`).
  - Focus purely on feature code; do not write unit tests during this phase.

### Phase 2: Architecture Review & Audit (Main Agent)
- The main agent inspects the code written by Subagent 1:
  - Verify public methods and properties conform to the design document's explicit interface.
  - Ensure zero magic numbers.
  - Verify clean separation of types from implementations and no direct Node runtime imports.

### Phase 3: Independent Unit Test Delegation (Subagent 2)
- The main agent spawns a second, independent test authoring subagent:
  - Instruct the subagent to read `src/project_guidelines/unit_testing_guidelines.md`.
  - Map every explicit public interface method/property into `describe` blocks.
  - Enumerate code path inputs and edge cases into `it` specs.
  - Explicitly assert expected behavior and returns (return values, chaining contracts, status codes).
  - Use mock fixtures (`createMockWebGL2Context()`, `createMockContextManager()`); never instantiate real WebGL.
  - Verify tests run and pass using `npx vitest run <path>`.

### Phase 4: Test Verification & Quality Gate (Main Agent)
- The main agent reviews the test suite:
  - Verify that tests assert return values and contracts rather than just testing internal side-effects.
  - Run the full suite: `npm test`.
  - Verify the production build: `npm run build`.
  - Report the results back to the user with a concise summary.