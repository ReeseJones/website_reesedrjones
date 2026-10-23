import type { IRenderable } from "../core/renderable_types";
import type { Vector2Like } from "../../maths/vector_types";
import type { ISpriteMaterial } from "./sprite_material_types";
import type { ISpriteGeometry } from "./sprite_geometry_types";

export enum BillboardMode {
    Spherical = 0,
    Cylindrical = 1,
}

export enum SpriteSizeMode {
    ScreenSpace = 0,
    WorldSpace = 1,
    ClampedScreenSpace = 2,
}

export interface SpriteSizeClamping {
    minPixels: number;
    maxPixels: number;
}

export interface SpriteInstanceOptions {
    /** Normalized 2D anchor pivot point (default: { x: 0.5, y: 0.0 } for pins) */
    anchor?: Vector2Like;

    /** Dimensions: [width, height] in screen pixels or world units (default: { x: 32, y: 32 }) */
    size?: Vector2Like;

    /** Active sizing paradigm (default: SpriteSizeMode.ScreenSpace) */
    sizeMode?: SpriteSizeMode;

    /** Sizing bounds when using SpriteSizeMode.ClampedScreenSpace */
    sizeClamping?: SpriteSizeClamping;

    /** Billboarding rotation constraint (default: BillboardMode.Spherical) */
    billboardMode?: BillboardMode;

    /** Active visual appearance material */
    material: ISpriteMaterial;

    /** Optional custom render order override */
    renderOrder?: number;
}

export interface ISpriteInstance extends IRenderable {
    /** Normalized 2D anchor pivot point */
    getAnchor(out?: Vector2Like): Vector2Like;
    setAnchor(anchor: Vector2Like): this;
    setAnchor(x: number, y: number): this;

    /** Dimensions: width and height in screen pixels or world units */
    getSize(out?: Vector2Like): Vector2Like;
    setSize(size: Vector2Like): this;
    setSize(width: number, height: number): this;

    /** Active sizing paradigm (default: SpriteSizeMode.ScreenSpace) */
    sizeMode: SpriteSizeMode;

    /** Sizing bounds when using SpriteSizeMode.ClampedScreenSpace */
    sizeClamping?: SpriteSizeClamping;

    /** Billboarding rotation constraint (default: BillboardMode.Spherical) */
    billboardMode: BillboardMode;

    /** Active visual appearance material (e.g. SpritePinMaterial or SpriteTextureMaterial) */
    material: ISpriteMaterial;

    /** Shared static geometry quad descriptor */
    readonly geometry: ISpriteGeometry;
}
