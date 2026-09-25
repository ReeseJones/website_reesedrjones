import React, { useCallback, useEffect, useRef, useState } from "react";

export interface CarouselPauseProps {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: (e: React.FocusEvent<any>) => void;
}

export interface UseCarouselAutoScrollOptions {
  onAdvance: () => void;
  intervalMs?: number;
  paused?: boolean;
}

export interface UseCarouselAutoScrollReturn {
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  pauseProps: CarouselPauseProps;
}

/**
 * Automatically triggers carousel slide advance on a recurring timer,
 * pausing when paused is true, when hovered/focused, or when the browser tab is hidden.
 */
export function useCarouselAutoScroll({
  onAdvance,
  intervalMs = 5000,
  paused = false,
}: UseCarouselAutoScrollOptions): UseCarouselAutoScrollReturn {
  const [isInternalPaused, setIsInternalPaused] = useState(false);
  const onAdvanceRef = useRef(onAdvance);

  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  const pause = useCallback(() => {
    setIsInternalPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsInternalPaused(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsInternalPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsInternalPaused(false);
  }, []);

  const handleFocus = useCallback(() => {
    setIsInternalPaused(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<any>) => {
    // Only resume if focus leaves the container entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsInternalPaused(false);
    }
  }, []);

  const effectivePaused = paused || isInternalPaused;

  useEffect(() => {
    if (effectivePaused || intervalMs <= 0) {
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
  }, [intervalMs, effectivePaused]);

  return {
    isPaused: effectivePaused,
    pause,
    resume,
    pauseProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}
