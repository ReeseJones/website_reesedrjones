import { mat3, mat4, quat, vec3 } from "gl-matrix";
import { SceneNode } from "../core/scene_node";
import type { ICamera } from "./camera_types";
import type { Vector3Like } from "../../maths/vector_types";

/**
 * Abstract base class for all scene cameras.
 * Extends SceneNode to provide first-class scene graph citizenship, position, rotation,
 * and parent-child hierarchy support. Pre-calculates and caches view, projection, and
 * view-projection matrices.
 */
export abstract class Camera extends SceneNode implements ICamera {
    private readonly _viewMatrix: Float32Array = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    private readonly _projectionMatrix: Float32Array = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    private readonly _viewProjectionMatrix: Float32Array = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);

    private _near: number;
    private _far: number;
    private _isProjDirty: boolean = true;
    private _isViewDirty: boolean = true;

    constructor(
        near: number = 0.1,
        far: number = 1000.0,
        name: string = "Camera",
        id?: string
    ) {
        super(name, id);
        this._near = near;
        this._far = far;

        this.transform.setOnDirty(() => this.markWorldDirty());
    }

    public get viewMatrix(): Float32Array {
        return this._viewMatrix;
    }

    public get projectionMatrix(): Float32Array {
        return this._projectionMatrix;
    }

    public get viewProjectionMatrix(): Float32Array {
        return this._viewProjectionMatrix;
    }

    public get near(): number {
        return this._near;
    }

    public set near(val: number) {
        if (this._near !== val) {
            this._near = val;
            this._isProjDirty = true;
        }
    }

    public get far(): number {
        return this._far;
    }

    public set far(val: number) {
        if (this._far !== val) {
            this._far = val;
            this._isProjDirty = true;
        }
    }

    /**
     * Marks projection matrix dirty, scheduling recomputation on next matrix update.
     */
    protected markProjectionDirty(): void {
        this._isProjDirty = true;
    }

    public override markWorldDirty(): void {
        super.markWorldDirty();
        this._isViewDirty = true;
    }

    /**
     * Points the camera toward target coordinates in world space.
     * Computes the look-at orientation basis and applies it as a unit quaternion.
     */
    public lookAt(target: Vector3Like, worldUp: Vector3Like = { x: 0, y: 1, z: 0 }): this {
        const eye = this.transform.getPosition();
        const eyeVec = vec3.fromValues(eye.x, eye.y, eye.z);
        const targetVec = vec3.fromValues(target.x, target.y, target.z);
        const upVec = vec3.fromValues(worldUp.x, worldUp.y, worldUp.z);

        // 1. Forward Vector (z_axis = normalize(eye - target)) - camera looks down -Z
        const zAxis = vec3.create();
        vec3.subtract(zAxis, eyeVec, targetVec);
        if (vec3.sqrLen(zAxis) < 1e-6) {
            return this;
        }
        vec3.normalize(zAxis, zAxis);

        // 2. Right Vector (x_axis = normalize(up x z_axis))
        const xAxis = vec3.create();
        vec3.cross(xAxis, upVec, zAxis);
        if (vec3.sqrLen(xAxis) < 1e-6) {
            // Up and zAxis are collinear, pick alternate up vector
            const altUp = Math.abs(zAxis[2]) < 0.999 ? vec3.fromValues(0, 0, 1) : vec3.fromValues(1, 0, 0);
            vec3.cross(xAxis, altUp, zAxis);
        }
        vec3.normalize(xAxis, xAxis);

        // 3. True Up Vector (y_axis = z_axis x x_axis)
        const yAxis = vec3.create();
        vec3.cross(yAxis, zAxis, xAxis);

        // 4. Orientation basis to quaternion
        const rotMat = mat3.fromValues(
            xAxis[0], xAxis[1], xAxis[2],
            yAxis[0], yAxis[1], yAxis[2],
            zAxis[0], zAxis[1], zAxis[2]
        );
        const rotQuat = quat.create();
        quat.fromMat3(rotQuat, rotMat);
        quat.normalize(rotQuat, rotQuat);

        this.transform.setRotationQuaternion(rotQuat[0], rotQuat[1], rotQuat[2], rotQuat[3]);
        return this;
    }

    /**
     * Recomputes view, projection, and combined view-projection matrices if invalidated.
     */
    public updateMatrices(): void {
        let viewUpdated = false;
        if (this.isWorldDirty || this._isViewDirty || this.transform.isLocalDirty) {
            this.updateWorldTransform();
            const inverted = mat4.invert(
                this._viewMatrix,
                this.worldMatrix
            );
            if (!inverted) {
                mat4.identity(this._viewMatrix);
            }
            this._isViewDirty = false;
            viewUpdated = true;
        }

        let projUpdated = false;
        if (this._isProjDirty) {
            this.updateProjectionMatrix();
            this._isProjDirty = false;
            projUpdated = true;
        }

        if (viewUpdated || projUpdated) {
            mat4.multiply(
                this._viewProjectionMatrix,
                this._projectionMatrix,
                this._viewMatrix
            );
        }
    }

    /**
     * Updates viewport aspect ratio (invoked by rendering passes or resize subscribers).
     */
    public abstract updateAspectRatio(aspect: number): void;

    /**
     * Recalculates the camera's projection matrix.
     */
    public abstract updateProjectionMatrix(): void;
}
