# Making Lit Unit Tests Guidelines

Testing principles, environment configuration, asynchronous lifecycle patterns, and query standards for Lit web components and custom elements.

---

## 1. Core Principles & Environment Architecture

- **Simulated DOM Execution (`*.test.ts` or `*.test.tsx`):**
  - Unit tests for Lit custom elements execute in a simulated browser environment (`happy-dom`) where `customElements`, `document`, and `window` are available.
  - Collocate tests with their implementation files using the `.test.ts` extension (or `.test.tsx` if the test file renders React wrappers alongside Lit elements).
- **Public API & Contract Testing:**
  - Test the element as a consumer would: set reactive properties, dispatch events, verify rendered Shadow DOM output, and observe accessibility attributes.
  - Rely on public properties and standard Web Component APIs rather than reaching into private internals.
- **Pure CPU & Headless Execution:**
  - Keep tests fast and deterministic. When testing Lit elements that interact with WebGL canvases, cameras, or native browser subsystems, mock or spy on hardware boundaries (such as `createMockContextManager()` or method spies).

---

## 2. Asynchronous Updates & `await element.updateComplete`

- **The Microtask Update Cycle:**
  - Lit batches property mutations into microtasks so that multiple property updates trigger only a single render pass.
  - Consequently, DOM rendering in Lit is **asynchronous**. Changing a reactive property does not immediately mutate the DOM on the same tick.
- **Awaiting `updateComplete`:**
  - Whenever mutating a reactive property in a test, always `await element.updateComplete` before asserting on rendered DOM text, attributes, parts, or styles:
    ```ts
    const element = document.createElement("rj-fps-counter") as FpsCounterElement;
    document.body.appendChild(element);
    await element.updateComplete;

    element.value = "60 FPS (16.7 ms)";
    await element.updateComplete;

    const valueSpan = element.shadowRoot?.querySelector("[part='value']");
    expect(valueSpan?.textContent).toBe("60 FPS (16.7 ms)");
    ```
- **Sequential Mutations:**
  - If multiple property mutations or lifecycle transitions are tested sequentially, await `element.updateComplete` after each step to allow Lit to complete each render batch.

---

## 3. Querying Shadow DOM & Template Output

- **Accessing the Shadow Root:**
  - For components that use Shadow DOM (the default in Lit), inspect template output via `element.shadowRoot`:
    ```ts
    const badge = element.shadowRoot?.querySelector<HTMLElement>(".badge");
    expect(badge).not.toBeNull();
    ```
- **Prefer CSS Shadow Parts (`part="..."`) and Semantic Roles:**
  - Where parts are defined, prefer querying by part selectors (`[part="value"]`, `[part="badge"]`) or role attributes over brittle internal markup structures.
- **Light DOM Content & Slotted Projections:**
  - If the element projects content via `<slot></slot>`, append child nodes to the host element and assert that `<slot>` exists in the shadow root.
  - For structural elements that override `createRenderRoot()` to return `this` (Light DOM rendering), query `element.querySelector(...)` directly.

---

## 4. Testing Properties, Attributes, and Reflection

- **Reactive Properties:**
  - Assert that default values are initialized correctly in the constructor.
  - Assert that setting properties triggers expected re-renders in `element.shadowRoot`.
- **Attribute Reflection (`reflect: true`):**
  - For properties configured to reflect (e.g. `position`), verify that changing the property updates the host element's attribute:
    ```ts
    element.position = "top-right";
    await element.updateComplete;
    expect(element.getAttribute("position")).toBe("top-right");
    ```
- **Observed Attributes & Converters:**
  - If properties define custom converters or parse attributes (e.g. `frame-time-ms`), verify that `element.setAttribute("frame-time-ms", "16.7")` parses into the correct property type.

---

## 5. Lifecycle & Native Subsystems

- **Connection & Disconnection:**
  - Test mounting via `document.body.appendChild(element)` and unmounting via `element.remove()`.
  - Verify that event listeners, timer intervals, or context subscriptions registered in `connectedCallback()` are cleanly detached in `disconnectedCallback()`.
  - Verify idempotency: re-attaching a detached element must resume cleanly without duplicate listeners or resource leaks.
- **Browser API Isolation:**
  - When testing components interacting with optional or newer browser APIs (such as the Popover API `showPopover()` / `hidePopover()`, or `ResizeObserver`), spy on or stub the method on `HTMLElement.prototype` or the instance.
  - Always clean up prototype spies in `afterEach()` to avoid cross-test contamination.
  - Verify graceful fallbacks when optional APIs are undefined or throw errors.

---

## 6. Encouraged Practices

- **Test Direct Property Assignment:** Test how consumers actually use the element (`element.value = "..."`). Avoid inventing ad-hoc helper methods just to make synchronous assertions.
- **Async Test Functions:** Always declare test specs as `async () => { ... }` whenever interacting with Lit elements so that `await element.updateComplete` can be called naturally.
- **DOM Cleanup:** Always clean up `document.body.innerHTML = ""` or remove created elements in `afterEach()` blocks to keep tests isolated and deterministic.
