import { describe, it, expect } from "vitest";
import { rgbaColorConverter } from "./rgba_color_converter";
import type { RgbaLike } from "../../helpers/colors_types";

describe("rgbaColorConverter", () => {
    describe("fromAttribute()", () => {
        describe("hex color parsing", () => {
            it("should parse 3-character short hex format (#rgb)", () => {
                const red = rgbaColorConverter.fromAttribute("#f00");
                expect(red.r).toBeCloseTo(1, 4);
                expect(red.g).toBeCloseTo(0, 4);
                expect(red.b).toBeCloseTo(0, 4);
                expect(red.a).toBeCloseTo(1, 4);

                const green = rgbaColorConverter.fromAttribute("#0f0");
                expect(green.r).toBeCloseTo(0, 4);
                expect(green.g).toBeCloseTo(1, 4);
                expect(green.b).toBeCloseTo(0, 4);
                expect(green.a).toBeCloseTo(1, 4);

                const blue = rgbaColorConverter.fromAttribute("#00f");
                expect(blue.r).toBeCloseTo(0, 4);
                expect(blue.g).toBeCloseTo(0, 4);
                expect(blue.b).toBeCloseTo(1, 4);
                expect(blue.a).toBeCloseTo(1, 4);

                const white = rgbaColorConverter.fromAttribute("#fff");
                expect(white.r).toBeCloseTo(1, 4);
                expect(white.g).toBeCloseTo(1, 4);
                expect(white.b).toBeCloseTo(1, 4);
                expect(white.a).toBeCloseTo(1, 4);
            });

            it("should parse 4-character short hex with alpha (#rgba)", () => {
                const semiRed = rgbaColorConverter.fromAttribute("#f008");
                expect(semiRed.r).toBeCloseTo(1, 4);
                expect(semiRed.g).toBeCloseTo(0, 4);
                expect(semiRed.b).toBeCloseTo(0, 4);
                // 0x88 / 255 = 136 / 255 ≈ 0.5333
                expect(semiRed.a).toBeCloseTo(136 / 255, 4);

                const transparentBlack = rgbaColorConverter.fromAttribute("#0000");
                expect(transparentBlack).toEqual({ r: 0, g: 0, b: 0, a: 0 });
            });

            it("should parse 6-character full hex format (#rrggbb)", () => {
                const green = rgbaColorConverter.fromAttribute("#00ff00");
                expect(green.r).toBeCloseTo(0, 4);
                expect(green.g).toBeCloseTo(1, 4);
                expect(green.b).toBeCloseTo(0, 4);
                expect(green.a).toBeCloseTo(1, 4);

                const custom = rgbaColorConverter.fromAttribute("#1a2b3c");
                expect(custom.r).toBeCloseTo(0x1a / 255, 4);
                expect(custom.g).toBeCloseTo(0x2b / 255, 4);
                expect(custom.b).toBeCloseTo(0x3c / 255, 4);
                expect(custom.a).toBeCloseTo(1, 4);
            });

            it("should parse 8-character full hex with alpha (#rrggbbaa)", () => {
                const semiBlue = rgbaColorConverter.fromAttribute("#0000ff80");
                expect(semiBlue.r).toBeCloseTo(0, 4);
                expect(semiBlue.g).toBeCloseTo(0, 4);
                expect(semiBlue.b).toBeCloseTo(1, 4);
                expect(semiBlue.a).toBeCloseTo(128 / 255, 4);
            });

            it("should handle uppercase hex and leading/trailing whitespace", () => {
                const result = rgbaColorConverter.fromAttribute("  #FF8800CC  ");
                expect(result.r).toBeCloseTo(1, 4);
                expect(result.g).toBeCloseTo(0x88 / 255, 4);
                expect(result.b).toBeCloseTo(0, 4);
                expect(result.a).toBeCloseTo(0xcc / 255, 4);
            });

            it("should return fallback { r: 0, g: 0, b: 0, a: 1 } for malformed hex strings", () => {
                expect(rgbaColorConverter.fromAttribute("#12")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
                expect(rgbaColorConverter.fromAttribute("#12345")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
                expect(rgbaColorConverter.fromAttribute("#1234567")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
                expect(rgbaColorConverter.fromAttribute("#123456789")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
                expect(rgbaColorConverter.fromAttribute("#zzzzzz")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
            });
        });

        describe("float string parsing", () => {
            it("should parse space-delimited 4-float strings", () => {
                const result = rgbaColorConverter.fromAttribute("1 0.5 0.25 0.8");
                expect(result).toEqual({ r: 1, g: 0.5, b: 0.25, a: 0.8 });
            });

            it("should parse comma-delimited 4-float strings", () => {
                const result = rgbaColorConverter.fromAttribute("0, 0.2, 0.4, 0.6");
                expect(result).toEqual({ r: 0, g: 0.2, b: 0.4, a: 0.6 });
            });

            it("should parse mixed comma and space delimited strings", () => {
                const result = rgbaColorConverter.fromAttribute("0.1,  0.2   0.3, 0.4");
                expect(result).toEqual({ r: 0.1, g: 0.2, b: 0.3, a: 0.4 });
            });

            it("should default alpha to 1.0 when only 3 float components are provided", () => {
                const result = rgbaColorConverter.fromAttribute("0.2 0.4 0.6");
                expect(result).toEqual({ r: 0.2, g: 0.4, b: 0.6, a: 1.0 });
            });

            it("should clamp out-of-range float values to [0, 1]", () => {
                const result = rgbaColorConverter.fromAttribute("-0.5 1.5 2.0 -1.0");
                expect(result).toEqual({ r: 0, g: 1, b: 1, a: 0 });
            });

            it("should fallback invalid numeric float parts to defaults", () => {
                const result = rgbaColorConverter.fromAttribute("foo 0.5 bar baz");
                expect(result).toEqual({ r: 0, g: 0.5, b: 0, a: 1 });
            });
        });

        describe("fallback handling", () => {
            it("should return default fallback { r: 0, g: 0, b: 0, a: 1 } for null or empty input", () => {
                expect(rgbaColorConverter.fromAttribute(null)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
                expect(rgbaColorConverter.fromAttribute("")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
                expect(rgbaColorConverter.fromAttribute("   ")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
            });

            it("should return default fallback for non-string inputs", () => {
                expect(rgbaColorConverter.fromAttribute(undefined as unknown as string)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
                expect(rgbaColorConverter.fromAttribute(123 as unknown as string)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
            });

            it("should return default fallback for unparseable strings with fewer than 3 parts", () => {
                expect(rgbaColorConverter.fromAttribute("hello world")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
                expect(rgbaColorConverter.fromAttribute("notacolor")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
            });
        });
    });

    describe("toAttribute()", () => {
        it("should serialize fully opaque color to 6-digit hex (#rrggbb)", () => {
            const red: RgbaLike = { r: 1, g: 0, b: 0, a: 1 };
            expect(rgbaColorConverter.toAttribute(red)).toBe("#ff0000");

            const green: RgbaLike = { r: 0, g: 1, b: 0, a: 1 };
            expect(rgbaColorConverter.toAttribute(green)).toBe("#00ff00");

            const blue: RgbaLike = { r: 0, g: 0, b: 1, a: 1 };
            expect(rgbaColorConverter.toAttribute(blue)).toBe("#0000ff");

            const black: RgbaLike = { r: 0, g: 0, b: 0, a: 1 };
            expect(rgbaColorConverter.toAttribute(black)).toBe("#000000");

            const white: RgbaLike = { r: 1, g: 1, b: 1, a: 1 };
            expect(rgbaColorConverter.toAttribute(white)).toBe("#ffffff");
        });

        it("should serialize non-opaque color to 8-digit hex (#rrggbbaa)", () => {
            const transparentBlack: RgbaLike = { r: 0, g: 0, b: 0, a: 0 };
            expect(rgbaColorConverter.toAttribute(transparentBlack)).toBe("#00000000");

            const semiBlue: RgbaLike = { r: 0, g: 0, b: 1, a: 0.5 };
            // Math.round(0.5 * 255) = 128 = 0x80
            expect(rgbaColorConverter.toAttribute(semiBlue)).toBe("#0000ff80");

            const quarterWhite: RgbaLike = { r: 1, g: 1, b: 1, a: 0.25 };
            // Math.round(0.25 * 255) = 64 = 0x40
            expect(rgbaColorConverter.toAttribute(quarterWhite)).toBe("#ffffff40");
        });

        it("should clamp components outside [0, 1] during serialization", () => {
            const outOfBounds: RgbaLike = { r: -0.2, g: 1.5, b: 0.5, a: 1 };
            expect(rgbaColorConverter.toAttribute(outOfBounds)).toBe("#00ff80");
        });

        it("should handle invalid inputs with default fallback black (#000000)", () => {
            expect(rgbaColorConverter.toAttribute(null as unknown as RgbaLike)).toBe("#000000");
            expect(rgbaColorConverter.toAttribute(undefined as unknown as RgbaLike)).toBe("#000000");
            expect(rgbaColorConverter.toAttribute({} as unknown as RgbaLike)).toBe("#000000");
            expect(rgbaColorConverter.toAttribute({ r: NaN, g: 0, b: 0, a: 1 })).toBe("#000000");
            expect(rgbaColorConverter.toAttribute({ r: 1, g: Infinity, b: 0, a: 1 })).toBe("#ff0000");
            expect(rgbaColorConverter.toAttribute("not-an-object" as unknown as RgbaLike)).toBe("#000000");
        });
    });
});
