import { describe, it, expect } from "vitest";
import { vector2Converter } from "./vector2_converter";
import type { Vector2Tuple } from "./vector2_converter_types";
import type { Vector2Like } from "../../maths/vector_types";

describe("vector2Converter", () => {
    describe("fromAttribute()", () => {
        it("should parse space-delimited vector string into Vector2Like", () => {
            const result = vector2Converter.fromAttribute("10 20");
            expect(result).toEqual({ x: 10, y: 20 });
        });

        it("should parse comma-delimited vector string with space into Vector2Like", () => {
            const result = vector2Converter.fromAttribute("10, 20");
            expect(result).toEqual({ x: 10, y: 20 });
        });

        it("should parse comma-delimited vector string without space into Vector2Like", () => {
            const result = vector2Converter.fromAttribute("10,20");
            expect(result).toEqual({ x: 10, y: 20 });
        });

        it("should parse vector string with leading, trailing, and redundant whitespace", () => {
            const result = vector2Converter.fromAttribute("  5.5   -3.2  ");
            expect(result).toEqual({ x: 5.5, y: -3.2 });
        });

        it("should parse negative and float coordinates correctly", () => {
            const result = vector2Converter.fromAttribute("-10.5, -20.25");
            expect(result).toEqual({ x: -10.5, y: -20.25 });
        });

        it("should fallback missing second component to 0 when only a single number is provided", () => {
            const result = vector2Converter.fromAttribute("10");
            expect(result).toEqual({ x: 10, y: 0 });
        });

        it("should fallback non-numeric components to 0", () => {
            const result = vector2Converter.fromAttribute("abc def");
            expect(result).toEqual({ x: 0, y: 0 });

            const partialResult = vector2Converter.fromAttribute("15 xyz");
            expect(partialResult).toEqual({ x: 15, y: 0 });
        });

        it("should return default fallback { x: 0, y: 0 } for null, empty, or whitespace-only strings", () => {
            expect(vector2Converter.fromAttribute(null)).toEqual({ x: 0, y: 0 });
            expect(vector2Converter.fromAttribute("")).toEqual({ x: 0, y: 0 });
            expect(vector2Converter.fromAttribute("   ")).toEqual({ x: 0, y: 0 });
        });

        it("should return default fallback { x: 0, y: 0 } for non-string inputs", () => {
            expect(vector2Converter.fromAttribute(undefined as unknown as string)).toEqual({ x: 0, y: 0 });
            expect(vector2Converter.fromAttribute(123 as unknown as string)).toEqual({ x: 0, y: 0 });
            expect(vector2Converter.fromAttribute({} as unknown as string)).toEqual({ x: 0, y: 0 });
        });
    });

    describe("toAttribute()", () => {
        describe("Vector2Like objects", () => {
            it("should serialize Vector2Like to space-delimited string", () => {
                const v: Vector2Like = { x: 10, y: 20 };
                expect(vector2Converter.toAttribute(v)).toBe("10 20");
            });

            it("should serialize negative and decimal numbers in Vector2Like", () => {
                const v: Vector2Like = { x: -5.5, y: 3.25 };
                expect(vector2Converter.toAttribute(v)).toBe("-5.5 3.25");
            });

            it("should return null for invalid Vector2Like inputs", () => {
                expect(vector2Converter.toAttribute({} as unknown as Vector2Like)).toBeNull();
                expect(vector2Converter.toAttribute({ x: NaN, y: 0 })).toBeNull();
                expect(vector2Converter.toAttribute({ x: 1, y: Infinity })).toBeNull();
                expect(vector2Converter.toAttribute({ x: "10", y: 20 } as unknown as Vector2Like)).toBeNull();
            });
        });

        describe("Vector2Tuple arrays", () => {
            it("should serialize Vector2Tuple to space-delimited string", () => {
                const v: Vector2Tuple = [10, 20];
                expect(vector2Converter.toAttribute(v)).toBe("10 20");
            });

            it("should serialize negative and decimal numbers in Vector2Tuple", () => {
                const v: Vector2Tuple = [-5.5, 3.25];
                expect(vector2Converter.toAttribute(v)).toBe("-5.5 3.25");
            });

            it("should return null for invalid Vector2Tuple inputs", () => {
                expect(vector2Converter.toAttribute([] as unknown as Vector2Tuple)).toBeNull();
                expect(vector2Converter.toAttribute([10] as unknown as Vector2Tuple)).toBeNull();
                expect(vector2Converter.toAttribute([NaN, 20])).toBeNull();
                expect(vector2Converter.toAttribute([10, Infinity])).toBeNull();
                expect(vector2Converter.toAttribute(["10", 20] as unknown as Vector2Tuple)).toBeNull();
            });
        });

        describe("general invalid inputs", () => {
            it("should return null for null, undefined, or non-object inputs", () => {
                expect(vector2Converter.toAttribute(null as unknown as Vector2Like)).toBeNull();
                expect(vector2Converter.toAttribute(undefined as unknown as Vector2Like)).toBeNull();
                expect(vector2Converter.toAttribute("not-an-object" as unknown as Vector2Like)).toBeNull();
                expect(vector2Converter.toAttribute(123 as unknown as Vector2Like)).toBeNull();
            });
        });
    });
});
