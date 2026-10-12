import { useCallback, useEffect, useRef } from 'react';
import type { ResizeCallback } from './use_resize_callback_ref_types';

export const useResizeCallbackRef = <T extends HTMLElement>(onResize: ResizeCallback) => {
  const observerRef = useRef<ResizeObserver | null>(null);
  const onResizeRef = useRef<ResizeCallback>(onResize);
  onResizeRef.current = onResize;

  const cleanupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanupObserver;
  }, [cleanupObserver]);

  // Call when element ref is set. Pass to ref={} or handle in existing ref callback.
  const setObserverTarget = useCallback(
    (node: T | null) => {
      cleanupObserver();

      if (!node) {
        return;
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        const boxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
        const width = boxSize ? boxSize.inlineSize : entry.contentRect.width;
        const height = boxSize ? boxSize.blockSize : entry.contentRect.height;

        onResizeRef.current({ width, height }, node);
      });

      observer.observe(node);
      observerRef.current = observer;

      return () => {
        cleanupObserver();
      };
    },
    [cleanupObserver]
  );

  return setObserverTarget;
};