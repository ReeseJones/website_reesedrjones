import type { ISceneNode } from "../core/scene_node_types";
import type { Vector3Like } from "../../maths/vector_types";

export interface PerspectiveCameraOptions {
    /** Vertical field of view in degrees (default: 60) */
    fov?: number;
    /** Aspect ratio (width / height) (default: 1.0) */
    aspect?: number;
    /** Near clipping plane distance (default: 0.1) */
    near?: number;
    /** Far clipping plane distance (default: 1000.0) */
    far?: number;
}

export interface OrthographicCameraOptions {
    /** Left frustum plane (default: -1.0) */
    left?: number;
    /** Right frustum plane (default: 1.0) */
    right?: number;
    /** Top frustum plane (default: 1.0) */
    top?: number;
    /** Bottom frustum plane (default: -1.0) */
    bottom?: number;
    /** Near clipping plane distance (default: 0.1) */
    near?: number;
    /** Far clipping plane distance (default: 1000.0) */
    far?: number;
    /** Zoom factor (default: 1.0) */
    zoom?: number;
}

export interface ICamera extends ISceneNode {
    /** Inverted camera world matrix (transforms world space to view space) */
    readonly viewMatrix: Float32Array;

    /** Projection matrix (transforms view space to clip space) */
    readonly projectionMatrix: Float32Array;

    /** Pre-multiplied Projection * View matrix */
    readonly viewProjectionMatrix: Float32Array;

    /** Near clipping distance */
    near: number;

    /** Far clipping distance */
    far: number;

    /** Points the camera toward target coordinates in world space */
    lookAt(target: Vector3Like, worldUp?: Vector3Like): this;

    /** Internal/framework hook to update aspect ratio automatically */
    updateAspectRatio(aspect: number): void;

    /** Forces recalculation of view and projection matrices */
    updateMatrices(): void;
}
