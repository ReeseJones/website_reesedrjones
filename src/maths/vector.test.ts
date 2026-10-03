import { describe, it, expect } from "vitest";
import {
    createVector3,
    createVector2,
    isVector3Like,
    vector3ToFloat32Array,
    vector3FromFloat32Array,
    add,
    subtract,
    scale,
    length,
    distance,
    dot,
    cross,
    normalize,
    lerp,
} from "./vector";

describe("vector math", () => {
    describe("createVector3() and createVector2()", () => {
        it("should create 3D vector with defaults and custom coordinates", () => {
            expect(createVector3()).toEqual({ x: 0, y: 0, z: 0 });
            expect(createVector3(1, -2, 3)).toEqual({ x: 1, y: -2, z: 3 });
        });

        it("should create 2D vector with defaults and custom coordinates", () => {
            expect(createVector2()).toEqual({ x: 0, y: 0 });
            expect(createVector2(4, 5)).toEqual({ x: 4, y: 5 });
        });
    });

    describe("isVector3Like()", () => {
        it("should identify 3D vector objects", () => {
            expect(isVector3Like({ x: 1, y: 2, z: 3 })).toBe(true);
            expect(isVector3Like({ x: 1, y: 2 })).toBe(false);
            expect(isVector3Like(null)).toBe(false);
            expect(isVector3Like("not-a-vector")).toBe(false);
        });
    });

    describe("vector3ToFloat32Array() & vector3FromFloat32Array()", () => {
        it("should serialize Vector3Like into Float32Array at specified offset", () => {
            const v = { x: 10, y: 20, z: 30 };
            const arr = new Float32Array(5);
            vector3ToFloat32Array(v, arr, 2);

            expect(arr[2]).toBe(10);
            expect(arr[3]).toBe(20);
            expect(arr[4]).toBe(30);
        });

        it("should deserialize Vector3Like from array buffer", () => {
            const arr = [0, 99, 88, 77, 0];
            const v = vector3FromFloat32Array(arr, 1);

            expect(v).toEqual({ x: 99, y: 88, z: 77 });
        });
    });

    describe("add()", () => {
        it("should add two 3D vectors", () => {
            const a = { x: 1, y: 2, z: 3 };
            const b = { x: 4, y: 5, z: 6 };
            expect(add(a, b)).toEqual({ x: 5, y: 7, z: 9 });
        });

        it("should add into pre-allocated out vector", () => {
            const a = { x: 1, y: 2, z: 3 };
            const b = { x: 4, y: 5, z: 6 };
            const out = { x: 0, y: 0, z: 0 };
            const result = add(a, b, out);

            expect(result).toBe(out);
            expect(out).toEqual({ x: 5, y: 7, z: 9 });
        });
    });

    describe("subtract()", () => {
        it("should subtract two 3D vectors", () => {
            const a = { x: 10, y: 20, z: 30 };
            const b = { x: 1, y: 2, z: 3 };
            expect(subtract(a, b)).toEqual({ x: 9, y: 18, z: 27 });
        });
    });

    describe("scale()", () => {
        it("should scale vector uniformly by scalar number", () => {
            const v = { x: 2, y: -3, z: 4 };
            expect(scale(v, 2.5)).toEqual({ x: 5, y: -7.5, z: 10 });
        });

        it("should handle scale by zero", () => {
            const v = { x: 2, y: 3, z: 4 };
            expect(scale(v, 0)).toEqual({ x: 0, y: 0, z: 0 });
        });
    });

    describe("length()", () => {
        it("should compute Euclidean length of 3D vector", () => {
            expect(length({ x: 3, y: 4, z: 0 })).toBe(5);
            expect(length({ x: 0, y: 0, z: 0 })).toBe(0);
        });

        it("should compute Euclidean length of 2D vector", () => {
            expect(length({ x: 3, y: 4 })).toBe(5);
        });
    });

    describe("distance()", () => {
        it("should compute Euclidean distance between two 3D points", () => {
            const p1 = { x: 1, y: 1, z: 1 };
            const p2 = { x: 4, y: 5, z: 1 };
            expect(distance(p1, p2)).toBe(5);
        });
    });

    describe("dot()", () => {
        it("should calculate dot product", () => {
            const a = { x: 1, y: 2, z: 3 };
            const b = { x: 4, y: -5, z: 6 };
            expect(dot(a, b)).toBe(12);
        });

        it("should return zero for perpendicular vectors", () => {
            expect(dot({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0);
        });
    });

    describe("cross()", () => {
        it("should compute perpendicular vector via cross product", () => {
            const x = { x: 1, y: 0, z: 0 };
            const y = { x: 0, y: 1, z: 0 };
            const z = cross(x, y);

            expect(z).toEqual({ x: 0, y: 0, z: 1 });
        });
    });

    describe("normalize()", () => {
        it("should normalize non-zero vector to length 1.0", () => {
            const v = { x: 3, y: 0, z: 4 };
            const unit = normalize(v);

            expect(length(unit)).toBeCloseTo(1.0, 5);
            expect(unit.x).toBeCloseTo(0.6, 5);
            expect(unit.z).toBeCloseTo(0.8, 5);
        });

        it("should safely return zero vector when input length is zero", () => {
            const zero = { x: 0, y: 0, z: 0 };
            const result = normalize(zero);

            expect(result).toEqual({ x: 0, y: 0, z: 0 });
            expect(Number.isNaN(result.x)).toBe(false);
        });
    });

    describe("lerp()", () => {
        it("should linearly interpolate between two vectors", () => {
            const start = { x: 0, y: 10, z: 100 };
            const end = { x: 10, y: 20, z: 200 };
            const mid = lerp(start, end, 0.5);

            expect(mid).toEqual({ x: 5, y: 15, z: 150 });
        });
    });
});
