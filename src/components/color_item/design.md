# ColorItem Component Design

Design specification for the reusable `ColorItem` interactive color picker and swatch component.

---

## 1. Overview
- **Purpose:** A self-contained, labeled color input component displaying an interactive color swatch alongside a synchronized uppercase hexadecimal readout, binding seamlessly to normalized `[0, 1]` RGB triplet state.
- **Component File:** [color_item.tsx](./color_item.tsx)
- **Style File:** [color_item.scss](./color_item.scss)
- **Helper Utilities:** [../../helpers/colors.ts](../../helpers/colors.ts)
- **Shared Tokens:** [../../_shared.scss](../../_shared.scss)
- **Primary Consumer:** [../../galaxy_backdrop/galaxy_settings_dialog.tsx](../../galaxy_backdrop/galaxy_settings_dialog.tsx)

---

## 2. Design Goals & Scope
- **Bidirectional Color State Conversion:** Bridges normalized floating-point RGB representations (`[r, g, b]` where $0 \le channel \le 1$, used in shaders and WebGL) with the browser's native `#RRGGBB` hexadecimal input.
- **Immediate Visual & Textual Feedback:** Presents a clickable color swatch paired with an uppercase hexadecimal text readout for quick inspection and adjustment.
- **Cross-Browser Swatch Styling:** Overrides default native browser color well chrome using vendor-prefixed pseudo-elements (`::-webkit-color-swatch`, `::-moz-color-swatch`), rendering a unified border and radius.
- **Accessible & Focus Safe:** Uses native `<input type="color">` for keyboard accessibility, screen reader announcements, and native OS color-wheel dialogs, with non-shifting `:focus-visible` outlines.

---

## 3. Structure & DOM Layout

- **Root Container (`.color-item`):**
  - Flex column container (`display: flex; flex-direction: column; gap: 0.35rem;`).
  - Sized for grid placement or vertical stacking.

- **Label (`.color-label` / `.label`):**
  - Descriptive text title for the color channel or material parameter (`color: #ccc; font-size: 0.8rem;`).

- **Input Wrapper (`.color-input-wrapper` / `.input-wrapper`):**
  - Flex row container aligning swatch and hex readout (`display: flex; align-items: center; gap: 0.5rem;`).
  - **Color Swatch (`.color-swatch` / `.swatch`):**
    - Native `<input type="color">` stripped of default OS styling via `appearance: none`.
    - Compact dimensions: `32px` width by `28px` height with subtle `rgba(255, 255, 255, 0.2)` border.
  - **Hexadecimal Readout (`.color-hex` / `.hex`):**
    - Monospace text element (`font-family: monospace; font-size: 0.8rem; color: #aaa;`) displaying uppercase hex code (e.g. `"#FFD08C"`).

---

## 4. Component Interface & Types

```typescript
export interface ColorItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    label: string;
    rgb: [number, number, number];
    onChange: (rgb: [number, number, number]) => void;
    inputProps?: Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        "type" | "value" | "onChange"
    >;
}
```

- **Props Specification:**
  - `label`: Descriptive label for the color setting.
  - `rgb`: Normalized 3-element tuple `[r, g, b]` with values in the range `[0.0, 1.0]`.
  - `onChange`: Callback fired on every color change, supplying the updated normalized RGB tuple `[r, g, b]`.
  - `inputProps`: Optional attributes forwarded directly to the `<input type="color">` element.
  - `...rest`: Standard HTML attributes forwarded to the outer `.color-item` `<div>`.

---

## 5. Color Conversion Pipeline

The component integrates with [../../helpers/colors.ts](../../helpers/colors.ts) to execute two-way color mapping:

- **State to Display (RGB -> Hex):**
  - Uses `rgbToHex(rgb)`.
  - Maps floating-point channel values $c \in [0, 1]$ to 8-bit integers $\lfloor c \times 255 \rceil$.
  - Formats as `#RRGGBB` hex string for `<input type="color">` value and displays in uppercase.
- **Input to State (Hex -> RGB):**
  - On input event (`e.target.value`), invokes `hexToRgb(hexString)`.
  - Parses two-digit hex segments into 8-bit integers and divides by 255 to yield normalized floats.
  - Passes the resulting `[number, number, number]` to `onChange`.

---

## 6. Styling & Layout Integration

- **Grid Alignment:**
  - Designed to fit inside responsive CSS grids such as `.colors-grid` (`display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));`).
- **Focus Safety:**
  - Applies `:focus-visible { outline: 2px solid shared.$font-highlight-color; outline-offset: 2px; }` to the color swatch, preventing layout shifts.
