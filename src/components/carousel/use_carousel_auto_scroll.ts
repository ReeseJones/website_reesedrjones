import { useEffect, useRef } from "react";

export interface UseCarouselAutoScrollOptions {
  onAdvance: () => void;
  intervalMs?: number;
  paused?: boolean;
}

/**
 * Automatically triggers carousel slide advance on a recurring timer,
 * pausing when paused is true or the browser tab is hidden.
 */
export function useCarouselAutoScroll({
  onAdvance,
  intervalMs = 5000,
  paused = false,
}: UseCarouselAutoScrollOptions): void {
  const onAdvanceRef = useRef(onAdvance);

  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  useEffect(() => {
    if (paused || intervalMs <= 0) {
      return;
    }

    let intervalId: number | null = null;

    const startTimer = () => {
      if (intervalId === null && typeof document !== "undefined" && !document.hidden) {
        intervalId = window.setInterval(() => {
          onAdvanceRef.current();
        }, intervalMs);
      }
    };

    const stopTimer = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    startTimer();

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      stopTimer();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [intervalMs, paused]);
}
