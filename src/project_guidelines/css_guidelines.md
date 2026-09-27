# CSS & Styling Guidelines

Comprehensive guidelines and architectural principles for writing CSS/SCSS in this repository.

---
## Class and Selector Design
 - Use the minium required level specificity to target an element and style it.

 When creating new classes and selecting elements for styling consider this hierarchy of context

 ```Site -> Page -> Feature -> Component -> Element -> Special```

 The entire site is most broad and cascades to effect every page on the website. Components on the other hand are narrow and effect only a handful of elements used to create some widget like a calendar picker, a multi part container or complex button. Components may contain elements of significance to the component which may need to be handled in a specific manner and require explicit handling (special).

 Each level of this hierarchy adds a new level of context. When we write code we start with the least context (component and element) and add higher levels of context as required by the needs of a design.

 Target 2 to 3 levels of context as standard. 4 levels is an absolute maximum ceiling:
 ```Feature -> Component -> Element -> Special selector/element```

 Pages may then add their own specializations by adding their context to a selector and overriding previous values. A panel may flex horizontal for one feature area, but flex vertical for another.

## Class Naming

### Naming and Classification
When naming css classes think of it for what "class" stands for: "Classifications" it is used to identify what something IS. Not what something does and **NOT** what something looks like (what it looks like is determined by styling).

Example:
I want to make an panel on the side of my webpage which is about 1/4th the width of the screen and arranges its children elements in a stack.

#### Example 1
Do Not: 
  ```<div class="quarter_panel_flex_vertical">...</div>```

Do:
  ```<div class="panel">...</div>```

#### Example 2
Do Not:
  ```<div class="panel padding_100">...</div>```

Do:
  ```<div class="panel">...</div>```

#### Exceptions
- **Structural "row" and "column":** Class names containing structural terms such as `row` or `column` (e.g., `.title-row`, `.thumbnails-row`, `.col-12`) are acceptable. These frequently describe both what a structural element is and its role in layout, so they are not flagged as violations.

### Child Classes

Components may have several layers of containers and elements. When those elements must be explicitly styled do not prefix the component name to every class.

Do not do:
```
.carousel
.carousel .carousel-panel
.carousel .carousel-panel .carousel-header
```

DO do:
```
.carousel // <--- specify component context
.carousel .panel <--- specify a sub component in this component
.carousel h1 <--- specify specific element in this component (not over-indexing on exact DOM layout)
```

This style will be applied with low specificity and is easy for a page to override:

```css
/* The game-list page can customize panels as is required without having to write a massive selector of its own */
.game-list .panel
```

Classes should often be reused because often the same types of things are used in many places (every page I can think of has a panel, or a "primary" button, or a nav list). But we let the additional layer of context specify overrides when needed, not adding new "classifications". 

---
## Components:

  - Selectors in component style sheets should rarely ever have more than 3 levels of context to them, and exceptions should be raised if it seems required. See the "component -> element -> specialized element" hierarchy mentioned earlier.
  - **Self-Contained Defaults:** Every component should have its own sensible defaults and provide hooks for customizing appearance in the form of css classes.
  - **No Unnecessary CSS Variables:** Components should not define their own variables unless exposing styling internal to a shadow DOM. Variables should be applied from a higher level site-wide style sheet.


---

## 2. Selector & Specificity Rules

### Specificity Calculation (ID - CLASS - TYPE)
Specificity is evaluated as a 3-column weight `(A - B - C)` compared left-to-right:
- **ID (`A`):** `#id` selectors.
- **CLASS (`B`):** `.class` selectors, `[attribute]` selectors, and `:pseudo-classes` (e.g. `:hover`, `:focus`).
- **TYPE (`C`):** Element tags (e.g. `p`, `h1`, `img`) and `::pseudo-elements` (e.g. `::before`, `::after`).
- **Zero Weight `(0 - 0 - 0)`:** The universal selector (`*`) and combinators (`>`, `+`, `~`, space) add zero specificity.
- **Resolution:** A higher column always beats any count in lower columns (e.g. `1-0-0` beats `0-10-0`). Equal specificities resolve to cascade source order (last declared rule wins).

- **Key Selector & Right-to-Left Evaluation:**
  - Browsers evaluate selectors right-to-left. The rightmost segment is the *key selector* and dictates evaluation cost. Keep the key selector specific.

- **Use Minimal Selectors:**
  - Do not overindex on exact DOM layout. Use the least specific selector required. Components with only a handful of elements typically need only 2 levels of context (e.g. `.carousel h1`).

- **Never Qualify Classes with Tags:**
  - Never prefix class selectors with element tags (e.g. use `.panel`, never `div.panel`; use `.btn`, never `button.btn`). It adds redundant checks and inflates specificity.

- **Prefer Child Combinator (`>`) for Direct Children:**
  - Use `>` instead of descendant space (` `) when targeting immediate children (e.g. `.slide > img`, `.panel > .heading`). It stops ancestor traversal at the immediate parent and prevents style leakage into nested components.

- **Contextual Tag Selectors:**
  - Prefer structural context and HTML element tags over redundant classes (e.g. `.title-row p`, `.slide > img`, `.thumbnails-row button`).
  - Keep contextual tag selectors shallow (direct child `>` or 1-level nesting). Avoid generic tags (`div`, `span`, `a`) as descendant key selectors under broad containers.

- **Never Use the Universal `*` Selector:**
  - Never use `*` to target elements. It forces the browser to evaluate every DOM node.
  - Target specific semantic tags, class names, or state pseudo-classes (e.g. `:focus`, `:hover`).

- **Never Use `!important`:**
  - Never use `!important` anywhere in stylesheets.
  - Rely on natural cascade order, proper specificity, and the two-tier styling architecture (component defaults vs. high-level site overrides).

- **Minimal Class Design:**
  - The root element of a component receives a single identifying class (e.g. `.carousel`, `.panel`).
  - Descendant elements do not need prefixed classes (e.g. avoid `.carousel-arrow`). Scope descendants directly under the root class (e.g. `.carousel .arrow`, `.panel .heading`).

---

## 3. Sizing & Document Flow

- **Default 100% Sizing:**
  - Reusable components should expand to fill their parent container by default (`width: 100%; height: 100%`).
  - Do not hardcode rigid container widths inside component stylesheets.
  - Bounding constraints (such as `max-width: 800px`) and outer spacing belong on the page wrapper or parent layout.

- **Normal DOM Flow:**
  - Keep elements in natural document flow.
  - Use `position: absolute` only when intentionally layering elements (such as navigation arrows over carousel slides or fillet curve pseudo-elements).

---

## 4. Focus Indicators & Box Model Safety

- **Zero Layout Shifts:**
  - Always use CSS `outline` and `outline-offset` for focus states instead of `border`.
  - Outlines are drawn outside the box model and do not alter element dimensions or trigger reflow/layout shifts.
- **Overflow Clipping Insets:**
  - On containers using `overflow: hidden` (such as `.viewport` or clipped tabs), use a negative outline offset (e.g. `outline-offset: -2px`) so focus outlines remain crisp and unclipped.
- **Viewport Exclusion:**
  - Suppress focus outlines on outer containers that receive focus on background clicks (`html:focus, body:focus { outline: none; }`).

---

## 5. Theme Tokens & Shared Variables

- **Centralized Design Tokens:**
  - Reference design tokens defined in [src/_shared.scss](../_shared.scss) via `@use "../../shared";` or relative paths.
  - Use shared tokens for:
    - Backgrounds: `$primary-color` (`#1f1f1f`), `$primary-light-color` (`#252325`).
    - Typography: `$font-color` (`#e6e6e6`), `$light-font-color` (`gray`).
    - Accents & Highlights: `$font-highlight-color` (`#21a6ff`).
    - Spacing: `$padding-size` (`1rem`).
  - Avoid hardcoding arbitrary hex colors in component stylesheets.
