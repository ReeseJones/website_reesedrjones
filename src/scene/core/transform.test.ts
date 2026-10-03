import { describe, it, expect, vi } from "vitest";
import { Transform } from "./transform";

describe("Transform", () => {
    describe("constructor", () => {
        it("should initialize with default identity TRS components", () => {
            const t = new Transform();
            expect(t.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            expect(t.getQuaternion()).toEqual([0, 0, 0, 1]);
            expect(t.getScale()).toEqual({ x: 1, y: 1, z: 1 });
            expect(t.isLocalDirty).toBe(true);
        });
    });

    describe(".setPosition()", () => {
        it("should update position and trigger dirty callback", () => {
            const onDirty = vi.fn();
            const t = new Transform(onDirty);
            t.updateLocalMatrix();
            expect(t.isLocalDirty).toBe(false);

            t.setPosition(10, 20, -30);
            expect(t.getPosition()).toEqual({ x: 10, y: 20, z: -30 });
            expect(t.isLocalDirty).toBe(true);
            expect(onDirty).toHaveBeenCalledTimes(1);
        });

        it("should skip dirty notification if position coordinates are identical (idempotent)", () => {
            const onDirty = vi.fn();
            const t = new Transform(onDirty);
            t.setPosition(5, 5, 5);
            onDirty.mockClear();

            t.setPosition(5, 5, 5);
            expect(onDirty).not.toHaveBeenCalled();
        });
    });

    describe(".setScale() and .setUniformScale()", () => {
        it("should update non-uniform scale and flag dirty", () => {
            const onDirty = vi.fn();
            const t = new Transform(onDirty);
            t.setScale(2, 3, 4);
            expect(t.getScale()).toEqual({ x: 2, y: 3, z: 4 });
            expect(onDirty).toHaveBeenCalledTimes(1);
        });

        it("should set uniform scale across all dimensions", () => {
            const t = new Transform();
            t.setUniformScale(5);
            expect(t.getScale()).toEqual({ x: 5, y: 5, z: 5 });
        });

        it("should not trigger dirty notification when setting identical scale", () => {
            const onDirty = vi.fn();
            const t = new Transform(onDirty);
            t.setScale(2, 2, 2);
            onDirty.mockClear();

            t.setScale(2, 2, 2);
            expect(onDirty).not.toHaveBeenCalled();
        });
    });

    describe(".setRotationQuaternion() and .getQuaternion()", () => {
        it("should normalize input quaternion values", () => {
            const t = new Transform();
            t.setRotationQuaternion(0, 0, 2, 0); // non-unit quaternion
            const q = t.getQuaternion();
            expect(q[0]).toBe(0);
            expect(q[1]).toBe(0);
            expect(q[2]).toBeCloseTo(1.0, 5);
            expect(q[3]).toBe(0);
        });

        it("should handle degenerate near-zero quaternion without NaN", () => {
            const t = new Transform();
            t.setRotationQuaternion(0, 0, 0, 0);
            const q = t.getQuaternion();
            expect(q).toEqual([0, 0, 0, 1]);
        });
    });

    describe(".setRotationEuler() and .getEulerAngles()", () => {
        it("should correctly convert between Euler angles and internal quaternion", () => {
            const t = new Transform();
            const pitch = 0.5;
            const yaw = 0.8;
            const roll = 0.2;

            t.setRotationEuler(pitch, yaw, roll);
            const angles = t.getEulerAngles();

            expect(angles.pitch).toBeCloseTo(pitch, 4);
            expect(angles.yaw).toBeCloseTo(yaw, 4);
            expect(angles.roll).toBeCloseTo(roll, 4);
        });
    });

    describe(".slerp()", () => {
        it("should spherically interpolate quaternion toward target", () => {
            const t = new Transform();
            t.setRotationQuaternion(0, 0, 0, 1);
            // 90 deg rotation around Y: [0, sin(pi/4), 0, cos(pi/4)]
            const halfAngle = Math.PI / 4;
            const target: [number, number, number, number] = [0, Math.sin(halfAngle), 0, Math.cos(halfAngle)];

            t.slerp(target, 0.5);
            const q = t.getQuaternion();
            const quarterAngle = Math.PI / 8;
            expect(q[1]).toBeCloseTo(Math.sin(quarterAngle), 4);
            expect(q[3]).toBeCloseTo(Math.cos(quarterAngle), 4);
        });
    });

    describe(".updateLocalMatrix()", () => {
        it("should compose translation, rotation, and scale into a 4x4 matrix", () => {
            const t = new Transform();
            t.setPosition(10, 20, 30);
            t.setScale(2, 2, 2);

            const updated = t.updateLocalMatrix();
            expect(updated).toBe(true);
            expect(t.isLocalDirty).toBe(false);

            const mat = t.localMatrix;
            // Translation column in column-major WebGL mat4
            expect(mat[12]).toBe(10);
            expect(mat[13]).toBe(20);
            expect(mat[14]).toBe(30);

            // Diagonal scale
            expect(mat[0]).toBe(2);
            expect(mat[5]).toBe(2);
            expect(mat[10]).toBe(2);
        });

        it("should return false and skip recomputation when matrix is not dirty", () => {
            const t = new Transform();
            t.updateLocalMatrix();
            const secondPass = t.updateLocalMatrix();
            expect(secondPass).toBe(false);
        });
    });
});
