import { SceneNode } from "../core/scene_node";
import type { RenderContext } from "../core/renderable_types";
import type { Vector2Like } from "../../maths/vector_types";
import { applyMaterial } from "../materials/material_binder";
import { SpriteGeometry } from "./sprite_geometry";
import type { ISpriteGeometry } from "./sprite_geometry_types";
import type { ISpriteMaterial } from "./sprite_material_types";
import {
    BillboardMode,
    SpriteSizeMode,
    type ISpriteInstance,
    type SpriteInstanceOptions,
    type SpriteSizeClamping,
} from "./sprite_instance_types";
import {
    DEFAULT_PIN_ANCHOR_X,
    DEFAULT_PIN_ANCHOR_Y,
    DEFAULT_SPRITE_SIZE_X,
    DEFAULT_SPRITE_SIZE_Y,
    DEFAULT_SPRITE_RENDER_ORDER,
    DEFAULT_ALWAYS_ON_TOP_RENDER_ORDER,
} from "./sprite_constants";

const DEFAULT_UNCLAMPED_MIN_PIXELS = 0;
const DEFAULT_UNCLAMPED_MAX_PIXELS = 10000;

/**
 * Concrete scene graph entity representing a camera-facing 2D/3D billboard sprite.
 * Supports configurable normalized anchors, multiple sizing paradigms, procedural SDF pins,
 * sampled textures, and zero-allocation uniform uploads.
 */
export class SpriteInstance extends SceneNode implements ISpriteInstance {
    public override readonly isRenderable: true = true;
    public renderOrder: number;

    public sizeMode: SpriteSizeMode = SpriteSizeMode.ScreenSpace;
    public sizeClamping?: SpriteSizeClamping;
    public billboardMode: BillboardMode = BillboardMode.Spherical;
    public material: ISpriteMaterial;
    public readonly geometry: ISpriteGeometry;

    private readonly _anchor: Float32Array = new Float32Array([
        DEFAULT_PIN_ANCHOR_X,
        DEFAULT_PIN_ANCHOR_Y,
    ]);
    private readonly _size: Float32Array = new Float32Array([
        DEFAULT_SPRITE_SIZE_X,
        DEFAULT_SPRITE_SIZE_Y,
    ]);

    constructor(
        options: SpriteInstanceOptions,
        name: string = "SpriteInstance",
        id?: string
    ) {
        super(name, id);

        this.material = options.material;
        this.geometry = SpriteGeometry.getSharedQuad();

        if (options.anchor) {
            this._anchor[0] = options.anchor.x;
            this._anchor[1] = options.anchor.y;
        }

        if (options.size) {
            this._size[0] = options.size.x;
            this._size[1] = options.size.y;
        }

        if (options.sizeMode !== undefined) {
            this.sizeMode = options.sizeMode;
        }

        if (options.sizeClamping !== undefined) {
            this.sizeClamping = options.sizeClamping;
        }

        if (options.billboardMode !== undefined) {
            this.billboardMode = options.billboardMode;
        }

        this.renderOrder =
            options.renderOrder ??
            (this.material.alwaysOnTop
                ? DEFAULT_ALWAYS_ON_TOP_RENDER_ORDER
                : DEFAULT_SPRITE_RENDER_ORDER);
    }

    /**
     * Retrieves the normalized 2D anchor pivot point.
     * Returns a safe copy or writes directly into an optional target-out object.
     */
    public getAnchor(out?: Vector2Like): Vector2Like {
        if (out) {
            out.x = this._anchor[0];
            out.y = this._anchor[1];
            return out;
        }
        return {
            x: this._anchor[0],
            y: this._anchor[1],
        };
    }

    /**
     * Sets the normalized 2D anchor pivot point with change detection.
     */
    public setAnchor(anchor: Vector2Like): this;
    public setAnchor(x: number, y: number): this;
    public setAnchor(xOrAnchor: number | Vector2Like, y?: number): this {
        const x = typeof xOrAnchor === "number" ? xOrAnchor : xOrAnchor.x;
        const yVal = typeof xOrAnchor === "number" ? (y ?? xOrAnchor) : xOrAnchor.y;

        if (this._anchor[0] !== x || this._anchor[1] !== yVal) {
            this._anchor[0] = x;
            this._anchor[1] = yVal;
            this.markDirty();
        }

        return this;
    }

    /**
     * Retrieves the sprite dimensions.
     * Returns a safe copy or writes directly into an optional target-out object.
     */
    public getSize(out?: Vector2Like): Vector2Like {
        if (out) {
            out.x = this._size[0];
            out.y = this._size[1];
            return out;
        }
        return {
            x: this._size[0],
            y: this._size[1],
        };
    }

    /**
     * Sets the sprite dimensions with change detection.
     */
    public setSize(size: Vector2Like): this;
    public setSize(width: number, height: number): this;
    public setSize(wOrSize: number | Vector2Like, h?: number): this {
        const w = typeof wOrSize === "number" ? wOrSize : wOrSize.x;
        const height = typeof wOrSize === "number" ? (h ?? wOrSize) : wOrSize.y;

        if (this._size[0] !== w || this._size[1] !== height) {
            this._size[0] = w;
            this._size[1] = height;
            this.markDirty();
        }

        return this;
    }

    /**
     * Convenience dirty notification triggering world transform invalidation.
     */
    public markDirty(): void {
        this.markWorldDirty();
    }

    /**
     * Executes material pipeline configuration, uniform distribution, and quad draw.
     */
    public render(context: RenderContext): void {
        if (!this.visible || !this.computedVisible) {
            return;
        }

        const { contextManager, gl, dimensions } = context;

        // 1. Assert rasterization pipeline state and activate material program
        const shader = applyMaterial(this.material, contextManager, context);

        // 2. Upload contiguous Float32Array anchor and size buffers (zero allocations)
        const uAnchorLoc = shader.getUniformLocation("u_anchor");
        if (uAnchorLoc) {
            gl.uniform2fv(uAnchorLoc, this._anchor);
        }

        const uSizeLoc = shader.getUniformLocation("u_size");
        if (uSizeLoc) {
            gl.uniform2fv(uSizeLoc, this._size);
        }

        // 3. Upload model transform, billboard orientation, and sizing uniforms
        shader.setMat4("u_modelMatrix", this.worldMatrix);
        shader.setInt("u_billboardMode", this.billboardMode);
        shader.setInt("u_sizeMode", this.sizeMode);

        const minPixels = this.sizeClamping?.minPixels ?? DEFAULT_UNCLAMPED_MIN_PIXELS;
        const maxPixels = this.sizeClamping?.maxPixels ?? DEFAULT_UNCLAMPED_MAX_PIXELS;
        shader.setVec2("u_sizeClamping", minPixels, maxPixels);

        shader.setVec2("u_viewportSize", dimensions.width, dimensions.height);

        // 4. Issue draw call for shared unit quad geometry
        contextManager.geometries.draw(this.geometry);
    }
}
