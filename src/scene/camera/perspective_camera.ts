import { mat4 } from "gl-matrix";
import { Camera } from "./camera";
import type { PerspectiveCameraOptions } from "./camera_types";

/**
 * Perspective projection camera providing standard 3D depth foreshortening.
 */
export class PerspectiveCamera extends Camera {
    private _fov: number;
    private _aspect: number;

    constructor(
        options: PerspectiveCameraOptions = {},
        name: string = "PerspectiveCamera",
        id?: string
    ) {
        super(options.near ?? 0.1, options.far ?? 1000.0, name, id);
        this._fov = options.fov ?? 60;
        this._aspect = options.aspect ?? 1.0;
    }

    public get fov(): number {
        return this._fov;
    }

    public set fov(value: number) {
        if (this._fov !== value) {
            this._fov = value;
            this.markProjectionDirty();
        }
    }

    public get aspect(): number {
        return this._aspect;
    }

    public set aspect(value: number) {
        if (this._aspect !== value) {
            this._aspect = value;
            this.markProjectionDirty();
        }
    }

    /**
     * Updates viewport aspect ratio (width / height) and invalidates projection.
     */
    public updateAspectRatio(aspect: number): void {
        if (this._aspect !== aspect) {
            this._aspect = aspect;
            this.markProjectionDirty();
        }
    }

    /**
     * Recalculates perspective projection matrix using vertical FOV and aspect ratio.
     */
    public updateProjectionMatrix(): void {
        const fovRadians = (this._fov * Math.PI) / 180;
        mat4.perspective(
            this.projectionMatrix as unknown as mat4,
            fovRadians,
            this._aspect,
            this.near,
            this.far
        );
    }
}
