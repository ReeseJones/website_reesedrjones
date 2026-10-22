import { describe, it, expect } from "vitest";
import { vector3Converter } from "./vector3_converter";
import type { Vector3Tuple } from "./vector3_converter_types";
import type { Vector3Like } from "../../maths/vector_types";

describe("vector3Converter", () => {
    describe("fromAttribute()", () => {
        it("should parse space-delimited vector string into Vector3Like", () => {
            const result = vector3Converter.fromAttribute("0 5 20");
            expect(result).toEqual({ x: 0, y: 5, z: 20 });
        });

        it("should parse comma-delimited vector string into Vector3Like", () => {
            const result = vector3Converter.fromAttribute("0, 5, 20");
            expect(result).toEqual({ x: 0, y: 5, z: 20 });
        });

        it("should parse mixed comma and space delimited vector string", () => {
            const result = vector3Converter.fromAttribute("1.5,  -2.5   10.25");
            expect(result).toEqual({ x: 1.5, y: -2.5, z: 10.25 });
        });

        it("should fallback NaN or missing components to 0", () => {
            const result1 = vector3Converter.fromAttribute("invalid 5");
            expect(result1).toEqual({ x: 0, y: 5, z: 0 });

            const result2 = vector3Converter.fromAttribute("10");
            expect(result2).toEqual({ x: 10, y: 0, z: 0 });

            const result3 = vector3Converter.fromAttribute("foo bar baz");
            expect(result3).toEqual({ x: 0, y: 0, z: 0 });
        });

        it("should return default fallback { x: 0, y: 0, z: 0 } for null, empty or non-string inputs", () => {
            expect(vector3Converter.fromAttribute(null)).toEqual({ x: 0, y: 0, z: 0 });
            expect(vector3Converter.fromAttribute("")).toEqual({ x: 0, y: 0, z: 0 });
            expect(vector3Converter.fromAttribute("   ")).toEqual({ x: 0, y: 0, z: 0 });
            expect(vector3Converter.fromAttribute(undefined as unknown as string)).toEqual({ x: 0, y: 0, z: 0 });
        });
    });

    describe("toAttribute()", () => {
        describe("Vector3Like objects", () => {
            it("should serialize Vector3Like to space-delimited string", () => {
                const v: Vector3Like = { x: 0, y: 5, z: 20 };
                expect(vector3Converter.toAttribute(v)).toBe("0 5 20");
            });

            it("should serialize negative and decimal numbers in Vector3Like", () => {
                const v: Vector3Like = { x: -1.5, y: 0.25, z: 100 };
                expect(vector3Converter.toAttribute(v)).toBe("-1.5 0.25 100");
            });

            it("should return null for invalid Vector3Like inputs", () => {
                expect(vector3Converter.toAttribute({} as unknown as Vector3Like)).toBeNull();
                expect(vector3Converter.toAttribute({ x: NaN, y: 0, z: 1 })).toBeNull();
                expect(vector3Converter.toAttribute({ x: 1, y: Infinity, z: 0 })).toBeNull();
                expect(vector3Converter.toAttribute({ x: "1", y: 2, z: 3 } as unknown as Vector3Like)).toBeNull();
            });
        });

        describe("Vector3Tuple arrays", () => {
            it("should serialize Vector3Tuple to space-delimited string", () => {
                const v: Vector3Tuple = [0, 5, 20];
                expect(vector3Converter.toAttribute(v)).toBe("0 5 20");
            });

            it("should serialize negative and decimal numbers in Vector3Tuple", () => {
                const v: Vector3Tuple = [-1.5, 0.25, 100];
                expect(vector3Converter.toAttribute(v)).toBe("-1.5 0.25 100");
            });

            it("should return null for invalid Vector3Tuple inputs", () => {
                expect(vector3Converter.toAttribute([] as unknown as Vector3Tuple)).toBeNull();
                expect(vector3Converter.toAttribute([1, 2] as unknown as Vector3Tuple)).toBeNull();
                expect(vector3Converter.toAttribute([NaN, 0, 1])).toBeNull();
                expect(vector3Converter.toAttribute([1, Infinity, 0])).toBeNull();
                expect(vector3Converter.toAttribute(["1", 2, 3] as unknown as Vector3Tuple)).toBeNull();
            });
        });

        describe("general invalid inputs", () => {
            it("should return null for null, undefined, or non-object inputs", () => {
                expect(vector3Converter.toAttribute(null as unknown as Vector3Like)).toBeNull();
                expect(vector3Converter.toAttribute(undefined as unknown as Vector3Like)).toBeNull();
                expect(vector3Converter.toAttribute("not-an-object" as unknown as Vector3Like)).toBeNull();
                expect(vector3Converter.toAttribute(123 as unknown as Vector3Like)).toBeNull();
            });
        });
    });
});
