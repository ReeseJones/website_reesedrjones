import { useRef } from "react";

export interface UseSwipeGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minDistance?: number; // default: 50px
}

export interface SwipeGestureHandlers {
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}

/**
 * Tracks touch gestures without triggering component re-renders,
 * evaluating horizontal vector dominance and minimum distance thresholds.
 */
export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  minDistance = 50,
}: UseSwipeGesturesOptions): SwipeGestureHandlers {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      touchEndRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      touchEndRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;

    touchStartRef.current = null;
    touchEndRef.current = null;

    if (Math.abs(deltaX) < minDistance) {
      return;
    }

    // Ensure horizontal gesture dominance over vertical page scrolling
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (deltaX < -minDistance) {
      onSwipeLeft?.();
    } else if (deltaX > minDistance) {
      onSwipeRight?.();
    }
  };

  const onTouchCancel = () => {
    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}
