# Dialog Component Design

Design specification for the reusable `Dialog` modal component and its associated `useDialog` lifecycle hook.

---

## 1. Overview
- **Purpose:** A lightweight, accessible React wrapper around the HTML5 `<dialog>` element that synchronizes modal display states, manages focus trapping, and simplifies backdrop click dismissal.
- **Component File:** [dialog.tsx](./dialog.tsx)
- **Style File:** [dialog.scss](./dialog.scss)
- **Hook File:** [use_dialog.ts](./use_dialog.ts)
- **Primary Consumers:** [../../galaxy_backdrop/galaxy_settings_dialog.tsx](../../galaxy_backdrop/galaxy_settings_dialog.tsx)

---

## 2. Design Goals & Scope
- **Native Browser Primitives:** Relies on native `<dialog>` and `showModal()` to provide built-in accessibility, browser-level top-layer placement, and native backdrop styling (`::backdrop`).
- **Declarative React Interface:** Controls modal visibility via a single boolean `isOpen` prop, translating imperative `showModal()` and `close()` calls under the hood.
- **Content Event Isolation:** Wraps slottable `children` inside `.dialog-content` with a click propagation stopper (`e.stopPropagation()`). This allows parent dialog backdrop dismissals without unintended triggers when clicking dialog contents.
- **Robust Lifecycle Safety:** Guards all imperative modal transitions with `dialog.open` checks to prevent `InvalidStateError` and handles clean removal on unmount.

---

## 3. Structure & DOM Layout

- **Root Dialog (`<dialog>`):**
  - Native dialog element receiving forwarded attributes (`className`, `id`, `onClick`, `onClose`, etc.).
  - Default styles reset padding to zero ([dialog.scss](./dialog.scss)), leaving layout configuration to consumer class overrides.
- **Content Body (`.dialog-content`):**
  - Inner container wrapping slottable `children`.
  - Attaches `onClick={(e) => e.stopPropagation()}` to stop click event bubbling to `<dialog>`.

---

## 4. Component Interface & Types

```typescript
export interface DialogProps extends React.ComponentPropsWithoutRef<"dialog"> {
    isOpen: boolean;
    onClose: () => void;
    children?: React.ReactNode;
}
```

- **Props Specification:**
  - `isOpen`: Boolean controlling whether `showModal()` or `close()` is active.
  - `onClose`: Callback invoked when dialog closes (e.g. via Escape key or backdrop click handlers).
  - `children`: Arbitrary slottable React content rendered inside `.dialog-content`.
  - `...rest`: Standard HTML attributes forwarded to the native `<dialog>` element.

---

## 5. Hook Specification (`useDialog`)

The [`useDialog`](./use_dialog.ts) hook encapsulates imperative dialog lifecycle logic:

```typescript
export function useDialog(isOpen: boolean): readonly [React.RefObject<HTMLDialogElement | null>]
```

- **Procedure:**
  - Initializes a `useRef<HTMLDialogElement>(null)`.
  - On render / `isOpen` dependency change:
    - If `isOpen === true` and `!dialog.open`: calls `dialog.showModal()`.
    - If `isOpen === false` and `dialog.open`: calls `dialog.close()`.
  - Cleanup handler: closes `dialog` if still open when the component unmounts.
  - Returns `[dialogRef]` tuple for attachment to `<dialog ref={dialogRef}>`.

---

## 6. Backdrop Dismissal Pattern

Consumers implementing backdrop dismissal (such as [../../galaxy_backdrop/galaxy_settings_dialog.tsx](../../galaxy_backdrop/galaxy_settings_dialog.tsx)) attach `onClick={onClose}` to `<Dialog>`:

- Clicking the backdrop triggers the `<dialog>` click handler.
- Clicking inside the modal hits `.dialog-content`, where `e.stopPropagation()` halts the event before reaching the dialog element.
