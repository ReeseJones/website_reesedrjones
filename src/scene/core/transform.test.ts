import { describe, it, expect, vi } from "vitest";
import { mat4, quat, vec3 } from "gl-matrix";
import { Transform } from "./transform";
import type { QuaternionTuple } from "./transform_types";

describe("Transform", () => {
    describe("constructor", () => {
        it("should initialize with default identity TRS components", () => {
            const transform = new Transform();
            expect(transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            expect(transform.getQuaternion()).toEqual([0, 0, 0, 1]);
            expect(transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
        });

        it("should initialize with isLocalDirty set to true", () => {
            const transform = new Transform();
            expect(transform.isLocalDirty).toBe(true);
        });

        it("should initialize localMatrix as 4x4 identity matrix", () => {
            const transform = new Transform();
            const identity = new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            expect(transform.localMatrix).toEqual(identity);
        });

        it("should attach initial onDirty callback when provided", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.updateLocalMatrix(); // reset dirty flag
            onDirty.mockClear();

            transform.setPosition(1, 2, 3);
            expect(onDirty).toHaveBeenCalledTimes(1);
        });
    });

    describe("localMatrix", () => {
        it("should return Float32Array with 16 elements", () => {
            const transform = new Transform();
            expect(transform.localMatrix).toBeInstanceOf(Float32Array);
            expect(transform.localMatrix.length).toBe(16);
        });

        it("should return the exact same matrix instance on repeated access", () => {
            const transform = new Transform();
            const mat1 = transform.localMatrix;
            const mat2 = transform.localMatrix;
            expect(mat1).toBe(mat2);
        });

        it("should reflect recomputed transform after updateLocalMatrix()", () => {
            const transform = new Transform();
            transform.setPosition(5, 10, 15);
            transform.updateLocalMatrix();

            const mat = transform.localMatrix;
            expect(mat[12]).toBeCloseTo(5);
            expect(mat[13]).toBeCloseTo(10);
            expect(mat[14]).toBeCloseTo(15);
        });
    });

    describe("isLocalDirty", () => {
        it("should initially be true", () => {
            const transform = new Transform();
            expect(transform.isLocalDirty).toBe(true);
        });

        it("should become false once updateLocalMatrix() executes", () => {
            const transform = new Transform();
            transform.updateLocalMatrix();
            expect(transform.isLocalDirty).toBe(false);
        });

        it("should transition to true when position changes", () => {
            const transform = new Transform();
            transform.updateLocalMatrix();
            expect(transform.isLocalDirty).toBe(false);

            transform.setPosition(1, 0, 0);
            expect(transform.isLocalDirty).toBe(true);
        });

        it("should transition to true when Euler rotation changes", () => {
            const transform = new Transform();
            transform.updateLocalMatrix();
            expect(transform.isLocalDirty).toBe(false);

            transform.setRotationEuler(0.2, 0.3, 0.1);
            expect(transform.isLocalDirty).toBe(true);
        });

        it("should transition to true when quaternion rotation changes", () => {
            const transform = new Transform();
            transform.updateLocalMatrix();
            expect(transform.isLocalDirty).toBe(false);

            transform.setRotationQuaternion(0, 1, 0, 0);
            expect(transform.isLocalDirty).toBe(true);
        });

        it("should transition to true when slerp() is invoked", () => {
            const transform = new Transform();
            transform.updateLocalMatrix();
            expect(transform.isLocalDirty).toBe(false);

            transform.slerp([0, 1, 0, 0], 0.5);
            expect(transform.isLocalDirty).toBe(true);
        });

        it("should transition to true when non-uniform scale changes", () => {
            const transform = new Transform();
            transform.updateLocalMatrix();
            expect(transform.isLocalDirty).toBe(false);

            transform.setScale(2, 3, 4);
            expect(transform.isLocalDirty).toBe(true);
        });

        it("should transition to true when uniform scale changes", () => {
            const transform = new Transform();
            transform.updateLocalMatrix();
            expect(transform.isLocalDirty).toBe(false);

            transform.setUniformScale(3);
            expect(transform.isLocalDirty).toBe(true);
        });
    });

    describe("setOnDirty()", () => {
        it("should set callback and trigger it on subsequent modifications", () => {
            const transform = new Transform();
            const callback = vi.fn();

            transform.setOnDirty(callback);
            transform.setPosition(10, 0, 0);

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it("should replace previous callback when a new listener is registered", () => {
            const transform = new Transform();
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            transform.setOnDirty(callback1);
            transform.setOnDirty(callback2);
            transform.setPosition(2, 4, 6);

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        it("should detach listener when undefined is passed", () => {
            const transform = new Transform();
            const callback = vi.fn();

            transform.setOnDirty(callback);
            transform.setOnDirty(undefined);
            transform.setPosition(5, 5, 5);

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe("getPosition()", () => {
        it("should return nominal position coordinates", () => {
            const transform = new Transform();
            transform.setPosition(12.5, -4.2, 0.75);
            const pos = transform.getPosition();
            expect(pos.x).toBeCloseTo(12.5);
            expect(pos.y).toBeCloseTo(-4.2);
            expect(pos.z).toBeCloseTo(0.75);
        });

        it("should return a decoupled copy that does not mutate internal state when altered", () => {
            const transform = new Transform();
            transform.setPosition(1, 2, 3);

            const pos = transform.getPosition();
            pos.x = 999;
            pos.y = 888;
            pos.z = 777;

            expect(transform.getPosition()).toEqual({ x: 1, y: 2, z: 3 });
        });
    });

    describe("getQuaternion()", () => {
        it("should return nominal quaternion coordinates as a tuple", () => {
            const transform = new Transform();
            transform.setRotationQuaternion(0, 0.6, 0, 0.8);
            const q = transform.getQuaternion();
            expect(q[0]).toBeCloseTo(0);
            expect(q[1]).toBeCloseTo(0.6);
            expect(q[2]).toBeCloseTo(0);
            expect(q[3]).toBeCloseTo(0.8);
        });

        it("should return a decoupled copy that does not mutate internal state when altered", () => {
            const transform = new Transform();
            const q = transform.getQuaternion();
            q[0] = 999;
            q[1] = 888;
            q[2] = 777;
            q[3] = 666;

            expect(transform.getQuaternion()).toEqual([0, 0, 0, 1]);
        });
    });

    describe("getEulerAngles()", () => {
        it("should return pitch=0, yaw=0, roll=0 for identity orientation", () => {
            const transform = new Transform();
            const angles = transform.getEulerAngles();
            expect(angles.pitch).toBeCloseTo(0);
            expect(angles.yaw).toBeCloseTo(0);
            expect(angles.roll).toBeCloseTo(0);
        });

        it("should accurately reconstruct nominal pitch, yaw, and roll angles in YXZ composition order", () => {
            const transform = new Transform();
            const expectedPitch = 0.35;
            const expectedYaw = -0.72;
            const expectedRoll = 0.18;

            transform.setRotationEuler(expectedPitch, expectedYaw, expectedRoll);
            const angles = transform.getEulerAngles();

            expect(angles.pitch).toBeCloseTo(expectedPitch, 4);
            expect(angles.yaw).toBeCloseTo(expectedYaw, 4);
            expect(angles.roll).toBeCloseTo(expectedRoll, 4);
        });

        it("should handle positive gimbal lock singularity when pitch is +90 degrees (Math.PI / 2)", () => {
            const transform = new Transform();
            const pitch = Math.PI / 2;
            const yaw = 0;
            const roll = 0;

            transform.setRotationEuler(pitch, yaw, roll);
            const angles = transform.getEulerAngles();

            expect(angles.pitch).toBeCloseTo(Math.PI / 2, 4);
            expect(angles.roll).toBeCloseTo(0, 4);
            expect(angles.yaw).toBeCloseTo(0, 4);
        });

        it("should handle negative gimbal lock singularity when pitch is -90 degrees (-Math.PI / 2)", () => {
            const transform = new Transform();
            const pitch = -Math.PI / 2;
            const yaw = 0;
            const roll = 0;

            transform.setRotationEuler(pitch, yaw, roll);
            const angles = transform.getEulerAngles();

            expect(angles.pitch).toBeCloseTo(-Math.PI / 2, 4);
            expect(angles.roll).toBeCloseTo(0, 4);
            expect(angles.yaw).toBeCloseTo(0, 4);
        });
    });

    describe("getScale()", () => {
        it("should return nominal scale coordinates", () => {
            const transform = new Transform();
            transform.setScale(2.5, 0.5, 10);
            expect(transform.getScale()).toEqual({ x: 2.5, y: 0.5, z: 10 });
        });

        it("should return a decoupled copy that does not mutate internal state when altered", () => {
            const transform = new Transform();
            transform.setScale(3, 4, 5);

            const scale = transform.getScale();
            scale.x = 999;
            scale.y = 888;
            scale.z = 777;

            expect(transform.getScale()).toEqual({ x: 3, y: 4, z: 5 });
        });
    });

    describe("setPosition()", () => {
        it("should return this to support fluent method chaining", () => {
            const transform = new Transform();
            const result = transform.setPosition(1, 2, 3);
            expect(result).toBe(transform);
        });

        it("should mutate position state accurately", () => {
            const transform = new Transform();
            transform.setPosition(-10, 42.1, 0);
            const pos = transform.getPosition();
            expect(pos.x).toBeCloseTo(-10);
            expect(pos.y).toBeCloseTo(42.1);
            expect(pos.z).toBeCloseTo(0);
        });

        it("should mark transform dirty and notify onDirty callback", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setPosition(7, 8, 9);
            expect(transform.isLocalDirty).toBe(true);
            expect(onDirty).toHaveBeenCalledTimes(1);
        });

        it("should be idempotent and skip dirty notification when setting identical coordinates", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.setPosition(5, 5, 5);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setPosition(5, 5, 5);
            expect(transform.isLocalDirty).toBe(false);
            expect(onDirty).not.toHaveBeenCalled();
        });
    });

    describe("setRotationEuler()", () => {
        it("should return this to support fluent method chaining", () => {
            const transform = new Transform();
            const result = transform.setRotationEuler(0, 0, 0);
            expect(result).toBe(transform);
        });

        it("should calculate and set quaternion representing YXZ composition order", () => {
            const transform = new Transform();
            const pitch = 0.5;
            const yaw = 0.8;
            const roll = 0.2;

            transform.setRotationEuler(pitch, yaw, roll);
            const angles = transform.getEulerAngles();

            expect(angles.pitch).toBeCloseTo(pitch, 4);
            expect(angles.yaw).toBeCloseTo(yaw, 4);
            expect(angles.roll).toBeCloseTo(roll, 4);
        });

        it("should mark transform dirty and notify onDirty callback", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setRotationEuler(0.1, 0.2, 0.3);
            expect(transform.isLocalDirty).toBe(true);
            expect(onDirty).toHaveBeenCalledTimes(1);
        });

        it("should be idempotent and skip dirty notification when identical Euler angles are passed", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.setRotationEuler(0, 0, 0);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setRotationEuler(0, 0, 0);
            expect(transform.isLocalDirty).toBe(false);
            expect(onDirty).not.toHaveBeenCalled();
        });
    });

    describe("setRotationQuaternion()", () => {
        it("should return this to support fluent method chaining", () => {
            const transform = new Transform();
            const result = transform.setRotationQuaternion(0, 0, 0, 1);
            expect(result).toBe(transform);
        });

        it("should normalize non-unit quaternion input values", () => {
            const transform = new Transform();
            // Magnitude = 5 (3^2 + 4^2 = 25)
            transform.setRotationQuaternion(0, 0, 3, 4);
            const q = transform.getQuaternion();

            expect(q[0]).toBeCloseTo(0);
            expect(q[1]).toBeCloseTo(0);
            expect(q[2]).toBeCloseTo(3 / 5, 5);
            expect(q[3]).toBeCloseTo(4 / 5, 5);

            const norm = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
            expect(norm).toBeCloseTo(1.0, 5);
        });

        it("should fallback to identity quaternion [0, 0, 0, 1] for degenerate zero-length input", () => {
            const transform = new Transform();
            transform.setRotationQuaternion(0, 0, 0, 0);
            expect(transform.getQuaternion()).toEqual([0, 0, 0, 1]);
        });

        it("should fallback to identity quaternion [0, 0, 0, 1] when length squared is below epsilon", () => {
            const transform = new Transform();
            transform.setRotationQuaternion(0.0001, 0.0001, 0.0001, 0.0001); // lenSq = 4e-8 < 1e-6
            expect(transform.getQuaternion()).toEqual([0, 0, 0, 1]);
        });

        it("should mark transform dirty and notify onDirty callback", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setRotationQuaternion(0, 1, 0, 0);
            expect(transform.isLocalDirty).toBe(true);
            expect(onDirty).toHaveBeenCalledTimes(1);
        });

        it("should be idempotent and skip dirty notification when identical quaternion coordinates are passed", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.setRotationQuaternion(0, 1, 0, 0);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setRotationQuaternion(0, 1, 0, 0);
            expect(transform.isLocalDirty).toBe(false);
            expect(onDirty).not.toHaveBeenCalled();
        });
    });

    describe("slerp()", () => {
        it("should return this to support fluent method chaining", () => {
            const transform = new Transform();
            const target: QuaternionTuple = [0, 1, 0, 0];
            const result = transform.slerp(target, 0.5);
            expect(result).toBe(transform);
        });

        it("should leave rotation at source quaternion when t=0", () => {
            const transform = new Transform();
            transform.setRotationQuaternion(0, 0, 0, 1);
            const target: QuaternionTuple = [0, 1, 0, 0];

            transform.slerp(target, 0);
            const q = transform.getQuaternion();
            expect(q[0]).toBeCloseTo(0);
            expect(q[1]).toBeCloseTo(0);
            expect(q[2]).toBeCloseTo(0);
            expect(q[3]).toBeCloseTo(1);
        });

        it("should interpolate halfway between source and target when t=0.5", () => {
            const transform = new Transform();
            transform.setRotationQuaternion(0, 0, 0, 1);
            // 90 degrees around Y: [0, sin(pi/4), 0, cos(pi/4)]
            const halfAngle = Math.PI / 4;
            const target: QuaternionTuple = [0, Math.sin(halfAngle), 0, Math.cos(halfAngle)];

            transform.slerp(target, 0.5);
            const q = transform.getQuaternion();
            // Halfway is 45 degrees around Y: half-angle is pi/8
            const quarterAngle = Math.PI / 8;
            expect(q[0]).toBeCloseTo(0);
            expect(q[1]).toBeCloseTo(Math.sin(quarterAngle), 4);
            expect(q[2]).toBeCloseTo(0);
            expect(q[3]).toBeCloseTo(Math.cos(quarterAngle), 4);
        });

        it("should match target quaternion when t=1", () => {
            const transform = new Transform();
            transform.setRotationQuaternion(0, 0, 0, 1);
            const halfAngle = Math.PI / 4;
            const target: QuaternionTuple = [0, Math.sin(halfAngle), 0, Math.cos(halfAngle)];

            transform.slerp(target, 1);
            const q = transform.getQuaternion();
            expect(q[0]).toBeCloseTo(target[0], 4);
            expect(q[1]).toBeCloseTo(target[1], 4);
            expect(q[2]).toBeCloseTo(target[2], 4);
            expect(q[3]).toBeCloseTo(target[3], 4);
        });

        it("should mark transform dirty and notify onDirty callback", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            const target: QuaternionTuple = [0, 1, 0, 0];
            transform.slerp(target, 0.5);

            expect(transform.isLocalDirty).toBe(true);
            expect(onDirty).toHaveBeenCalledTimes(1);
        });
    });

    describe("setScale()", () => {
        it("should return this to support fluent method chaining", () => {
            const transform = new Transform();
            const result = transform.setScale(2, 3, 4);
            expect(result).toBe(transform);
        });

        it("should mutate non-uniform scale state", () => {
            const transform = new Transform();
            transform.setScale(2, 3, 4);
            expect(transform.getScale()).toEqual({ x: 2, y: 3, z: 4 });
        });

        it("should support zero and negative scale factors (mirroring / reflections)", () => {
            const transform = new Transform();
            transform.setScale(-1, 0, -2.5);
            expect(transform.getScale()).toEqual({ x: -1, y: 0, z: -2.5 });
        });

        it("should mark transform dirty and notify onDirty callback when scale changes", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setScale(2, 2, 2);
            expect(transform.isLocalDirty).toBe(true);
            expect(onDirty).toHaveBeenCalledTimes(1);
        });

        it("should be idempotent and skip dirty notification when identical scale values are passed", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.setScale(3, 4, 5);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setScale(3, 4, 5);
            expect(transform.isLocalDirty).toBe(false);
            expect(onDirty).not.toHaveBeenCalled();
        });
    });

    describe("setUniformScale()", () => {
        it("should return this to support fluent method chaining", () => {
            const transform = new Transform();
            const result = transform.setUniformScale(4);
            expect(result).toBe(transform);
        });

        it("should set all three axes uniformly", () => {
            const transform = new Transform();
            transform.setUniformScale(7.5);
            expect(transform.getScale()).toEqual({ x: 7.5, y: 7.5, z: 7.5 });
        });

        it("should delegate to setScale and mark dirty when scale changes", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setUniformScale(3);
            expect(transform.isLocalDirty).toBe(true);
            expect(onDirty).toHaveBeenCalledTimes(1);
        });

        it("should be idempotent when passing current uniform scale", () => {
            const onDirty = vi.fn();
            const transform = new Transform(onDirty);
            transform.setUniformScale(5);
            transform.updateLocalMatrix();
            onDirty.mockClear();

            transform.setUniformScale(5);
            expect(transform.isLocalDirty).toBe(false);
            expect(onDirty).not.toHaveBeenCalled();
        });
    });

    describe("updateLocalMatrix()", () => {
        it("should recompute localMatrix and return true when dirty", () => {
            const transform = new Transform();
            expect(transform.isLocalDirty).toBe(true);

            const result = transform.updateLocalMatrix();
            expect(result).toBe(true);
            expect(transform.isLocalDirty).toBe(false);
        });

        it("should return false and skip recomputation when not dirty", () => {
            const transform = new Transform();
            transform.updateLocalMatrix();

            const result = transform.updateLocalMatrix();
            expect(result).toBe(false);
            expect(transform.isLocalDirty).toBe(false);
        });

        it("should synthesize correct 4x4 matrix ordering and TRS column-major layout", () => {
            const transform = new Transform();
            transform.setPosition(10, 20, 30);
            transform.setScale(2, 3, 4);

            const updated = transform.updateLocalMatrix();
            expect(updated).toBe(true);

            const mat = transform.localMatrix;

            // Column-major layout in WebGL:
            // Column 0: X axis basis scaled
            expect(mat[0]).toBeCloseTo(2);
            expect(mat[1]).toBeCloseTo(0);
            expect(mat[2]).toBeCloseTo(0);
            expect(mat[3]).toBeCloseTo(0);

            // Column 1: Y axis basis scaled
            expect(mat[4]).toBeCloseTo(0);
            expect(mat[5]).toBeCloseTo(3);
            expect(mat[6]).toBeCloseTo(0);
            expect(mat[7]).toBeCloseTo(0);

            // Column 2: Z axis basis scaled
            expect(mat[8]).toBeCloseTo(0);
            expect(mat[9]).toBeCloseTo(0);
            expect(mat[10]).toBeCloseTo(4);
            expect(mat[11]).toBeCloseTo(0);

            // Column 3: Translation vector
            expect(mat[12]).toBeCloseTo(10);
            expect(mat[13]).toBeCloseTo(20);
            expect(mat[14]).toBeCloseTo(30);
            expect(mat[15]).toBeCloseTo(1);
        });

        it("should match gl-matrix reference composition with combined translation, rotation, and non-uniform scale", () => {
            const transform = new Transform();
            const posX = 1.5, posY = -2.5, posZ = 3.5;
            const pitch = 0.3, yaw = 0.6, roll = -0.2;
            const scaleX = 2.0, scaleY = 0.5, scaleZ = 1.2;

            transform.setPosition(posX, posY, posZ);
            transform.setRotationEuler(pitch, yaw, roll);
            transform.setScale(scaleX, scaleY, scaleZ);

            transform.updateLocalMatrix();

            // Compute reference matrix via gl-matrix
            const expectedMat = mat4.create();
            const q = quat.create();
            const p = vec3.fromValues(posX, posY, posZ);
            const s = vec3.fromValues(scaleX, scaleY, scaleZ);

            // Match YXZ rotation
            const hx = pitch * 0.5;
            const hy = yaw * 0.5;
            const hz = roll * 0.5;
            const sx = Math.sin(hx), cx = Math.cos(hx);
            const sy = Math.sin(hy), cy = Math.cos(hy);
            const sz = Math.sin(hz), cz = Math.cos(hz);

            quat.set(
                q,
                sx * cy * cz + cx * sy * sz,
                cx * sy * cz - sx * cy * sz,
                cx * cy * sz - sx * sy * cz,
                cx * cy * cz + sx * sy * sz
            );

            mat4.fromRotationTranslationScale(expectedMat, q, p, s);

            for (let i = 0; i < 16; i++) {
                expect(transform.localMatrix[i]).toBeCloseTo(expectedMat[i], 5);
            }
        });
    });
});
