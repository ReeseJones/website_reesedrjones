import { useMemo } from "react";

/**
 * Pure Euclidean modulo wrapping function.
 * Wraps an arbitrary integer index around a given range [0, maxIndex - 1].
 *
 * @param selectedIndex - The input index (may be negative or out of bounds)
 * @param maxIndex - The upper boundary count (e.g. items.length)
 * @returns The wrapped index within [0, maxIndex - 1], or 0 if maxIndex <= 0
 */
export function wrapIndex(selectedIndex: number, maxIndex: number): number {
  if (maxIndex <= 0) return 0;
  return ((selectedIndex % maxIndex) + maxIndex) % maxIndex;
}

/**
 * Hook that takes a selectedIndex and maxIndex (items.length)
 * and returns the index modded to fit within the 0 to maxIndex - 1 range.
 *
 * @param selectedIndex - The input index
 * @param maxIndex - Total item count (items.length)
 * @returns The memoized wrapped index in [0, maxIndex - 1]
 */
export function useWrappingIndex(
  selectedIndex: number,
  maxIndex: number
): number {
  return useMemo(
    () => wrapIndex(selectedIndex, maxIndex),
    [selectedIndex, maxIndex]
  );
}

export default useWrappingIndex;
