import { describe, it, expect } from "vitest";
import { vector3Converter } from "./vector3_converter";
import type { Vector3Tuple } from "./vector3_converter_types";

describe("vector3Converter", () => {
    describe("fromAttribute()", () => {
        it("should parse space-delimited vector string", () => {
            const result = vector3Converter.fromAttribute("0 5 20");
            expect(result).toEqual([0, 5, 20]);
        });

        it("should parse comma-delimited vector string", () => {
            const result = vector3Converter.fromAttribute("0, 5, 20");
            expect(result).toEqual([0, 5, 20]);
        });

        it("should parse mixed comma and space delimited vector string", () => {
            const result = vector3Converter.fromAttribute("1.5,  -2.5   10.25");
            expect(result).toEqual([1.5, -2.5, 10.25]);
        });

        it("should fallback NaN or missing components to 0", () => {
            const result1 = vector3Converter.fromAttribute("invalid 5");
            expect(result1).toEqual([0, 5, 0]);

            const result2 = vector3Converter.fromAttribute("10");
            expect(result2).toEqual([10, 0, 0]);

            const result3 = vector3Converter.fromAttribute("foo bar baz");
            expect(result3).toEqual([0, 0, 0]);
        });

        it("should return default fallback [0, 0, 0] for null, empty or non-string inputs", () => {
            expect(vector3Converter.fromAttribute(null)).toEqual([0, 0, 0]);
            expect(vector3Converter.fromAttribute("")).toEqual([0, 0, 0]);
            expect(vector3Converter.fromAttribute("   ")).toEqual([0, 0, 0]);
            expect(vector3Converter.fromAttribute(undefined as unknown as string)).toEqual([0, 0, 0]);
        });
    });

    describe("toAttribute()", () => {
        it("should serialize Vector3Tuple to space-delimited string", () => {
            const v: Vector3Tuple = [0, 5, 20];
            expect(vector3Converter.toAttribute(v)).toBe("0 5 20");
        });

        it("should serialize negative and decimal numbers", () => {
            const v: Vector3Tuple = [-1.5, 0.25, 100];
            expect(vector3Converter.toAttribute(v)).toBe("-1.5 0.25 100");
        });

        it("should return null for invalid inputs", () => {
            expect(vector3Converter.toAttribute(null as unknown as Vector3Tuple)).toBeNull();
            expect(vector3Converter.toAttribute(undefined as unknown as Vector3Tuple)).toBeNull();
            expect(vector3Converter.toAttribute([] as unknown as Vector3Tuple)).toBeNull();
            expect(vector3Converter.toAttribute([1, 2] as unknown as Vector3Tuple)).toBeNull();
            expect(vector3Converter.toAttribute([NaN, 0, 1])).toBeNull();
            expect(vector3Converter.toAttribute([1, Infinity, 0])).toBeNull();
            expect(vector3Converter.toAttribute(["1", 2, 3] as unknown as Vector3Tuple)).toBeNull();
        });
    });
});
