# Using Parcel Guidelines

Principles and reference rules for handling Parcel 2 imports and special module resolution features in this repository.

---

## Overview
Parcel 2 serves as the asset bundler and compiler for this project. While TypeScript handles static typing, Parcel introduces non-native import schemes, asset transformers, and glob-based module resolution. 

Type declarations for Parcel import patterns are maintained in [src/import_types.d.ts](../import_types.d.ts).

---

## 1. Images & Static Assets
- **Standard ESM Imports:**
  - Use relative ESM imports to import image files (PNG, JPG, GIF, AVIF, WebP, SVG).
  - Example: `import heroImg from "./hero.jpg";`
  - Parcel processes the image and returns a bundled asset URL string suitable for `<img src={heroImg} />`.
- **URL Scheme (`url:`):**
  - Use the `url:` prefix when an explicit raw URL string to a file is required.
  - Example: `import iconUrl from "url:./icon.png";`

---

## 2. GLSL & Shader Files (.vert, .frag, .glsl)
- **Direct Imports:**
  - Import shader files directly without special prefixes.
  - Example: `import vertShader from "./shaders/galaxy_orb.vert";`
  - Example: `import fragShader from "./shaders/galaxy_orb.frag";`
- **Transformer Processing:**
  - GLSL files are automatically processed by `@parcel/transformer-glsl`.
  - The transformer converts the shader file directly into a JS module that exports the GLSL source code string as its default export.
- **DO NOT Use `bundle-text:` on Shaders:**
  - Never import GLSL files using `bundle-text:` (e.g., `import vert from "bundle-text:./shaders/..."`).
  - `@parcel/transformer-glsl` already converts the shader to a JS string export. Combining `bundle-text:` with GLSL transformers causes Parcel to bundle the JS wrapper code (`module.exports = ...`) and double-escape newlines, leading to WebGL shader compilation failures at runtime.

---

## 3. SCSS & CSS Stylesheets
- **Global Stylesheets:**
  - Import stylesheets directly to bundle them into the global cascade.
  - Example: `import "./style.scss";`
  - Processed automatically via `@parcel/transformer-sass`.
- **CSS Modules:**
  - Use `.module.scss` or `.module.css` filenames for locally scoped styles.
  - Example: `import styles from "./style.module.scss";`

---

## 4. Text Inlining (`bundle-text:`)
- **Raw Text Files:**
  - Use `bundle-text:` only when inlining non-GLSL plain text files (e.g., `.txt`, `.md`).
  - Example: `import rawText from "bundle-text:./notes.txt";`

---

## 5. Glob Imports & Dynamic Page Indexing
- **Glob Import Syntax:**
  - Use glob patterns with absolute workspace paths (`/src/...`) to import batches of files dynamically.
  - Example: `import ARTICLE_PAGE_IMPORTS from '/src/pages/articles/content/**/*.tsx';`
  - Handled by `@parcel/resolver-glob`.
- **Module Map Structure:**
  - `@parcel/resolver-glob` transforms the matching file structure into a nested object dictionary representing the directory tree.
  - Leaf objects in the dictionary contain module exports (e.g. `{ default: Component, ARTICLE_DETAILS: metadata }`).
- **Dynamic Page Indexing Pattern:**
  - To index pages or articles dynamically for routing, traverse the nested object dictionary (e.g., via a recursive generator function).
  - Extract the module component (`obj.default`), route path (derived from directory depth keys), and page metadata to construct route lists dynamically for React Router.
  - Reference implementation: [src/pages/articles/index_instance.ts](../pages/articles/index_instance.ts).
