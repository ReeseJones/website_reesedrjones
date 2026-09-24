import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CarouselItem } from "./carousel";
import { wrapIndex } from "../../hooks/use_wrapping_index";
import { validateIndex } from "../../lib/helpers";

export const getWrappedIndex = wrapIndex;


export interface UseCarouselTrackOptions {
  items: CarouselItem[];
  selectedIndex: number;
  animationDurationMs?: number;
}

export interface UseCarouselTrackReturn {
  slotCount: number;
  getSlotItemIndex: (slotIndex: number) => number;
  currentSlot: number;
  isTransitioning: boolean;
  isSilentSnap: boolean;
  trackProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    className: string;
    style: React.CSSProperties;
    onTransitionEnd: (e: React.TransitionEvent<HTMLDivElement>) => void;
  };
  recordAction: (action: "left" | "right" | "select") => void;
}

/**
 * Manages the buffer track slot transitions, silent boundary snapping,
 * and safety fallback timers using wrapping index math instead of array duplication.
 */
export function useCarouselTrack({
  items,
  selectedIndex,
  animationDurationMs = 400,
}: UseCarouselTrackOptions): UseCarouselTrackReturn {
  const hasMultipleItems = items && items.length > 1;
  const itemCount = items?.length ?? 0;
  const slotCount = hasMultipleItems ? itemCount + 2 : itemCount;

  validateIndex(selectedIndex, items, "useCarouselTrack: selectedIndex");

  const getSlotItemIndex = useCallback(
    (slotIndex: number): number => {
      if (!hasMultipleItems) return slotIndex;
      // Slot 0 -> itemCount - 1; Slot 1 -> 0; Slot itemCount + 1 -> 0
      return getWrappedIndex(slotIndex - 1, itemCount);
    },
    [hasMultipleItems, itemCount]
  );

  const [currentSlot, setCurrentSlot] = useState<number>(() =>
    hasMultipleItems ? selectedIndex + 1 : 0
  );
  const [isSilentSnap, setIsSilentSnap] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const prevIndexRef = useRef(selectedIndex);
  const prevItemCountRef = useRef(itemCount);
  const lastActionRef = useRef<"left" | "right" | "select" | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const recordAction = (action: "left" | "right" | "select") => {
    lastActionRef.current = action;
  };

  // Sync track position when selectedIndex or items change
  useEffect(() => {
    const prevIndex = prevIndexRef.current;
    const prevItemCount = prevItemCountRef.current;
    prevIndexRef.current = selectedIndex;
    prevItemCountRef.current = itemCount;

    if (!items || itemCount <= 1) {
      setCurrentSlot(0);
      setIsTransitioning(false);
      setIsSilentSnap(false);
      return;
    }

    if (prevItemCount !== itemCount) {
      setCurrentSlot(selectedIndex + 1);
      setIsTransitioning(false);
      setIsSilentSnap(false);
      return;
    }

    if (prevIndex === selectedIndex) {
      return;
    }

    const action = lastActionRef.current;
    lastActionRef.current = null;

    // Forward wrap (itemCount - 1 -> 0): slides forward to slot itemCount + 1
    const isForwardWrap =
      (action === "right" && itemCount === 2 && prevIndex === 1 && selectedIndex === 0) ||
      (action !== "select" && action !== "left" && prevIndex === itemCount - 1 && selectedIndex === 0);

    // Backward wrap (0 -> itemCount - 1): slides backward to slot 0
    const isBackwardWrap =
      (action === "left" && itemCount === 2 && prevIndex === 0 && selectedIndex === 1) ||
      (action !== "select" && action !== "right" && prevIndex === 0 && selectedIndex === itemCount - 1);

    if (isForwardWrap) {
      setIsSilentSnap(false);
      setIsTransitioning(true);
      setCurrentSlot(itemCount + 1);
    } else if (isBackwardWrap) {
      setIsSilentSnap(false);
      setIsTransitioning(true);
      setCurrentSlot(0);
    } else {
      setIsSilentSnap(false);
      setIsTransitioning(true);
      setCurrentSlot(selectedIndex + 1);
    }
  }, [selectedIndex, itemCount, items]);

  // Handle transition end: silent snapping for boundary cloned slides
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;

    if (itemCount > 1) {
      if (currentSlot === itemCount + 1) {
        // Forward wrap: silently snap to slot 1
        setIsSilentSnap(true);
        setCurrentSlot(1);
        return;
      }
      if (currentSlot === 0) {
        // Backward wrap: silently snap to slot itemCount
        setIsSilentSnap(true);
        setCurrentSlot(itemCount);
        return;
      }
    }

    setIsTransitioning(false);
  };

  // Reset silent snap after DOM paint to restore transitions for subsequent slides
  useEffect(() => {
    if (!isSilentSnap) return;

    const rafId = requestAnimationFrame(() => {
      if (trackRef.current) {
        void trackRef.current.offsetHeight;
      }
      requestAnimationFrame(() => {
        setIsSilentSnap(false);
        setIsTransitioning(false);
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [isSilentSnap]);

  // Safety timer to clear transitioning state if transitionend fails to fire
  useEffect(() => {
    if (!isTransitioning) return;
    const timer = setTimeout(() => {
      if (itemCount > 1) {
        if (currentSlot === itemCount + 1) {
          setIsSilentSnap(true);
          setCurrentSlot(1);
          return;
        }
        if (currentSlot === 0) {
          setIsSilentSnap(true);
          setCurrentSlot(itemCount);
          return;
        }
      }
      setIsTransitioning(false);
      setIsSilentSnap(false);
    }, animationDurationMs + 150);
    return () => clearTimeout(timer);
  }, [isTransitioning, animationDurationMs, currentSlot, itemCount]);

  const trackClasses = ["track", isSilentSnap ? "no-transition" : ""]
    .filter(Boolean)
    .join(" ");

  const trackStyle: React.CSSProperties = {
    transform: `translateX(-${currentSlot * 100}%)`,
    transition: isSilentSnap ? "none" : undefined,
  };

  return {
    slotCount,
    getSlotItemIndex,
    currentSlot,
    isTransitioning,
    isSilentSnap,
    trackProps: {
      ref: trackRef,
      className: trackClasses,
      style: trackStyle,
      onTransitionEnd: handleTransitionEnd,
    },
    recordAction,
  };
}
