# AGENTS.md

## CSS & Styling Rules
- **Never use *:** Never use `*` selector to target everything.
- **Minimal css class design:** The root element gets a single identifying class (e.g., `.carousel`). Descendants do not need component prefixes and should be scoped under the root (e.g., `.carousel .arrow`).
- **Contextual tag selectors:** Use structural context and element tag names (e.g., `.title-row p`, `.slide img`) instead of creating redundant classes (e.g., `.title`, `.image`).
- **Default sizing:** Components should expand to fill their parent container by default (`width: 100%; height: 100%`).
