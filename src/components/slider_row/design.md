# SliderRow Component Design

Design specification for the reusable `SliderRow` numeric slider control component.

---

## 1. Overview
- **Purpose:** A self-contained, labeled input slider row providing immediate visual feedback, configurable step precision, and unit formatting for numeric parameters.
- **Component File:** [slider_row.tsx](./slider_row.tsx)
- **Style File:** [slider_row.scss](./slider_row.scss)
- **Shared Tokens:** [../../_shared.scss](../../_shared.scss)
- **Primary Consumer:** [../../galaxy_backdrop/galaxy_settings_dialog.tsx](../../galaxy_backdrop/galaxy_settings_dialog.tsx)

---

## 2. Design Goals & Scope
- **Instant Visual Readout:** Dynamically formats the current numeric value alongside the control label so users can observe precise values in real time during scrub interactions.
- **Adaptive Number Formatting:** Automatically detects integer vs. floating-point granularities based on `step`, avoiding trailing fractional zeros on integers while honoring `displayDecimals` for fractional parameters.
- **Fluid Layout:** Adheres to standard DOM flow, expanding to 100% width of its parent container without hardcoded fixed widths.
- **Keyboard & Screen Reader Accessible:** Maps the textual `label` to `aria-label` on the native range input, enabling full keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`, `PageUp`, `PageDown`).
- **Encapsulated Styling:** Self-contained SCSS defaults utilizing site-wide design tokens (`$font-highlight-color`, `$font-color`) with zero layout shift on focus.

---

## 3. Structure & DOM Layout

The component follows minimal semantic DOM hierarchy:

- **Root Container (`.slider-row` / `.control-row`):**
  - Flex column container (`display: flex; flex-direction: column;`).
  - Spans full container width (`width: 100%; box-sizing: border-box;`).
  - Vertically spaces label header and range input via `gap: 0.35rem`.

- **Label Container (`.label-container`):**
  - Flex row container with space-between distribution (`display: flex; justify-content: space-between; align-items: center;`).
  - **Label Text (`.control-label` / `.label`):** Renders the descriptive title for the slider control.
  - **Value Text (`.control-value` / `.value`):** Monospace numeric readout displaying the formatted value and optional unit suffix.

- **Range Input (`.slider-input`):**
  - Native `<input type="range">` element.
  - Spans full width (`width: 100%`) with customized accent color matching site highlight token.
  - High-visibility focus outline utilizing `outline` and `outline-offset` to prevent box model reflow.

---

## 4. Component Interface & Types

```typescript
export interface SliderRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    displayDecimals?: number;
    onChange: (val: number) => void;
    inputProps?: Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        "type" | "min" | "max" | "step" | "value" | "onChange"
    >;
}
```

- **Props Specification:**
  - `label`: String identifier shown in the header.
  - `value`: Current numerical value bound to the slider.
  - `min`: Minimum selectable number.
  - `max`: Maximum selectable number.
  - `step`: Step granularity (determines integer vs float formatting).
  - `unit`: Optional suffix string (e.g. `"px"`, `"°"`, `" rad"`, `" rad/s"`). Defaults to `""`.
  - `displayDecimals`: Precision for fractional values when `step < 1`. Defaults to `2`.
  - `onChange`: Callback receiving parsed floating-point number on every input event.
  - `inputProps`: Optional extra attributes forwarded to `<input type="range">`.
  - `...rest`: Standard HTML attributes forwarded to the outer `.slider-row` `<div>`.

---

## 5. Value Formatting Algorithm

The readout value is formatted on every render using the following procedure:

- If `step >= 1`:
  - Round to nearest integer: `Math.round(value)`.
  - Apply locale thousands separators: `.toLocaleString()`.
  - Append `unit` string.
- If `step < 1`:
  - Format with fixed decimal precision: `value.toFixed(displayDecimals)`.
  - Append `unit` string.

---

## 6. Styling & Token Integration

- **Default Styling ([slider_row.scss](./slider_row.scss)):**
  - Utilizes `@use "../../shared";` for brand theme consistency.
  - Value readout and accent color link directly to `shared.$font-highlight-color`.
  - Label text utilizes muted secondary font color `#ccc`.
- **Contextual Overrides:**
  - Parent containers (e.g. `.galaxy-settings-dialog .slider-row`) can tune font size, gap spacing, or track heights by targeting `.slider-row` without specificity conflicts.
- **Focus Safety:**
  - Native slider thumb and track focus uses `:focus-visible` with `outline: 2px solid shared.$font-highlight-color; outline-offset: 2px;`.
