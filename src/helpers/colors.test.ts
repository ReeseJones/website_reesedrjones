import { describe, it, expect } from "vitest";
import {
    rgbToHex,
    hexToRgb,
    parseRgbaColor,
    rgbaToHex,
    rgbLikeToHex,
    rgbaLikeToHex,
    hexToRgbLike,
    hexToRgbaLike,
    rgbLikeToTuple,
    rgbaLikeToTuple,
    tupleToRgbLike,
    tupleToRgbaLike,
    DEFAULT_FALLBACK_RGBA,
    DEFAULT_FALLBACK_RGB,
    DEFAULT_FALLBACK_RGB_LIKE,
    DEFAULT_FALLBACK_RGBA_LIKE,
} from "./colors";
import type { NormalizedRgbaTuple, NormalizedRgbTuple, RgbLike, RgbaLike } from "./colors_types";

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

    describe("rgbLikeToHex()", () => {
        it("should convert black { r: 0, g: 0, b: 0 } to #000000", () => {
            expect(rgbLikeToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
        });

        it("should convert white { r: 1, g: 1, b: 1 } to #ffffff", () => {
            expect(rgbLikeToHex({ r: 1, g: 1, b: 1 })).toBe("#ffffff");
        });

        it("should convert primary colors accurately", () => {
            expect(rgbLikeToHex({ r: 1, g: 0, b: 0 })).toBe("#ff0000");
            expect(rgbLikeToHex({ r: 0, g: 1, b: 0 })).toBe("#00ff00");
            expect(rgbLikeToHex({ r: 0, g: 0, b: 1 })).toBe("#0000ff");
        });

        it("should clamp values outside [0, 1]", () => {
            expect(rgbLikeToHex({ r: -0.5, g: 1.5, b: 0.5 })).toBe("#00ff80");
        });

        it("should fallback to white for null or non-object input", () => {
            expect(rgbLikeToHex(null as unknown as RgbLike)).toBe("#ffffff");
            expect(rgbLikeToHex(undefined as unknown as RgbLike)).toBe("#ffffff");
        });

        it("should fallback non-finite channels to 1", () => {
            expect(rgbLikeToHex({ r: NaN, g: 0, b: 0 })).toBe("#ff0000");
        });
    });

    describe("rgbaLikeToHex()", () => {
        it("should serialize opaque RGBA into 6-digit hex #rrggbb", () => {
            expect(rgbaLikeToHex({ r: 1, g: 1, b: 1, a: 1 })).toBe("#ffffff");
            expect(rgbaLikeToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe("#ff0000");
        });

        it("should serialize translucent RGBA into 8-digit hex #rrggbbaa", () => {
            expect(rgbaLikeToHex({ r: 0, g: 0, b: 1, a: 0.5 })).toBe("#0000ff80");
        });

        it("should clamp values outside [0, 1]", () => {
            expect(rgbaLikeToHex({ r: -0.5, g: 1.5, b: 0.5, a: 2 })).toBe("#00ff80");
        });

        it("should fallback to black #000000 for null or non-object input", () => {
            expect(rgbaLikeToHex(null as unknown as RgbaLike)).toBe("#000000");
            expect(rgbaLikeToHex(undefined as unknown as RgbaLike)).toBe("#000000");
        });

        it("should fallback non-finite channels safely", () => {
            expect(rgbaLikeToHex({ r: 1, g: NaN, b: 0, a: 1 })).toBe("#ff0000");
        });
    });

    describe("hexToRgbLike()", () => {
        it("should convert #000000 to { r: 0, g: 0, b: 0 }", () => {
            expect(hexToRgbLike("#000000")).toEqual({ r: 0, g: 0, b: 0 });
        });

        it("should convert #ffffff to { r: 1, g: 1, b: 1 }", () => {
            expect(hexToRgbLike("#ffffff")).toEqual({ r: 1, g: 1, b: 1 });
        });

        it("should handle hex without leading #", () => {
            expect(hexToRgbLike("ff0000")).toEqual({ r: 1, g: 0, b: 0 });
        });

        it("should handle 3-digit short hex (#rgb and rgb)", () => {
            expect(hexToRgbLike("#f00")).toEqual({ r: 1, g: 0, b: 0 });
            expect(hexToRgbLike("0f0")).toEqual({ r: 0, g: 1, b: 0 });
        });

        it("should parse intermediate colors accurately", () => {
            const color = hexToRgbLike("#336699");
            expect(color.r).toBeCloseTo(0.2, 2);
            expect(color.g).toBeCloseTo(0.4, 2);
            expect(color.b).toBeCloseTo(0.6, 2);
        });

        it("should return DEFAULT_FALLBACK_RGB_LIKE for invalid hex string", () => {
            expect(hexToRgbLike("not-a-color")).toEqual(DEFAULT_FALLBACK_RGB_LIKE);
            expect(hexToRgbLike("#gggggg")).toEqual(DEFAULT_FALLBACK_RGB_LIKE);
            expect(hexToRgbLike("")).toEqual(DEFAULT_FALLBACK_RGB_LIKE);
            expect(hexToRgbLike(null as unknown as string)).toEqual(DEFAULT_FALLBACK_RGB_LIKE);
        });
    });

    describe("hexToRgbaLike()", () => {
        it("should parse 3-digit hex (#rgb) with full opacity", () => {
            const color = hexToRgbaLike("#f80");
            expect(color.r).toBeCloseTo(1.0, 2);
            expect(color.g).toBeCloseTo(0.533, 2);
            expect(color.b).toBeCloseTo(0.0, 2);
            expect(color.a).toBe(1.0);
        });

        it("should parse 4-digit hex (#rgba)", () => {
            const color = hexToRgbaLike("#f808");
            expect(color.r).toBeCloseTo(1.0, 2);
            expect(color.g).toBeCloseTo(0.533, 2);
            expect(color.b).toBeCloseTo(0.0, 2);
            expect(color.a).toBeCloseTo(0.533, 2);
        });

        it("should parse 6-digit hex (#rrggbb) with full opacity", () => {
            const color = hexToRgbaLike("#336699");
            expect(color.r).toBeCloseTo(0.2, 2);
            expect(color.g).toBeCloseTo(0.4, 2);
            expect(color.b).toBeCloseTo(0.6, 2);
            expect(color.a).toBe(1.0);
        });

        it("should parse 8-digit hex (#rrggbbaa)", () => {
            const color = hexToRgbaLike("#33669980");
            expect(color.r).toBeCloseTo(0.2, 2);
            expect(color.g).toBeCloseTo(0.4, 2);
            expect(color.b).toBeCloseTo(0.6, 2);
            expect(color.a).toBeCloseTo(0.502, 2);
        });

        it("should handle hex without leading #", () => {
            const color = hexToRgbaLike("336699");
            expect(color.r).toBeCloseTo(0.2, 2);
            expect(color.g).toBeCloseTo(0.4, 2);
            expect(color.b).toBeCloseTo(0.6, 2);
            expect(color.a).toBe(1.0);
        });

        it("should return DEFAULT_FALLBACK_RGBA_LIKE for invalid input", () => {
            expect(hexToRgbaLike("invalid-color")).toEqual(DEFAULT_FALLBACK_RGBA_LIKE);
            expect(hexToRgbaLike("")).toEqual(DEFAULT_FALLBACK_RGBA_LIKE);
            expect(hexToRgbaLike(null as unknown as string)).toEqual(DEFAULT_FALLBACK_RGBA_LIKE);
        });
    });

    describe("rgbLikeToTuple()", () => {
        it("should convert an RgbLike object to a 3-element tuple", () => {
            expect(rgbLikeToTuple({ r: 1, g: 0.5, b: 0 })).toEqual([1, 0.5, 0]);
        });

        it("should clamp values outside [0, 1]", () => {
            expect(rgbLikeToTuple({ r: -1, g: 2, b: 0.5 })).toEqual([0, 1, 0.5]);
        });

        it("should return DEFAULT_FALLBACK_RGB for null or non-object", () => {
            expect(rgbLikeToTuple(null as unknown as RgbLike)).toEqual(DEFAULT_FALLBACK_RGB);
            expect(rgbLikeToTuple(undefined as unknown as RgbLike)).toEqual(DEFAULT_FALLBACK_RGB);
        });

        it("should fallback non-finite channel numbers to 1", () => {
            expect(rgbLikeToTuple({ r: NaN, g: 0.5, b: Infinity })).toEqual([1, 0.5, 1]);
        });
    });

    describe("rgbaLikeToTuple()", () => {
        it("should convert an RgbaLike object to a 4-element tuple", () => {
            expect(rgbaLikeToTuple({ r: 0.2, g: 0.4, b: 0.6, a: 0.8 })).toEqual([0.2, 0.4, 0.6, 0.8]);
        });

        it("should clamp values outside [0, 1]", () => {
            expect(rgbaLikeToTuple({ r: -1, g: 2, b: 0.5, a: 3 })).toEqual([0, 1, 0.5, 1]);
        });

        it("should return DEFAULT_FALLBACK_RGBA for null or non-object", () => {
            expect(rgbaLikeToTuple(null as unknown as RgbaLike)).toEqual(DEFAULT_FALLBACK_RGBA);
            expect(rgbaLikeToTuple(undefined as unknown as RgbaLike)).toEqual(DEFAULT_FALLBACK_RGBA);
        });

        it("should fallback non-finite channels safely (0 for RGB, 1 for Alpha)", () => {
            expect(rgbaLikeToTuple({ r: NaN, g: 0.5, b: Infinity, a: NaN })).toEqual([0, 0.5, 0, 1]);
        });
    });

    describe("tupleToRgbLike()", () => {
        it("should convert a 3-element tuple to an RgbLike object", () => {
            expect(tupleToRgbLike([1, 0.5, 0])).toEqual({ r: 1, g: 0.5, b: 0 });
        });

        it("should clamp values outside [0, 1]", () => {
            expect(tupleToRgbLike([-1, 2, 0.5])).toEqual({ r: 0, g: 1, b: 0.5 });
        });

        it("should return DEFAULT_FALLBACK_RGB_LIKE for invalid or truncated tuples", () => {
            expect(tupleToRgbLike(null as unknown as NormalizedRgbTuple)).toEqual(DEFAULT_FALLBACK_RGB_LIKE);
            expect(tupleToRgbLike([0, 1] as unknown as NormalizedRgbTuple)).toEqual(DEFAULT_FALLBACK_RGB_LIKE);
        });

        it("should fallback non-finite numbers to 1", () => {
            expect(tupleToRgbLike([NaN, 0.5, Infinity])).toEqual({ r: 1, g: 0.5, b: 1 });
        });
    });

    describe("tupleToRgbaLike()", () => {
        it("should convert a 4-element tuple to an RgbaLike object", () => {
            expect(tupleToRgbaLike([0.2, 0.4, 0.6, 0.8])).toEqual({ r: 0.2, g: 0.4, b: 0.6, a: 0.8 });
        });

        it("should clamp values outside [0, 1]", () => {
            expect(tupleToRgbaLike([-1, 2, 0.5, 3])).toEqual({ r: 0, g: 1, b: 0.5, a: 1 });
        });

        it("should return DEFAULT_FALLBACK_RGBA_LIKE for invalid or truncated tuples", () => {
            expect(tupleToRgbaLike(null as unknown as NormalizedRgbaTuple)).toEqual(DEFAULT_FALLBACK_RGBA_LIKE);
            expect(tupleToRgbaLike([0.2, 0.4, 0.6] as unknown as NormalizedRgbaTuple)).toEqual(
                DEFAULT_FALLBACK_RGBA_LIKE
            );
        });

        it("should fallback non-finite numbers safely (0 for RGB, 1 for Alpha)", () => {
            expect(tupleToRgbaLike([NaN, 0.5, Infinity, NaN])).toEqual({ r: 0, g: 0.5, b: 0, a: 1 });
        });
    });
});
