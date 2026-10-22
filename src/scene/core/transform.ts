import { mat4, quat, vec3 } from "gl-matrix";
import type { Vector3Like } from "../../maths/vector_types";
import type {
    EulerAngles,
    ITransform,
    OnTransformDirtyCallback,
    QuaternionTuple
} from "./transform_types";

/**
 * 3D spatial transformation component managing position, unit quaternion rotation,
 * scale, and local 4x4 matrix synthesis.
 */
export class Transform implements ITransform {
    private static readonly _scratchQuat: Float32Array = new Float32Array(4);

    private readonly _position: Float32Array = new Float32Array(3);
    private readonly _rotation: Float32Array = new Float32Array([0, 0, 0, 1]);
    private readonly _scale: Float32Array = new Float32Array([1, 1, 1]);
    private readonly _localMatrix: Float32Array = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);

    private _isLocalDirty: boolean = true;
    private _onDirty?: OnTransformDirtyCallback;

    constructor(onDirty?: OnTransformDirtyCallback) {
        this._onDirty = onDirty;
    }

    public get localMatrix(): Float32Array {
        return this._localMatrix;
    }

    public get isLocalDirty(): boolean {
        return this._isLocalDirty;
    }

    public setOnDirty(onDirty?: OnTransformDirtyCallback): void {
        this._onDirty = onDirty;
    }

    private markDirty(): void {
        this._isLocalDirty = true;
        this._onDirty?.();
    }

    public getPosition(out?: Vector3Like): Vector3Like {
        if (out) {
            out.x = this._position[0];
            out.y = this._position[1];
            out.z = this._position[2];
            return out;
        }
        return {
            x: this._position[0],
            y: this._position[1],
            z: this._position[2]
        };
    }

    public getQuaternion(): QuaternionTuple {
        return [
            this._rotation[0],
            this._rotation[1],
            this._rotation[2],
            this._rotation[3]
        ];
    }

    public getEulerAngles(): EulerAngles {
        const x = this._rotation[0];
        const y = this._rotation[1];
        const z = this._rotation[2];
        const w = this._rotation[3];

        // For YXZ Euler angles composition:
        // sin(pitch) = 2 * (w * x - y * z)
        const sinPitch = 2 * (w * x - y * z);
        let pitch: number;
        let yaw: number;
        let roll: number;

        if (Math.abs(sinPitch) < 0.9999999) {
            pitch = Math.asin(Math.max(-1, Math.min(1, sinPitch)));
            yaw = Math.atan2(2 * (x * z + w * y), 1 - 2 * (x * x + y * y));
            roll = Math.atan2(2 * (x * y + w * z), 1 - 2 * (x * x + z * z));
        } else {
            // Gimbal lock singularity
            pitch = (Math.PI / 2) * Math.sign(sinPitch);
            yaw = Math.atan2(-2 * (x * y - w * z), 1 - 2 * (y * y + z * z));
            roll = 0;
        }

        return { pitch, yaw, roll };
    }

    public getScale(out?: Vector3Like): Vector3Like {
        if (out) {
            out.x = this._scale[0];
            out.y = this._scale[1];
            out.z = this._scale[2];
            return out;
        }
        return {
            x: this._scale[0],
            y: this._scale[1],
            z: this._scale[2]
        };
    }

    public setPosition(pos: Vector3Like): this;
    public setPosition(x: number, y: number, z: number): this;
    public setPosition(posOrX: Vector3Like | number, y?: number, z?: number): this {
        let nx: number;
        let ny: number;
        let nz: number;
        if (typeof posOrX === "object" && posOrX !== null) {
            nx = posOrX.x;
            ny = posOrX.y;
            nz = posOrX.z;
        } else {
            nx = posOrX;
            ny = y!;
            nz = z!;
        }
        if (this._position[0] !== nx || this._position[1] !== ny || this._position[2] !== nz) {
            vec3.set(this._position, nx, ny, nz);
            this.markDirty();
        }
        return this;
    }

    public setRotationEuler(pitch: number, yaw: number, roll: number): this {
        // YXZ order: q = qy * qx * qz
        const hx = pitch * 0.5;
        const hy = yaw * 0.5;
        const hz = roll * 0.5;
        const sx = Math.sin(hx);
        const cx = Math.cos(hx);
        const sy = Math.sin(hy);
        const cy = Math.cos(hy);
        const sz = Math.sin(hz);
        const cz = Math.cos(hz);

        const qx = sx * cy * cz + cx * sy * sz;
        const qy = cx * sy * cz - sx * cy * sz;
        const qz = cx * cy * sz - sx * sy * cz;
        const qw = cx * cy * cz + sx * sy * sz;

        if (
            this._rotation[0] !== qx ||
            this._rotation[1] !== qy ||
            this._rotation[2] !== qz ||
            this._rotation[3] !== qw
        ) {
            this._rotation[0] = qx;
            this._rotation[1] = qy;
            this._rotation[2] = qz;
            this._rotation[3] = qw;
            this.markDirty();
        }
        return this;
    }

    public setRotationQuaternion(x: number, y: number, z: number, w: number): this {
        const sqrLen = x * x + y * y + z * z + w * w;
        const target = Transform._scratchQuat;
        if (sqrLen < 1e-6) {
            quat.identity(target);
        } else {
            quat.set(target, x, y, z, w);
            quat.normalize(target, target);
        }

        if (
            this._rotation[0] !== target[0] ||
            this._rotation[1] !== target[1] ||
            this._rotation[2] !== target[2] ||
            this._rotation[3] !== target[3]
        ) {
            quat.copy(this._rotation, target);
            this.markDirty();
        }
        return this;
    }

    public slerp(target: QuaternionTuple, t: number): this {
        quat.slerp(
            this._rotation,
            this._rotation,
            target,
            t
        );
        this.markDirty();
        return this;
    }

    public setScale(scale: Vector3Like): this;
    public setScale(sx: number, sy: number, sz: number): this;
    public setScale(scaleOrX: Vector3Like | number, sy?: number, sz?: number): this {
        let nx: number;
        let ny: number;
        let nz: number;
        if (typeof scaleOrX === "object" && scaleOrX !== null) {
            nx = scaleOrX.x;
            ny = scaleOrX.y;
            nz = scaleOrX.z;
        } else {
            nx = scaleOrX;
            ny = sy!;
            nz = sz!;
        }
        if (this._scale[0] !== nx || this._scale[1] !== ny || this._scale[2] !== nz) {
            vec3.set(this._scale, nx, ny, nz);
            this.markDirty();
        }
        return this;
    }

    public setUniformScale(s: number): this {
        return this.setScale(s, s, s);
    }

    public updateLocalMatrix(): boolean {
        if (!this._isLocalDirty) {
            return false;
        }

        mat4.fromRotationTranslationScale(
            this._localMatrix,
            this._rotation,
            this._position,
            this._scale
        );

        this._isLocalDirty = false;
        return true;
    }
}
