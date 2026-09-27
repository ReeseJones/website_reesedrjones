# Panel Component Design

Design specification for the reusable binder-tab Panel component.

---

## 1. Overview
- **Purpose:** A structured container component providing a binder-folder aesthetic with a smoothly attached tabbed heading.
- **Component File:** [src/components/panel/panel.tsx](./panel.tsx)
- **Component Styles:** [src/components/panel/panel.scss](./panel.scss)
- **Site-Wide Overrides:** [src/styles.scss](../../styles.scss)
- **Design Document:** [src/components/panel/design.md](./design.md)

---

## 2. Structure & DOM Layout (2-Piece vs. 3-Piece)

The component adheres to standard DOM flow without absolute viewport breakout or layout detachment:

- **Root Panel Container (`.panel`):**
  - Top-level `<div>` wrapping the entire component.
  - Flex column layout (`display: flex; flex-direction: column;`).
  - Defaults to expanding to fill its parent container (`width: 100%`).
  - Styled with direct SCSS defaults matching the site theme.

- **Heading Tab Container (`.panel-heading` / `.heading`):**
  - Rendered conditionally: present only when the `heading` prop is provided.
  - Positioned at the top-left of the panel container (`align-self: flex-start;`).
  - Sits seamlessly on top of the content container with `margin-bottom: -$panel-border-width` and `z-index: 2` to overlap the top border.
  - Houses any slottable ReactNode (text, headings, badges, action buttons, or custom layout).

- **Content Container (`.panel-content` / `.content`):**
  - Main panel body rendering `children`.
  - Full width (`width: 100%`) with internal padding and unified background.
  - Border radius dynamically adapts:
    - Standalone (no heading): All 4 corners share `8px` radius.
    - With heading tab: Top-left corner is square (`border-top-left-radius: 0`) to smoothly connect with the tab's vertical left border.

---

## 3. Visual Styling & Fillet Tab Geometry

The heading tab reproduces the physical appearance of an index tab in a binder or manila folder:

- **Top Corners:**
  - Rounded top-left and top-right corners (`border-top-left-radius: 8px`, `border-top-right-radius: 8px`).
- **Base Junction & Open Bottom:**
  - `border-bottom: none` removes any dividing line between the heading tab and content body.
  - Background color matches the content container (`$panel-bg`), creating a continuous unified surface.
- **C1 Continuous Outward Fillet Curve (`::after`):**
  - Located at the bottom-right corner of the tab (`bottom: 0; left: 100%;`).
  - Uses an exact `radial-gradient(circle at 100% 0, ...)` to carve an outward concave curve.
  - Tangent at `(x = 0, y = 0)` is vertical, perfectly matching the tab's right border.
  - Tangent at `(x = fillet_size, y = fillet_size)` is horizontal, seamlessly transitioning into the content container's top border.
  - Fills the region beneath the curve with `$panel-bg`, masking the straight edge of the content container under the fillet.

---

## 4. Component Interface & Data Model

```typescript
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: React.ReactNode;
  headingProps?: React.HTMLAttributes<HTMLDivElement>;
  contentProps?: React.HTMLAttributes<HTMLDivElement>;
  children?: React.ReactNode;
}
```

- **Props Specification:**
  - `heading?: React.ReactNode`: Optional slottable node for the tab. If omitted, `null`, or `undefined`, the heading element is excluded from the DOM.
  - `headingProps?: React.HTMLAttributes<HTMLDivElement>`: Extra attributes, styles, or classes forwarded directly to the heading container.
  - `contentProps?: React.HTMLAttributes<HTMLDivElement>`: Extra attributes, styles, or classes forwarded directly to the content container.
  - `children?: React.ReactNode`: Declarative panel body content.
  - `...rest`: Standard HTML attributes forwarded to the root `.panel` container (`id`, `style`, `className`, `role`, `aria-*`, etc.).

---

## 5. Two-Tier Styling: Defaults & Conceptual Overrides

Styling is organized across two distinct layers:

- **Component Default Styling ([src/components/panel/panel.scss](./panel.scss)):**
  - Self-contained stylesheet providing the core mechanics, structural flex layout, border junctions, and outward fillet geometry (`radial-gradient`).
  - Ensures `<Panel>` renders out-of-the-box with complete, functional binder-folder tab aesthetics wherever imported.
- **Site-Wide Conceptual Overrides ([src/styles.scss](../../styles.scss)):**
  - High-level design overrides applied across the entire website without re-implementing component geometry.
  - Standardizes site-wide panel typography: `.panel .panel-heading { font-size: 1.5rem; font-weight: bold; }`.
  - Additional page or context-specific overrides can be made similarly by targeting `.panel`, `.panel-heading`, or `.panel-content`.

---

## 6. Minimal CSS Class Hierarchy & Contextual Selectors

- `.panel` (Root container, sets layout and default font color)
  - `.panel-heading`, `.heading` (Heading tab container, rendered only when `heading` prop is provided)
    - `::after` (Outward fillet curve pseudo-element)
  - `.panel-content`, `.content` (Panel body container)
