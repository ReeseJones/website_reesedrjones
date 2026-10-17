import { describe, it, expect } from "vitest";
import {
    rgbToHex,
    hexToRgb,
    parseRgbaColor,
    rgbaToHex,
    DEFAULT_FALLBACK_RGBA,
    DEFAULT_FALLBACK_RGB,
} from "./colors";
import type { NormalizedRgbaTuple, NormalizedRgbTuple } from "./colors_types";

describe("src/helpers/colors", () => {
    describe("rgbToHex()", () => {
        it("should convert black [0, 0, 0] to #000000", () => {
            expect(rgbToHex([0, 0, 0])).toBe("#000000");
        });

        it("should convert white [1, 1, 1] to #ffffff", () => {
            expect(rgbToHex([1, 1, 1])).toBe("#ffffff");
        });

        it("should convert primary colors accurately", () => {
            expect(rgbToHex([1, 0, 0])).toBe("#ff0000");
            expect(rgbToHex([0, 1, 0])).toBe("#00ff00");
            expect(rgbToHex([0, 0, 1])).toBe("#0000ff");
        });

        it("should clamp values outside [0, 1]", () => {
            expect(rgbToHex([-0.5, 1.5, 0.5])).toBe("#00ff80");
        });
    });

    describe("hexToRgb()", () => {
        it("should convert #000000 to [0, 0, 0]", () => {
            expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
        });

        it("should convert #ffffff to [1, 1, 1]", () => {
            expect(hexToRgb("#ffffff")).toEqual([1, 1, 1]);
        });

        it("should handle hex without leading #", () => {
            expect(hexToRgb("ff0000")).toEqual([1, 0, 0]);
        });

        it("should return DEFAULT_FALLBACK_RGB for invalid hex string", () => {
            expect(hexToRgb("not-a-color")).toEqual(DEFAULT_FALLBACK_RGB);
        });
    });

    describe("parseRgbaColor()", () => {
        describe("hex formats", () => {
            it("should parse 3-digit hex (#rgb) with full opacity", () => {
                const color = parseRgbaColor("#f80");
                expect(color[0]).toBeCloseTo(1.0, 2);
                expect(color[1]).toBeCloseTo(0.533, 2);
                expect(color[2]).toBeCloseTo(0.0, 2);
                expect(color[3]).toBe(1.0);
            });

            it("should parse 4-digit hex (#rgba)", () => {
                const color = parseRgbaColor("#f808");
                expect(color[0]).toBeCloseTo(1.0, 2);
                expect(color[1]).toBeCloseTo(0.533, 2);
                expect(color[2]).toBeCloseTo(0.0, 2);
                expect(color[3]).toBeCloseTo(0.533, 2);
            });

            it("should parse 6-digit hex (#rrggbb) with full opacity", () => {
                const color = parseRgbaColor("#336699");
                expect(color[0]).toBeCloseTo(0.2, 2);
                expect(color[1]).toBeCloseTo(0.4, 2);
                expect(color[2]).toBeCloseTo(0.6, 2);
                expect(color[3]).toBe(1.0);
            });

            it("should parse 8-digit hex (#rrggbbaa)", () => {
                const color = parseRgbaColor("#33669980");
                expect(color[0]).toBeCloseTo(0.2, 2);
                expect(color[1]).toBeCloseTo(0.4, 2);
                expect(color[2]).toBeCloseTo(0.6, 2);
                expect(color[3]).toBeCloseTo(0.502, 2);
            });

            it("should return DEFAULT_FALLBACK_RGBA for invalid hex digits", () => {
                expect(parseRgbaColor("#gggggg")).toEqual(DEFAULT_FALLBACK_RGBA);
            });
        });

        describe("float delimited formats", () => {
            it("should parse 3 space-delimited floats with default alpha 1.0", () => {
                expect(parseRgbaColor("0.2 0.4 0.6")).toEqual([0.2, 0.4, 0.6, 1.0]);
            });

            it("should parse 4 space-delimited floats", () => {
                expect(parseRgbaColor("0.2 0.4 0.6 0.8")).toEqual([0.2, 0.4, 0.6, 0.8]);
            });

            it("should parse comma-delimited floats with arbitrary spacing", () => {
                expect(parseRgbaColor("0.1,  0.5, 0.9, 0.25")).toEqual([0.1, 0.5, 0.9, 0.25]);
            });

            it("should clamp float components to [0, 1]", () => {
                expect(parseRgbaColor("-0.5 1.5 0.5 2.0")).toEqual([0, 1, 0.5, 1]);
            });

            it("should fallback to 0 for non-numeric float parts", () => {
                expect(parseRgbaColor("0.5 abc 0.8")).toEqual([0.5, 0, 0.8, 1.0]);
            });
        });

        describe("fallbacks & edge cases", () => {
            it("should return DEFAULT_FALLBACK_RGBA when input is null", () => {
                expect(parseRgbaColor(null)).toEqual(DEFAULT_FALLBACK_RGBA);
            });

            it("should return DEFAULT_FALLBACK_RGBA when input is empty string", () => {
                expect(parseRgbaColor("   ")).toEqual(DEFAULT_FALLBACK_RGBA);
            });

            it("should return DEFAULT_FALLBACK_RGBA when input is unrecognized format", () => {
                expect(parseRgbaColor("invalid-color-string")).toEqual(DEFAULT_FALLBACK_RGBA);
            });
        });
    });

    describe("rgbaToHex()", () => {
        it("should serialize opaque RGBA into 6-digit hex #rrggbb", () => {
            const white: NormalizedRgbaTuple = [1, 1, 1, 1];
            expect(rgbaToHex(white)).toBe("#ffffff");

            const red: NormalizedRgbaTuple = [1, 0, 0, 1];
            expect(rgbaToHex(red)).toBe("#ff0000");
        });

        it("should serialize translucent RGBA into 8-digit hex #rrggbbaa", () => {
            const semiTransparentBlue: NormalizedRgbaTuple = [0, 0, 1, 0.5];
            expect(rgbaToHex(semiTransparentBlue)).toBe("#0000ff80");
        });

        it("should return null for invalid tuples", () => {
            expect(rgbaToHex(null as unknown as NormalizedRgbaTuple)).toBeNull();
            expect(rgbaToHex([0, 1] as unknown as NormalizedRgbaTuple)).toBeNull();
        });

        it("should return null if tuple contains NaN or non-finite numbers", () => {
            expect(rgbaToHex([NaN, 0, 0, 1])).toBeNull();
            expect(rgbaToHex([0, Infinity, 0, 1])).toBeNull();
        });
    });
});
