# Making React Unit Tests Guidelines

Testing principles, environment configuration, query standards, and authoring conventions for React components and custom hooks.

---

## 1. Core Principles & Environment Architecture

- **Simulated DOM Execution (`*.test.tsx`):**
  - All React component and custom hook tests must use the `.test.tsx` extension.
  - Per the repository Vitest configuration, `.test.tsx` files execute in a simulated browser environment using `happy-dom`.
- **User-Centric Testing Philosophy (React Official Guidance):**
  - As emphasized in [react.dev](https://react.dev), *"The more your tests resemble the way your software is used, the more confidence they can give you."*
  - Test observable DOM outputs, accessible user interactions, and emitted callback contracts.
  - Never assert against private component state (`useState` variables), internal instance fields, or private hook closures.
- **Pure Isolation & Zero Real GPU Canvases:**
  - Component tests must remain fast, deterministic, and pure CPU operations.
  - Never attempt to instantiate live WebGL contexts or compile GPU shaders in component tests. Stub or mock canvas boundaries using lightweight placeholders or spied scene passes.

---

## 2. React 19 & `act()` Management

- **Automatic `act()` Lifecycle:**
  - Standard helpers from `@testing-library/react` (`render`, `renderHook`) and `@testing-library/user-event` automatically wrap invocations in React's `act()` queue.
  - Avoid redundant manual `act()` blocks around standard user interactions or rendering.
- **Importing `act` from `'react'`:**
  - When manual scheduling or timer flushing is necessary, import `act` directly from `'react'`:
    ```ts
    import { act } from "react";
    ```
  - **Deprecated:** Never import `act` from `react-dom/test-utils` or use deprecated `react-test-renderer`.
- **Async `act` Standard:**
  - When wrapping async operations, always use `await act(async () => { ... })`. Synchronous `act()` is planned for deprecation in React.

---

## 3. Query Priority Hierarchy

Always query the DOM using accessible roles and visible text rather than implementation details. Adhere strictly to the React Testing Library query priority order:

1. **Queries Accessible to Everyone (Primary):**
   - `getByRole`: The gold standard query (e.g. `screen.getByRole("button", { name: /save/i })`, `screen.getByRole("dialog")`).
   - `getByLabelText`: For form controls with associated labels.
   - `getByPlaceholderText`: For input fields when labels are absent.
   - `getByText`: For non-interactive layout text, headings, or paragraph copy.
2. **Semantic Queries (Secondary):**
   - `getByAltText`: For images and graphic representations (`<img alt="..." />`).
   - `getByTitle`: For elements with title attributes or SVG icon tooltips.
3. **Test IDs (Last Resort):**
   - `getByTestId`: Use only when text or accessibility roles are dynamic, non-standard, or cannot be queried reliably.
   - Never query elements by arbitrary CSS class names or DOM tag traversal (`container.querySelector(".btn")`).

---

## 4. User Interactions: `userEvent` vs. `fireEvent`

- **Prefer `userEvent.setup()`:**
  - Always dispatch interactions using `@testing-library/user-event` rather than `fireEvent`.
  - `userEvent` replicates genuine browser event sequences (e.g., hover, pointerdown, focus, click, keydown):
  ```tsx
  import userEvent from "@testing-library/user-event";

  it("handles button click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick} label="Submit" />);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  ```
- **When to Use `fireEvent`:**
  - Reserve `fireEvent` strictly for low-level DOM events not modeled by `userEvent` (such as native scroll events or raw DOM resize events).

---

## 5. Asynchronous Assertions & Timers

- **Asynchronous Element Appearance:**
  - When waiting for elements that render asynchronously or after animations, use `findBy*` queries:
  ```tsx
  const modal = await screen.findByRole("dialog");
  expect(modal).toBeInTheDocument();
  ```
- **`waitFor` for State Convergence:**
  - Use `waitFor(() => expect(...))` when asserting side-effect completions. Keep `waitFor` callbacks pure and free of user interactions.
- **Fake Timers:**
  - If a component or hook relies on `setTimeout` or `requestAnimationFrame`, use Vitest fake timers:
  ```tsx
  vi.useFakeTimers();
  // ... run test code
  act(() => {
    vi.advanceTimersByTime(500);
  });
  vi.useRealTimers();
  ```

---

## 6. Custom Hook Testing with `renderHook`

Custom hooks must be tested in isolation using `renderHook` from `@testing-library/react`:

```tsx
import { renderHook, act } from "@testing-library/react";

describe("useCustomCounter()", () => {
  it("initializes and increments value", () => {
    const { result } = renderHook(() => useCustomCounter(0));
    expect(result.current.count).toBe(0);

    act(() => {
      result.current.increment();
    });
    expect(result.current.count).toBe(1);
  });

  it("cleans up resources upon unmount", () => {
    const cleanupSpy = vi.fn();
    const { unmount } = renderHook(() => useCustomObserver(cleanupSpy));

    unmount();
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Verification Checklist
- **Return Value Verification:** Assert initial return structures and primitive outputs.
- **Rerender Contracts:** Use `rerender({ nextProp })` to confirm memoization and prop synchronization.
- **Referential Stability:** Verify callback references returned by hooks remain referentially equal (`toBe`) across re-renders unless dependencies change.
- **Unmount Cleanup:** Explicitly invoke `unmount()` to confirm listeners, intervals, and observers are detached.
