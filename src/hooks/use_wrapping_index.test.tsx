import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { wrapIndex, useWrappingIndex } from "./use_wrapping_index";

describe("wrapIndex()", () => {
    it("returns 0 when maxIndex is 0 or negative", () => {
        expect(wrapIndex(5, 0)).toBe(0);
        expect(wrapIndex(5, -3)).toBe(0);
    });

    it("leaves indices within [0, maxIndex - 1] unchanged", () => {
        expect(wrapIndex(0, 5)).toBe(0);
        expect(wrapIndex(2, 5)).toBe(2);
        expect(wrapIndex(4, 5)).toBe(4);
    });

    it("wraps positive overflow indices correctly", () => {
        expect(wrapIndex(5, 5)).toBe(0);
        expect(wrapIndex(6, 5)).toBe(1);
        expect(wrapIndex(12, 5)).toBe(2);
    });

    it("wraps negative indices correctly", () => {
        expect(wrapIndex(-1, 5)).toBe(4);
        expect(wrapIndex(-5, 5)).toBe(0);
        expect(wrapIndex(-6, 5)).toBe(4);
    });
});

describe("useWrappingIndex()", () => {
    it("returns wrapped index for nominal values", () => {
        const { result } = renderHook(() => useWrappingIndex(2, 5));
        expect(result.current).toBe(2);
    });

    it("updates returned value when props change on rerender", () => {
        const { result, rerender } = renderHook(
            ({ selectedIndex, maxIndex }) => useWrappingIndex(selectedIndex, maxIndex),
            { initialProps: { selectedIndex: -1, maxIndex: 4 } }
        );

        expect(result.current).toBe(3);

        rerender({ selectedIndex: 5, maxIndex: 4 });
        expect(result.current).toBe(1);
    });

    it("returns 0 when maxIndex is zero", () => {
        const { result } = renderHook(() => useWrappingIndex(3, 0));
        expect(result.current).toBe(0);
    });
});
