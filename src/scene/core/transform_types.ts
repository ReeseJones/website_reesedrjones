import type { Vector3Like } from "../../maths/vector_types";

export type QuaternionTuple = [x: number, y: number, z: number, w: number];

export interface EulerAngles {
    /** Pitch in radians (rotation around X axis) */
    pitch: number;
    /** Yaw in radians (rotation around Y axis) */
    yaw: number;
    /** Roll in radians (rotation around Z axis) */
    roll: number;
}

export type OnTransformDirtyCallback = () => void;

export interface ITransform {
    /** Column-major 4x4 local transformation matrix */
    readonly localMatrix: Float32Array;

    /** Indicates whether the local matrix needs recalculation */
    readonly isLocalDirty: boolean;

    /** Returns a copy of the current local position, or populates out if provided */
    getPosition(out?: Vector3Like): Vector3Like;

    /** Returns a copy of the current internal quaternion [x, y, z, w] */
    getQuaternion(): QuaternionTuple;

    /** Computes and returns current Euler angles (YXZ order) */
    getEulerAngles(): EulerAngles;

    /** Returns a copy of the current local scale, or populates out if provided */
    getScale(out?: Vector3Like): Vector3Like;

    /** Sets local position coordinates */
    setPosition(pos: Vector3Like): this;
    setPosition(x: number, y: number, z: number): this;

    /** Sets local rotation from Euler angles (YXZ composition) */
    setRotationEuler(pitch: number, yaw: number, roll: number): this;

    /** Sets local rotation directly from unit quaternion */
    setRotationQuaternion(x: number, y: number, z: number, w: number): this;

    /** Spherical linear interpolation towards target quaternion */
    slerp(target: QuaternionTuple, t: number): this;

    /** Sets local non-uniform scale */
    setScale(scale: Vector3Like): this;
    setScale(sx: number, sy: number, sz: number): this;

    /** Sets local uniform scale */
    setUniformScale(s: number): this;

    /** Recomputes localMatrix if isDirty is true. Returns true if recomputed. */
    updateLocalMatrix(): boolean;
}
