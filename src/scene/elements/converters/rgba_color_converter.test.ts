import { describe, it, expect } from "vitest";
import { rgbaColorConverter } from "./rgba_color_converter";
import type { NormalizedRgbaTuple } from "./rgba_color_converter_types";

describe("rgbaColorConverter", () => {
    describe("fromAttribute()", () => {
        describe("hex color parsing", () => {
            it("should parse 3-character short hex format (#rgb)", () => {
                const red = rgbaColorConverter.fromAttribute!("#f00");
                expect(red[0]).toBeCloseTo(1, 4);
                expect(red[1]).toBeCloseTo(0, 4);
                expect(red[2]).toBeCloseTo(0, 4);
                expect(red[3]).toBeCloseTo(1, 4);

                const green = rgbaColorConverter.fromAttribute!("#0f0");
                expect(green[0]).toBeCloseTo(0, 4);
                expect(green[1]).toBeCloseTo(1, 4);
                expect(green[2]).toBeCloseTo(0, 4);
                expect(green[3]).toBeCloseTo(1, 4);

                const blue = rgbaColorConverter.fromAttribute!("#00f");
                expect(blue[0]).toBeCloseTo(0, 4);
                expect(blue[1]).toBeCloseTo(0, 4);
                expect(blue[2]).toBeCloseTo(1, 4);
                expect(blue[3]).toBeCloseTo(1, 4);

                const white = rgbaColorConverter.fromAttribute!("#fff");
                expect(white[0]).toBeCloseTo(1, 4);
                expect(white[1]).toBeCloseTo(1, 4);
                expect(white[2]).toBeCloseTo(1, 4);
                expect(white[3]).toBeCloseTo(1, 4);
            });

            it("should parse 4-character short hex with alpha (#rgba)", () => {
                const semiRed = rgbaColorConverter.fromAttribute!("#f008");
                expect(semiRed[0]).toBeCloseTo(1, 4);
                expect(semiRed[1]).toBeCloseTo(0, 4);
                expect(semiRed[2]).toBeCloseTo(0, 4);
                // 0x88 / 255 = 136 / 255 ≈ 0.5333
                expect(semiRed[3]).toBeCloseTo(136 / 255, 4);

                const transparentBlack = rgbaColorConverter.fromAttribute!("#0000");
                expect(transparentBlack).toEqual([0, 0, 0, 0]);
            });

            it("should parse 6-character full hex format (#rrggbb)", () => {
                const green = rgbaColorConverter.fromAttribute!("#00ff00");
                expect(green[0]).toBeCloseTo(0, 4);
                expect(green[1]).toBeCloseTo(1, 4);
                expect(green[2]).toBeCloseTo(0, 4);
                expect(green[3]).toBeCloseTo(1, 4);

                const custom = rgbaColorConverter.fromAttribute!("#1a2b3c");
                expect(custom[0]).toBeCloseTo(0x1a / 255, 4);
                expect(custom[1]).toBeCloseTo(0x2b / 255, 4);
                expect(custom[2]).toBeCloseTo(0x3c / 255, 4);
                expect(custom[3]).toBeCloseTo(1, 4);
            });

            it("should parse 8-character full hex with alpha (#rrggbbaa)", () => {
                const semiBlue = rgbaColorConverter.fromAttribute!("#0000ff80");
                expect(semiBlue[0]).toBeCloseTo(0, 4);
                expect(semiBlue[1]).toBeCloseTo(0, 4);
                expect(semiBlue[2]).toBeCloseTo(1, 4);
                expect(semiBlue[3]).toBeCloseTo(128 / 255, 4);
            });

            it("should handle uppercase hex and leading/trailing whitespace", () => {
                const result = rgbaColorConverter.fromAttribute!("  #FF8800CC  ");
                expect(result[0]).toBeCloseTo(1, 4);
                expect(result[1]).toBeCloseTo(0x88 / 255, 4);
                expect(result[2]).toBeCloseTo(0, 4);
                expect(result[3]).toBeCloseTo(0xcc / 255, 4);
            });

            it("should return fallback [0, 0, 0, 1] for malformed hex strings", () => {
                expect(rgbaColorConverter.fromAttribute!("#12")).toEqual([0, 0, 0, 1]);
                expect(rgbaColorConverter.fromAttribute!("#12345")).toEqual([0, 0, 0, 1]);
                expect(rgbaColorConverter.fromAttribute!("#1234567")).toEqual([0, 0, 0, 1]);
                expect(rgbaColorConverter.fromAttribute!("#123456789")).toEqual([0, 0, 0, 1]);
                expect(rgbaColorConverter.fromAttribute!("#zzzzzz")).toEqual([0, 0, 0, 1]);
            });
        });

        describe("float string parsing", () => {
            it("should parse space-delimited 4-float strings", () => {
                const result = rgbaColorConverter.fromAttribute!("1 0.5 0.25 0.8");
                expect(result).toEqual([1, 0.5, 0.25, 0.8]);
            });

            it("should parse comma-delimited 4-float strings", () => {
                const result = rgbaColorConverter.fromAttribute!("0, 0.2, 0.4, 0.6");
                expect(result).toEqual([0, 0.2, 0.4, 0.6]);
            });

            it("should parse mixed comma and space delimited strings", () => {
                const result = rgbaColorConverter.fromAttribute!("0.1,  0.2   0.3, 0.4");
                expect(result).toEqual([0.1, 0.2, 0.3, 0.4]);
            });

            it("should default alpha to 1.0 when only 3 float components are provided", () => {
                const result = rgbaColorConverter.fromAttribute!("0.2 0.4 0.6");
                expect(result).toEqual([0.2, 0.4, 0.6, 1.0]);
            });

            it("should clamp out-of-range float values to [0, 1]", () => {
                const result = rgbaColorConverter.fromAttribute!("-0.5 1.5 2.0 -1.0");
                expect(result).toEqual([0, 1, 1, 0]);
            });

            it("should fallback invalid numeric float parts to defaults", () => {
                const result = rgbaColorConverter.fromAttribute!("foo 0.5 bar baz");
                expect(result).toEqual([0, 0.5, 0, 1]);
            });
        });

        describe("fallback handling", () => {
            it("should return default fallback [0, 0, 0, 1] for null or empty input", () => {
                expect(rgbaColorConverter.fromAttribute!(null)).toEqual([0, 0, 0, 1]);
                expect(rgbaColorConverter.fromAttribute!("")).toEqual([0, 0, 0, 1]);
                expect(rgbaColorConverter.fromAttribute!("   ")).toEqual([0, 0, 0, 1]);
            });

            it("should return default fallback for non-string inputs", () => {
                expect(rgbaColorConverter.fromAttribute!(undefined as unknown as string)).toEqual([0, 0, 0, 1]);
                expect(rgbaColorConverter.fromAttribute!(123 as unknown as string)).toEqual([0, 0, 0, 1]);
            });

            it("should return default fallback for unparseable strings with fewer than 3 parts", () => {
                expect(rgbaColorConverter.fromAttribute!("hello world")).toEqual([0, 0, 0, 1]);
                expect(rgbaColorConverter.fromAttribute!("notacolor")).toEqual([0, 0, 0, 1]);
            });
        });
    });

    describe("toAttribute()", () => {
        it("should serialize fully opaque color to 6-digit hex (#rrggbb)", () => {
            const red: NormalizedRgbaTuple = [1, 0, 0, 1];
            expect(rgbaColorConverter.toAttribute!(red)).toBe("#ff0000");

            const green: NormalizedRgbaTuple = [0, 1, 0, 1];
            expect(rgbaColorConverter.toAttribute!(green)).toBe("#00ff00");

            const blue: NormalizedRgbaTuple = [0, 0, 1, 1];
            expect(rgbaColorConverter.toAttribute!(blue)).toBe("#0000ff");

            const black: NormalizedRgbaTuple = [0, 0, 0, 1];
            expect(rgbaColorConverter.toAttribute!(black)).toBe("#000000");

            const white: NormalizedRgbaTuple = [1, 1, 1, 1];
            expect(rgbaColorConverter.toAttribute!(white)).toBe("#ffffff");
        });

        it("should serialize non-opaque color to 8-digit hex (#rrggbbaa)", () => {
            const transparentBlack: NormalizedRgbaTuple = [0, 0, 0, 0];
            expect(rgbaColorConverter.toAttribute!(transparentBlack)).toBe("#00000000");

            const semiBlue: NormalizedRgbaTuple = [0, 0, 1, 0.5];
            // Math.round(0.5 * 255) = 128 = 0x80
            expect(rgbaColorConverter.toAttribute!(semiBlue)).toBe("#0000ff80");

            const quarterWhite: NormalizedRgbaTuple = [1, 1, 1, 0.25];
            // Math.round(0.25 * 255) = 64 = 0x40
            expect(rgbaColorConverter.toAttribute!(quarterWhite)).toBe("#ffffff40");
        });

        it("should clamp components outside [0, 1] during serialization", () => {
            const outOfBounds: NormalizedRgbaTuple = [-0.2, 1.5, 0.5, 1];
            expect(rgbaColorConverter.toAttribute!(outOfBounds)).toBe("#00ff80");
        });

        it("should return null for invalid inputs", () => {
            expect(rgbaColorConverter.toAttribute!(null as unknown as NormalizedRgbaTuple)).toBeNull();
            expect(rgbaColorConverter.toAttribute!(undefined as unknown as NormalizedRgbaTuple)).toBeNull();
            expect(rgbaColorConverter.toAttribute!([] as unknown as NormalizedRgbaTuple)).toBeNull();
            expect(rgbaColorConverter.toAttribute!([1, 0, 0] as unknown as NormalizedRgbaTuple)).toBeNull();
            expect(rgbaColorConverter.toAttribute!([NaN, 0, 0, 1])).toBeNull();
            expect(rgbaColorConverter.toAttribute!([1, Infinity, 0, 1])).toBeNull();
            expect(rgbaColorConverter.toAttribute!(["red", 0, 0, 1] as unknown as NormalizedRgbaTuple)).toBeNull();
            expect(rgbaColorConverter.toAttribute!("not-an-array" as unknown as NormalizedRgbaTuple)).toBeNull();
        });
    });
});
