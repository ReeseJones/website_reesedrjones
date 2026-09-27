# HTML & Layout Guidelines

Guidelines and architectural principles for designing HTML structure and page layouts in this repository.

## 1. Minimal DOM Structure & Element Count

- **Use Minimum Elements Required:**
  - Use only the minimum number of elements required to achieve a layout.
  - Avoid deeply nested `div` structures where each wrapper merely introduces a slight styling adjustment.
  - Roll multiple styling declarations directly onto the primary container or parent element rather than creating intermediate wrapper `div`s.

- **Single-Child Wrapper Anti-Pattern:**
  - Smell: A `div` whose only child is another `div` with no siblings (`<div><div>...</div></div>`).
  - Single-child elements cannot perform layout (flex, grid, or flow require 2+ elements). They exist only for visual decoration or sizing constraints that belong on the parent or child.
  - Fix: Eliminate the wrapper `div`s and consolidate their CSS declarations onto the primary semantic element.
  - **Exception for Structural Containers (Rows / Columns):** Specific container types like rows or columns (e.g., `.title-row`, `.grid-row`, `.col-12`) are structurally designed to host layout regions and support multiple siblings, even if only one child is currently present. These represent intentional layout scaffolding and are not considered wrapper anti-patterns.

### Example 1: Section & Page Container Constraints

#### Bad (Single-Child Div Chain)
Each wrapper adds a single styling property before reaching the actual content.

```html
<main id="main-content">
  <div class="page-background">
    <div class="content-spacing">
      <div class="container-constraint">
        <section class="product-showcase">
          <!-- Content -->
        </section>
      </div>
    </div>
  </div>
</main>
```

```css
/* Bad: Fragmented across 3 empty wrappers */
.page-background { background-color: #fff; }
.content-spacing { padding-top: 2.5rem; }
.container-constraint { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
.product-showcase { display: grid; grid-template-columns: 1fr 1fr; }
```

#### Good (Flattened Semantic Structure)
Wrappers are removed; background, constraints, and padding roll directly into the section.

```html
<main id="main-content">
  <section class="product-showcase">
    <!-- Content -->
  </section>
</main>
```

```css
/* Good: Unified onto the semantic element */
.product-showcase {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background-color: #fff;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1rem 0;
}
```

### Example 2: Navigation Header

#### Bad (Nested Wrappers for Nav)
Intermediate `div`s wrap a solitary `<nav>` just to apply background, border, and padding.

```html
<header>
  <div class="nav-wrapper">
    <div class="nav-background">
      <div class="nav-padding">
        <nav>
          <a href="/">Home</a>
          <a href="/shop">Shop</a>
        </nav>
      </div>
    </div>
  </div>
</header>
```

```css
/* Bad: Scattered declarations */
.nav-wrapper { border-top: 2px solid #333; }
.nav-background { background-color: #1f1f1f; border-radius: 8px 8px 0 0; }
.nav-padding { padding: 1rem 2rem; }
nav { display: flex; justify-content: space-between; }
```

#### Good (Directly Styled `<nav>`)
The `<nav>` receives the styling directly without intermediate containers.

```html
<header>
  <nav class="primary-nav">
    <a href="/">Home</a>
    <a href="/shop">Shop</a>
  </nav>
</header>
```

```css
/* Good: Compact, single-element styling */
.primary-nav {
  display: flex;
  justify-content: space-between;
  background-color: #1f1f1f;
  border-top: 2px solid #333;
  border-radius: 8px 8px 0 0;
  padding: 1rem 2rem;
}
```
