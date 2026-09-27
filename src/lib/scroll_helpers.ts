export interface ContainedScrollOptions {
  axis?: "x" | "y" | "both";
  alignment?: "nearest" | "center";
  behavior?: ScrollBehavior;
}

/**
 * Scrolls a target child element into view strictly within its parent container.
 * Unlike Element.prototype.scrollIntoView(), this function isolates scrolling
 * to the specified container and never affects ancestor elements or the window viewport.
 *
 * @param container - The scrollable parent container element
 * @param target - The child element to bring into view
 * @param options - Configuration for axis, alignment, and scroll behavior
 */
export function scrollIntoContainer(
  container: HTMLElement,
  target: HTMLElement,
  options: ContainedScrollOptions = {}
): void {
  const { axis = "x", alignment = "nearest" } = options;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  if (containerRect.width === 0 || targetRect.width === 0) return;
  if (containerRect.height === 0 || targetRect.height === 0) return;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior =
    options.behavior ?? (prefersReducedMotion ? "auto" : "smooth");

  let deltaX = 0;
  let deltaY = 0;

  if (axis === "x" || axis === "both") {
    if (alignment === "center") {
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const containerCenterX = containerRect.left + containerRect.width / 2;
      deltaX = targetCenterX - containerCenterX;
    } else {
      // "nearest" alignment
      if (targetRect.left < containerRect.left) {
        deltaX = targetRect.left - containerRect.left;
      } else if (targetRect.right > containerRect.right) {
        deltaX = targetRect.right - containerRect.right;
      }
    }
  }

  if (axis === "y" || axis === "both") {
    if (alignment === "center") {
      const targetCenterY = targetRect.top + targetRect.height / 2;
      const containerCenterY = containerRect.top + containerRect.height / 2;
      deltaY = targetCenterY - containerCenterY;
    } else {
      // "nearest" alignment
      if (targetRect.top < containerRect.top) {
        deltaY = targetRect.top - containerRect.top;
      } else if (targetRect.bottom > containerRect.bottom) {
        deltaY = targetRect.bottom - containerRect.bottom;
      }
    }
  }

  if (deltaX !== 0 || deltaY !== 0) {
    container.scrollBy({
      left: deltaX,
      top: deltaY,
      behavior,
    });
  }
}
