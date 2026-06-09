import { useCallback, useRef } from 'react';

type ResizeCallback = (dimensions: { width: number; height: number }, element: HTMLElement) => void;

export const useResizeCallbackRef = <T extends HTMLElement>(onResize: ResizeCallback) => {
  const observerRef = useRef<ResizeObserver | null>(null);

  // Call when element ref is set. Pass to ref={} or handle in existing ref callback.
  const setObserverTarget = useCallback((node: T | null) => {

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if(!node) {
        return;
    }

    observerRef.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        const boxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;

        const width = boxSize ? boxSize.inlineSize : entry.contentRect.width;
        const height = boxSize ? boxSize.blockSize : entry.contentRect.height;

        onResize({ width, height }, node);
    });

    observerRef.current.observe(node);
  }, [onResize]);

  return setObserverTarget;
};