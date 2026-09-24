import { useState, useCallback, useMemo } from "react";
import { useWrappingIndex, wrapIndex } from "../../hooks/use_wrapping_index";

export interface UseCarouselControllerOptions {
  itemCount: number;
  initialIndex?: number;
  loop?: boolean;
}

export interface CarouselControllerBind {
  selectedIndex: number;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  onSelectIndex: (index: number) => void;
}

export interface UseCarouselControllerReturn {
  selectedIndex: number;
  setIndex: (index: number) => void;
  scrollLeft: () => void;
  scrollRight: () => void;
  bind: CarouselControllerBind;
}

/**
 * Manages the active carousel index and navigation controls using useWrappingIndex.
 */
export function useCarouselController({
  itemCount,
  initialIndex = 0,
  loop = true,
}: UseCarouselControllerOptions): UseCarouselControllerReturn {
  const [rawIndex, setRawIndex] = useState(initialIndex);
  const selectedIndex = useWrappingIndex(rawIndex, itemCount);

  const scrollLeft = useCallback(() => {
    setRawIndex((prev) => {
      const current = wrapIndex(prev, itemCount);
      if (!loop && current === 0) return 0;
      return current - 1;
    });
  }, [itemCount, loop]);

  const scrollRight = useCallback(() => {
    setRawIndex((prev) => {
      const current = wrapIndex(prev, itemCount);
      if (!loop && current === itemCount - 1) return itemCount - 1;
      return current + 1;
    });
  }, [itemCount, loop]);

  const setIndex = useCallback(
    (targetIndex: number) => {
      if (!loop && itemCount > 0) {
        setRawIndex(Math.max(0, Math.min(targetIndex, itemCount - 1)));
      } else {
        setRawIndex(targetIndex);
      }
    },
    [itemCount, loop]
  );

  const bind = useMemo<CarouselControllerBind>(
    () => ({
      selectedIndex,
      onScrollLeft: scrollLeft,
      onScrollRight: scrollRight,
      onSelectIndex: setIndex,
    }),
    [selectedIndex, scrollLeft, scrollRight, setIndex]
  );

  return {
    selectedIndex,
    setIndex,
    scrollLeft,
    scrollRight,
    bind,
  };
}
