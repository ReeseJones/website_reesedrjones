# React Component Authoring Guidelines

Design principles, architecture standards, and authoring conventions for React components in this codebase.

---

## 1. Core Architecture & Component Structure

- **Function Components Only:** All components must be written as standard TypeScript function components. Class components are prohibited.
- **Single Responsibility:** A component should handle one focused UI responsibility. Extract business logic, complex state transitions, and external event listeners into dedicated custom hooks in `src/hooks/` or collocated hook files.
- **Client-Only Single Page App:** Components run strictly in modern browser environments. Never import Node.js runtime built-ins (`fs`, `path`, `process`).
- **No Barrel Aggregators:** Always import components and types directly from their specific source files without intermediate `index.ts` re-export barrels.

---

## 2. Type Separation Standard

- **Dedicated Types Modules:** All component prop interfaces, emitted event payload signatures, and exported UI state enums must reside in a companion types file (e.g., `button_types.ts`, `galaxy_settings_dialog_types.ts`).
- **Clean Interface Imports:**
  ```tsx
  // button.tsx
  import type { ButtonProps } from "./button_types";

  export const Button = ({ label, onClick, disabled }: ButtonProps) => {
    // ...
  };
  ```
- **Rationale:** Separating type definitions from implementation modules prevents circular dependency chains, allows lightweight type reuse without bundling component code, and simplifies mocking in tests.

---

## 3. Modern React 19 Conventions

- **Direct `ref` Props (No `forwardRef`):**
  - In React 19, `ref` is a standard prop passed directly to function components.
  - Never wrap components in `React.forwardRef()`. Simply accept `ref?: React.Ref<HTMLElement>` (or specific element type) in the props interface.
- **Callback Ref Cleanup Functions:**
  - When acquiring resources or attaching observers via callback refs, use React 19's returned cleanup function pattern:
  ```tsx
  const callbackRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(/* ... */);
    observer.observe(node);

    // React 19 automatically invokes this cleanup upon element detach or unmount
    return () => {
      observer.disconnect();
    };
  }, []);
  ```

---

## 4. Render Hygiene & Hook Best Practices

- **Pure Render Functions:**
  - Component bodies must remain pure and free of side effects.
  - Never mutate external state, trigger HTTP calls, or manipulate the DOM directly during render.
- **Minimizing Effects (`useEffect`):**
  - Use `useEffect` only for synchronizing with external systems (e.g., browser APIs, WebGL canvas loops, subscriptions).
  - Never use `useEffect` to calculate derived state or transform data that can be computed during render.
- **Referential Stability:**
  - When passing event callbacks to child components or custom hooks that manage observers, ensure function identity is stable using `useCallback` with complete dependency arrays.
  - If a callback is passed to an observer hook where consumers might omit `useCallback`, the hook should store the callback in `useRef` to prevent observer recreation thrashing.

---

## 5. Styling & Layout Integration

- **Collocated SCSS:**
  - Component-specific styles are collocated alongside the component file (e.g., `header.scss` next to `header.tsx`) and imported at the top of the component.
- **Dynamic Class Mapping:**
  - Use the repository's [`classNameMap`](../lib/classNameMap.ts) helper for conditional class application instead of messy template strings:
  ```tsx
  const classes = classNameMap({
    "btn-primary": true,
    "is-active": isActive,
    "is-disabled": disabled,
  });
  ```
- **Semantic HTML:**
  - Structure elements according to [`html_layout_guidelines.md`](html_layout_guidelines.md) and [`css_guidelines.md`](css_guidelines.md) using semantic elements (`<header>`, `<nav>`, `<main>`, `<dialog>`).

---

## 6. WebGL & Canvas Subsystem Boundary

- **Declarative vs. Imperative Boundary:**
  - React components define UI structure, layouts, dialogs, and controls.
  - WebGL rendering is hosted inside [`WebGLCanvas`](../components/webgl_canvas/webgl_canvas.tsx) passes.
  - Keep canvas passes isolated from frequent React re-renders by routing real-time frame logic through scene passes and controllers rather than React state.
