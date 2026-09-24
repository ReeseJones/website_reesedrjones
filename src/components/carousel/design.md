# Carousel Component Design

Design specification for the project and game showcase carousel on the main landing page.

---

## 1. Overview
- **Purpose:** Showcase games and projects built by Reese Jones on the main page ([src/pages/main.tsx](file:///D:/_/website_reesedrjones/src/pages/main.tsx)).
- **Component File:** [src/components/carousel/carousel.tsx](file:///D:/_/website_reesedrjones/src/components/carousel/carousel.tsx)
- **Style File:** [src/components/carousel/carousel.scss](file:///D:/_/website_reesedrjones/src/components/carousel/carousel.scss)
- **Design Document:** [src/components/carousel/design.md](file:///D:/_/website_reesedrjones/src/components/carousel/design.md)

---

## 2. Layout & Structure (Three Rows)

The component is wrapped in a top-level container with class `.carousel`, configured to expand to fill its parent container by default:
- **Default Sizing & Flex Layout:**
  - `.carousel` defaults to `width: 100%; height: 100%; display: flex; flex-direction: column;`.
  - Conforms to any wrapper, grid column, or card without hardcoded width constraints.
  - Rows 1 (`.title-row`) and 3 (`.thumbnails-row`) take their natural heights (`flex: 0 0 auto`).
  - Row 2 (`.stage-row`) takes the remaining vertical space (`flex: 1 1 auto; min-height: 0;`).
  - In auto-height parents, `.stage-row .viewport` maintains an aspect ratio (e.g., `aspect-ratio: 16 / 9`) to ensure consistent proportional scaling without collapsing.


- **Row 1 — Title Header (`.title-row`):**
  - Displays the title of the active item in a `<p>` element (or customizable heading tag).
  - Keeps semantic outline safe regardless of where the carousel is mounted on the page.
  - No special `.title` class needed; styled directly via `.carousel .title-row p`.
  - Updates in sync with the active slide.
- **Row 2 — Main Stage (`.stage-row`):**
  - Largest section of the component.
  - **Static Navigation Arrows (`.arrow`):**
    - Fixed on the left (`.arrow.prev`) and right (`.arrow.next`).
    - Cycles through items one-by-one with wraparound looping.
  - **Clipped Viewport (`.viewport`):**
    - Uses `overflow: hidden; position: relative;` to clip adjacent slides.
  - **Sliding Track (`.track`):**
    - Flex container holding all full-size slides.
    - Transitions horizontally via `transform: translateX(-${currentSlot * 100}%)`.
    - Transition duration driven by CSS variable `--carousel-duration` (default `400ms`).
  - **Slide & Main Image (`.slide` > `img`):**
    - `.slide`: `flex: 0 0 100%; width: 100%; height: 100%;` to fill the viewport completely.
    - `img`: Targeted directly as `.slide img` (no `.image` class needed). Set to `width: 100%; height: 100%; object-fit: cover; display: block;` to cleanly fill the stage.
- **Row 3 — Thumbnail Strip (`.thumbnails-row`):**
  - Horizontal list of thumbnail preview buttons (`.thumbnail`).
  - Active thumbnail marked with class `.active`.
  - Clicking any thumbnail pans the track directly to the selected image.
  - Scrollable horizontally if thumbnails overflow.

---

## 3. Interaction & Animation Mechanics

- **Buffer Track with Wrapping Index Math (No Array Duplication):**
  - Rather than duplicating or cloning elements into a new array, the track renders `slotCount = itemCount + 2` virtual slots.
  - The item for each slot is calculated via wrapping index math: `getWrappedIndex(slotIndex - 1, itemCount) = ((slotIndex - 1) % itemCount + itemCount) % itemCount`.
    - Slot `0`: Resolves to `items[itemCount - 1]` (the last item).
    - Slots `1` through `itemCount`: Resolves directly to `items[0]` through `items[itemCount - 1]`.
    - Slot `itemCount + 1`: Resolves to `items[0]` (the first item).
  - The original `items` array is never cloned, copied, or re-allocated.
  - **Normal Navigation:** Item `i` is displayed at slot `i + 1` with `transform: translateX(-${(i + 1) * 100}%)`.
  - **Forward Loop Wrap (`itemCount - 1 -> 0`):**
    - The track smoothly animates forward into slot `itemCount + 1` (maps to item 0).
    - Upon `onTransitionEnd`, the track disables transitions (`transition: none`) and silently snaps to slot `1` (also item 0).
  - **Backward Loop Wrap (`0 -> itemCount - 1`):**
    - The track smoothly animates backward into slot `0` (maps to item itemCount - 1).
    - Upon `onTransitionEnd`, the track disables transitions and silently snaps to slot `itemCount` (also item itemCount - 1).
  - **Thumbnail Jumps:** Clicking thumbnail `k` animates directly to slot `k + 1`.
- **Controlled Event Emission (No Internal Navigation State):**
  - Navigation actions emit events to the parent controller rather than mutating state directly:
    - `onScrollLeft()`: Emitted when pressing previous arrow, `ArrowLeft`, or swiping right.
    - `onScrollRight()`: Emitted when pressing next arrow, `ArrowRight`, or swiping left.
    - `onSelectIndex(index)`: Emitted when clicking a thumbnail button.
- **Keyboard Navigation:**
  - `ArrowLeft`: Calls `onScrollLeft()`.
  - `ArrowRight`: Calls `onScrollRight()`.
  - Focusable with `tabIndex={0}` or aria-roledescription.
- **Animation Duration Customization:**
  - Configurable via optional `animationDurationMs` prop, which sets `--carousel-duration` on the root element style (e.g. `--carousel-duration: 400ms`).
  - Can also be overridden directly in SCSS.

---

## 4. Touch & Swipe Detection Specification

Touch interactions are classified into three distinct outcomes upon gesture completion:
- **`no movement`**: Finger moved less than the threshold or gesture was a vertical page scroll (no-op; allows standard tap/click events).
- **`left move`**: User swiped from right to left (`deltaX < -threshold`), advancing to the **next** slide.
- **`right move`**: User swiped from left to right (`deltaX > threshold`), retreating to the **previous** slide.

### Implementation Details:
- **State Storage:** Track touch start and end positions using `useRef<{ x: number; y: number } | null>` to prevent unnecessary React re-renders during high-frequency touch events.
- **Event Handlers:**
  - `onTouchStart`: Records initial single-touch coordinates `(e.touches[0].clientX, e.touches[0].clientY)`.
  - `onTouchMove`: Continuously updates current touch coordinates `(e.touches[0].clientX, e.touches[0].clientY)`.
  - `onTouchEnd`: Evaluates vectors:
    - `deltaX = currentX - startX`
    - `deltaY = currentY - startY`
    - **Threshold check (`minDistance = 50px`):** If `Math.abs(deltaX) < minDistance`, classify as **`no movement`**.
    - **Direction dominance check:** If `Math.abs(deltaY) > Math.abs(deltaX)`, user is scrolling vertically down the page, classify as **`no movement`**.
    - If `deltaX < -minDistance` -> classify as **`left move`** -> call `onScrollRight?.()`.
    - If `deltaX > minDistance` -> classify as **`right move`** -> call `onScrollLeft?.()`.
  - `onTouchCancel`: Resets touch refs to `null`.

---

## 5. Component Interface & Data Model

```typescript
export interface CarouselItem {
  title: string;
  fullImageUrl: string;
  thumbnailUrl: string;
  alt?: string;
  linkUrl?: string;
  description?: string;
}

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  items: CarouselItem[];
  selectedIndex: number;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  onSelectIndex?: (index: number) => void;
  animationDurationMs?: number; // Defaults to 400ms
}
```

- **Controlled Props:** `selectedIndex` directly dictates the active slide. The component emits `onScrollLeft`, `onScrollRight`, and `onSelectIndex` rather than managing its own index state.
- **Index Validation & Fail-Fast Behavior:**
  - `selectedIndex` is strictly validated upon render rather than silently clamped or corrected, delegating bounds checking to the generic `validateIndex` utility in [src/lib/helpers.ts](file:///D:/_/website_reesedrjones/src/lib/helpers.ts).
  - When `items.length > 0`: `selectedIndex` must be an integer within the valid range `0 <= selectedIndex < items.length`. If `selectedIndex < 0` or `selectedIndex >= items.length` (or is non-integer), a `RangeError` is thrown with a descriptive message indicating the provided value and the valid range `[0, items.length - 1]`.
  - When `items.length === 0`: `selectedIndex` must equal `0`; any other value throws a `RangeError`.
  - Design rationale: Silently correcting out-of-range indices masks upstream state bugs and causes desynchronization between parent state and visual stage. Fail-fast error throwing ensures consumers or state hooks (`useCarouselController`) intentionally manage index bounds using `wrapIndex` or `useWrappingIndex`.
- **Prop Forwarding (`...rest`):** Any extra HTML attributes (`id`, `aria-*`, `data-*`, custom `style`, etc.) are forwarded cleanly to the root `.carousel` element.

---

## 6. Modular Hooks Architecture

Each behavioral responsibility is extracted into its own dedicated hook file in `src/components/carousel/`:

### 1. `useCarouselController` (Core State & Looping Hook)
- **File:** [src/components/carousel/use_carousel_controller.ts](file:///D:/_/website_reesedrjones/src/components/carousel/use_carousel_controller.ts)
- **Purpose:** Manages the active slide index, boundary clamping, and looping wrap logic.
- **Inputs (`UseCarouselControllerOptions`):**
  - `itemCount: number`: Total number of items.
  - `initialIndex?: number`: Starting index (defaults to `0`).
  - `loop?: boolean`: Whether to wrap around at boundaries (defaults to `true`).
- **Outputs (`UseCarouselControllerReturn`):**
  - `selectedIndex: number`: The active slide index.
  - `setIndex: (index: number) => void`: Direct jump to a specific slide.
  - `scrollLeft: () => void`: Decrements the index (wraps to `itemCount - 1` if `loop: true`).
  - `scrollRight: () => void`: Increments the index (wraps to `0` if `loop: true`).
  - `bind`: Pre-configured prop bundle `{ selectedIndex, onScrollLeft, onScrollRight, onSelectIndex }` for direct spreading onto `<Carousel {...bind} />`.

### 2. `useCarouselAutoScroll` (Auto-Play Timer Hook)
- **File:** [src/components/carousel/use_carousel_auto_scroll.ts](file:///D:/_/website_reesedrjones/src/components/carousel/use_carousel_auto_scroll.ts)
- **Purpose:** Automatically advances the carousel on a recurring timer.
- **Inputs (`UseCarouselAutoScrollOptions`):**
  - `onAdvance: () => void`: The advance callback (typically `scrollRight` from controller).
  - `intervalMs?: number`: Interval delay in milliseconds (defaults to `5000ms`).
  - `paused?: boolean`: Pauses auto-scrolling (e.g. during hover, touch, or active modal).
- **Behavior:** Runs a recurring interval that invokes `onAdvance` and automatically suspends while the browser tab is hidden (`visibilitychange`).

### 3. `useCarouselTrack` (Presentational Track Motion Hook)
- **File:** [src/components/carousel/use_carousel_track.ts](file:///D:/_/website_reesedrjones/src/components/carousel/use_carousel_track.ts)
- **Purpose:** Extracts low-level DOM side effects (`useEffect`s), cloned-slide generation, slot calculations, silent-snap boundary resets, and transition fallback timers away from `<Carousel />`.
- **Inputs (`UseCarouselTrackOptions`):**
  - `items: CarouselItem[]`: Full item list.
  - `selectedIndex: number`: Currently active slide index from props.
  - `animationDurationMs?: number`: Slide transition duration (defaults to `400ms`).
- **Outputs (`UseCarouselTrackReturn`):**
  - `slotCount: number`: Total number of virtual track slots (`itemCount + 2` when `itemCount > 1`).
  - `getSlotItemIndex: (slotIndex: number) => number`: Wrapping math function returning the genuine item index for any slot.
  - `currentSlot: number`: The physical rendered slot on the track.
  - `isTransitioning: boolean`: Animation lock to guard rapid interactions.
  - `isSilentSnap: boolean`: Flag active during zero-time boundary repositioning.
  - `trackProps`: Pre-bundled props for `<div className="track" />` (`ref`, `className`, `style`, `onTransitionEnd`).
  - `recordAction: (action: "left" | "right" | "select") => void`: Informs the hook of user intent to optimize wrap detection.

### 4. `useThumbnailScroll` (Thumbnail Strip Auto-Scroll Hook)
- **File:** [src/components/carousel/use_thumbnail_scroll.ts](file:///D:/_/website_reesedrjones/src/components/carousel/use_thumbnail_scroll.ts)
- **Purpose:** Watches `selectedIndex` and smoothly scrolls the active thumbnail button (`button.active`) into view inside the thumbnails row.
- **Inputs:** `selectedIndex: number`.
- **Outputs:** `thumbnailsRowRef: React.RefObject<HTMLDivElement | null>` to attach to `<div className="thumbnails-row" />`.

### 5. `useSwipeGestures` (Touch Gesture Detection Hook)
- **File:** [src/components/carousel/use_swipe_gestures.ts](file:///D:/_/website_reesedrjones/src/components/carousel/use_swipe_gestures.ts)
- **Purpose:** Tracks touch coordinates without triggering component re-renders, evaluating horizontal vector dominance and minimum distance thresholds.
- **Inputs (`UseSwipeGesturesOptions`):**
  - `onSwipeLeft?: () => void`: Invoked when user swipes left.
  - `onSwipeRight?: () => void`: Invoked when user swipes right.
  - `minDistance?: number`: Minimum swipe distance (defaults to `50px`).
- **Outputs (`SwipeGestureHandlers`):** `{ onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }` to spread directly onto `<div className="viewport" />`.

### 6. `useWrappingIndex` & `wrapIndex` (Generic Index Wrapping Hook & Math)
- **File:** [src/hooks/use_wrapping_index.ts](file:///D:/_/website_reesedrjones/src/hooks/use_wrapping_index.ts)
- **Purpose:** Pure mathematical modulo wrapping hook and function ensuring an arbitrary index wraps cleanly within `[0, maxIndex - 1]`. Uses Euclidean modulo `((selectedIndex % maxIndex) + maxIndex) % maxIndex` to properly handle negative values.
- **Hook Signature:** `useWrappingIndex(selectedIndex: number, maxIndex: number): number`
  - `selectedIndex`: The input candidate index.
  - `maxIndex`: Total item count (`items.length`).
  - Returns the memoized wrapped index in `[0, maxIndex - 1]` (or `0` if `maxIndex <= 0`).
- **Pure Function Signature:** `wrapIndex(selectedIndex: number, maxIndex: number): number`
  - Non-hook calculation for event callbacks, slot resolution, or standalone calculations.

---



## 7. Minimal CSS Class Hierarchy & Contextual Selectors

Descendants rely on HTML tags and structural context rather than redundant classes:

- `.carousel` (Root container, sets CSS variables e.g. `--carousel-duration`)
  - `.title-row`
    - `p` (Active title text)
  - `.stage-row`
    - `button.arrow.prev`, `button.arrow.next`
    - `.viewport`
      - `.track`
        - `.slide`, `.slide.active`
          - `img` (Full size image, no `.image` class needed)
  - `.thumbnails-row`
    - `button`, `button.active` (Thumbnail preview button, no `.thumbnail` class needed)
      - `img` (Thumbnail preview image, no `.thumbnail-img` class needed)
