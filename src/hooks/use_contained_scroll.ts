import { useEffect, useRef } from "react";
import {
  scrollIntoContainer,
  ContainedScrollOptions,
} from "../lib/scroll_helpers";

export interface UseContainedScrollOptions extends ContainedScrollOptions {
  /**
   * CSS selector to find the active child element within the container (e.g. "button.active").
   */
  activeSelector?: string;
  /**
   * Value whose change triggers the scroll recalculation (e.g. active index or selected ID).
   */
  trigger?: unknown;
  /**
   * Optional custom resolver to find the target child element instead of using activeSelector.
   */
  getTarget?: (container: HTMLElement) => HTMLElement | null;
}

/**
 * Reusable React hook that scrolls an active child element into view within a container
 * whenever a trigger value changes, without scrolling ancestor containers or the window.
 *
 * @param options - Configuration for container scrolling
 * @returns Ref to attach to the scrollable container element
 */
export function useContainedScroll<T extends HTMLElement = HTMLDivElement>({
  activeSelector = "button.active",
  trigger,
  axis = "x",
  alignment = "nearest",
  behavior,
  getTarget,
}: UseContainedScrollOptions = {}): React.RefObject<T | null> {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const target = getTarget
      ? getTarget(container)
      : activeSelector
      ? (container.querySelector(activeSelector) as HTMLElement | null)
      : null;

    if (target) {
      scrollIntoContainer(container, target, {
        axis,
        alignment,
        behavior,
      });
    }
  }, [trigger, activeSelector, axis, alignment, behavior, getTarget]);

  return containerRef;
}
