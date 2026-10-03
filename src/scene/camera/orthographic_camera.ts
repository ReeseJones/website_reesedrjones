import { mat4 } from "gl-matrix";
import { Camera } from "./camera";
import type { OrthographicCameraOptions } from "./camera_types";

/**
 * Orthographic parallel projection camera for 2D overlays, UI layers,
 * CAD views, and isometric rendering.
 */
export class OrthographicCamera extends Camera {
    private _left: number;
    private _right: number;
    private _top: number;
    private _bottom: number;
    private _zoom: number;
    private _aspect?: number;

    constructor(
        options: OrthographicCameraOptions = {},
        name: string = "OrthographicCamera",
        id?: string
    ) {
        super(options.near ?? 0.1, options.far ?? 1000.0, name, id);
        this._left = options.left ?? -1;
        this._right = options.right ?? 1;
        this._top = options.top ?? 1;
        this._bottom = options.bottom ?? -1;
        this._zoom = options.zoom ?? 1.0;
    }

    public get left(): number {
        return this._left;
    }

    public set left(value: number) {
        if (this._left !== value) {
            this._left = value;
            this.markProjectionDirty();
        }
    }

    public get right(): number {
        return this._right;
    }

    public set right(value: number) {
        if (this._right !== value) {
            this._right = value;
            this.markProjectionDirty();
        }
    }

    public get top(): number {
        return this._top;
    }

    public set top(value: number) {
        if (this._top !== value) {
            this._top = value;
            this.markProjectionDirty();
        }
    }

    public get bottom(): number {
        return this._bottom;
    }

    public set bottom(value: number) {
        if (this._bottom !== value) {
            this._bottom = value;
            this.markProjectionDirty();
        }
    }

    public get zoom(): number {
        return this._zoom;
    }

    public set zoom(value: number) {
        if (this._zoom !== value) {
            this._zoom = value;
            this.markProjectionDirty();
        }
    }

    public get aspect(): number | undefined {
        return this._aspect;
    }

    /**
     * Adapts horizontal bounds to match aspect ratio (width / height)
     * while preserving the vertical extent and centering.
     */
    public updateAspectRatio(aspect: number): void {
        this._aspect = aspect;
        const centerX = (this._left + this._right) * 0.5;
        const currentHeight = Math.abs(this._top - this._bottom);
        const halfWidth = (currentHeight * aspect) * 0.5;
        this._left = centerX - halfWidth;
        this._right = centerX + halfWidth;
        this.markProjectionDirty();
    }

    /**
     * Recalculates orthographic projection matrix using frustum bounds and zoom.
     */
    public updateProjectionMatrix(): void {
        const effectiveZoom = this._zoom > 0 ? this._zoom : 1.0;
        mat4.ortho(
            this.projectionMatrix as unknown as mat4,
            this._left / effectiveZoom,
            this._right / effectiveZoom,
            this._bottom / effectiveZoom,
            this._top / effectiveZoom,
            this.near,
            this.far
        );
    }
}
