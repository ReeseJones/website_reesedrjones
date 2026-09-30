# Carousel Dialog Component Design

Design specification for the full-screen modal image viewer that cooperates with the carousel component.

---

## 1. Overview
- **Purpose:** Provide a dedicated full-screen modal viewer that maximizes image size on screen while remaining fully synchronized with the inline carousel.
- **Component File:** [src/components/carousel/carousel_dialog.tsx](./carousel_dialog.tsx)
- **Style File:** [src/components/carousel/carousel_dialog.scss](./carousel_dialog.scss)
- **Cooperating Carousel Design:** [src/components/carousel/design.md](./design.md)

---

## 2. Design Goals & Architectural Cooperation

- **Synchronized State Sharing:**
  - Operates as a peer component driven by the same state instance from [useCarouselController](./use_carousel_controller.ts).
  - Navigating images within the modal immediately synchronizes the active slide index in the inline carousel, and vice versa.
- **Auto-Scroll Suspension:**
  - Cooperates with [useCarouselAutoScroll](./use_carousel_auto_scroll.ts) via the `paused` property (`paused={isOpen}`).
  - Prevents background slide advancement while the user focuses on the full-screen dialog.
- **Maximized Viewport Coverage with Native Size Ceiling:**
  - Expands to the boundaries of the viewport (`100vw` by `100vh`).
  - Constrains images using `width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain;`.
  - Ensures images never upscale beyond their actual native pixel dimensions to prevent pixelation and blur, while gracefully downscaling larger images to fit the screen.
- **Consistent Interaction Parity:**
  - Preserves navigation arrow affordances identical to the inline carousel.
  - Reuses [useSwipeGestures](./use_swipe_gestures.ts) for touch gesture handling on mobile and tablet displays.
  - Supports standard keyboard navigation (`ArrowLeft`, `ArrowRight`, and `Escape`).

---

## 3. Layout & DOM Structure

Built using the native HTML `<dialog>` element to leverage browser top-layer stacking, focus containment, and accessibility primitives without unnecessary wrapper elements (satisfying [html_layout_guidelines.md](../../project_guidelines/html_layout_guidelines.md)):

- **Top-Level Container (`dialog.carousel-dialog`):**
  - Manages modal lifecycle via native `.showModal()` and `.close()` methods.
  - Occupies the entire viewport: `width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; margin: 0; padding: 0; border: none;`.
  - Positioned in the browser top-layer with dark backdrop styling.
- **Modal Backdrop (`::backdrop`):**
  - High-opacity dark background (`background: rgba(0, 0, 0, 0.92); backdrop-filter: blur(8px);`).
  - Clicking directly on the backdrop area triggers dialog dismissal.
- **Dismissal Button (`button.close-btn`):**
  - Positioned at the top right of the viewport (`position: fixed; top: 1rem; right: 1rem; z-index: 10;`).
  - Renders a clean '✕' symbol with an accessible `aria-label="Close image viewer"`.
- **Caption Banner (`.caption-banner`):**
  - Floats at the top center of the viewport without obstructing the active image.
  - Arranges labels in a vertical column (`display: flex; flex-direction: column; align-items: center;`).
  - **Item Title:** Primary `<p>` tag displaying the active slide title.
  - **Navigation Position Indicator:** Secondary `<span className="counter">` tag on a new line underneath the title, displaying the 1-based image index and total count (e.g., `3 of 5`).
- **Viewing Stage (`.stage`):**
  - Flex container filling `100%` width and `100%` height of the dialog.
  - Binds touch handlers from [useSwipeGestures](./use_swipe_gestures.ts).
  - Hosts the active slide image and navigation arrows.
- **Slide Image (`img.active-image`):**
  - Styled with `width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain; display: block;`.
  - Never exceeds its native pixel dimensions, avoiding distortion or pixelation on large displays.
  - Prevents drag events (`-webkit-user-drag: none; user-select: none;`).
- **Navigation Arrows (`button.arrow`):**
  - Left arrow (`.arrow.prev`) and right arrow (`.arrow.next`) positioned absolutely on the horizontal edges of the stage (`top: 50%; transform: translateY(-50%);`).
  - Matches button styles, hover states, and focus outlines from [carousel.scss](./carousel.scss).

---

## 4. Interaction, Navigation & Gesture Mechanics

- **Navigation Actions:**
  - **Left Navigation (`onScrollLeft`):** Triggered by clicking `.arrow.prev`, pressing `ArrowLeft`, or swiping right.
  - **Right Navigation (`onScrollRight`):** Triggered by clicking `.arrow.next`, pressing `ArrowRight`, or swiping left.
- **Dismissal Actions:**
  - Triggered by clicking `.close-btn`, pressing `Escape` (handling native `cancel` event), or clicking the dialog outside the stage.
- **Touch & Swipe Detection:**
  - Directly attaches handlers `{ onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }` from [useSwipeGestures](./use_swipe_gestures.ts) to `.stage`.
  - Evaluates horizontal vectors with `minDistance = 50px`.
  - Enforces vector dominance (`Math.abs(deltaY) <= Math.abs(deltaX)`) before firing swipe navigation.
- **Keyboard Handling:**
  - `ArrowLeft`: Calls `onScrollLeft?.()`.
  - `ArrowRight`: Calls `onScrollRight?.()`.
  - `Escape`: Calls `onClose()`.
- **Background Synchronization:**
  - Navigating inside the dialog updates `selectedIndex` in [useCarouselController](./use_carousel_controller.ts).
  - When the dialog closes, the inline carousel is already positioned on the exact image last viewed.

---

## 5. Component Interface & Data Model

```typescript
import type { CarouselItem } from "./carousel";

export interface CarouselDialogProps extends React.HTMLAttributes<HTMLDialogElement> {
  items: CarouselItem[];
  selectedIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  onSelectIndex?: (index: number) => void;
  animationDurationMs?: number;
}
```

- **Controlled Props:** `isOpen` and `selectedIndex` dictate modal visibility and active slide image.
- **Fail-Fast Index Validation:** Validates `selectedIndex` against `items` using `validateIndex` from [src/lib/helpers.ts](../../lib/helpers.ts).
- **Prop Forwarding:** Standard HTML attributes (`className`, `style`, `aria-*`) forward cleanly to `<dialog>`.

---

## 6. Minimal CSS Class Hierarchy & Contextual Selectors

Descendant rules are kept within 2–3 levels of context (satisfying [css_guidelines.md](../../project_guidelines/css_guidelines.md)):

- `.carousel-dialog` (Root `<dialog>` element, sets fixed positioning, sizing, and reset styles)
  - `&::backdrop` (Top-layer backdrop color and blur filter)
  - `> .close-btn` (Fixed close button in top corner)
  - `> .caption-banner` (Floating title and navigation position container)
    - `> p` (Title typography styled with design token `$font-color`)
    - `> .counter` (Order indicator styled with design token `$light-font-color`)
  - `> .stage` (Full-size flex stage)
    - `> img.active-image` (Maximized responsive image capped at native size with `width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain;`)
    - `> .arrow` (Navigation buttons, `.prev` and `.next`)

---

## 7. Algorithms & Procedures

### Dialog Lifecycle Procedure
- **Mount & Open:**
  - When `isOpen` switches from `false` to `true`, the component invokes `dialogRef.current?.showModal()`.
  - Focus is placed on the active dialog surface.
- **Close & Cleanup:**
  - When `isOpen` switches from `true` to `false`, the component invokes `dialogRef.current?.close()`.
  - Focus returns to the triggering element in the inline carousel.
- **Backdrop Click Detection:**
  - Evaluates click coordinates relative to the dialog bounding rectangle on `onClick`.
  - If `e.target === dialogRef.current` (outside content area), invokes `onClose()`.

### Cooperating Inline Carousel Integration Procedure
- In [src/components/carousel/carousel.tsx](./carousel.tsx):
  - Accepts optional `onOpenDialog?: (index: number) => void`.
  - When provided, renders an expand button on the carousel stage.
  - When slide image is clicked and `linkUrl` is not defined, invokes `onOpenDialog(selectedIndex)`.
