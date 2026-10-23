import type { IMaterial, MaterialOptions } from "../materials/material_types";
import type { RgbaLike } from "../../helpers/colors_types";
import type { ITexture } from "../../webgl/textures/texture_types";

/**
 * Base contract for camera-facing billboard sprite materials.
 */
export interface ISpriteMaterial extends IMaterial {
    /** Color tint multiplied against the sprite output */
    getTint(out?: RgbaLike): RgbaLike;
    setTint(tint: RgbaLike): this;
    setTint(r: number, g: number, b: number, a?: number): this;

    /** Convenience toggle for depth testing / overlay queue placement */
    alwaysOnTop: boolean;
}

/**
 * Common configuration options for initializing any SpriteMaterial.
 */
export interface SpriteMaterialOptions extends Omit<MaterialOptions, "shaderKey"> {
    tint?: RgbaLike;
    alwaysOnTop?: boolean;
}

/**
 * Contract for mathematically rendered procedural Signed Distance Field (SDF) pins.
 */
export interface ISpritePinMaterial extends ISpriteMaterial {
    /** Color of the inner circular core indicator */
    getInnerColor(out?: RgbaLike): RgbaLike;
    setInnerColor(color: RgbaLike): this;
    setInnerColor(r: number, g: number, b: number, a?: number): this;

    /** Normalized radius of the inner circular core indicator */
    innerRadius: number;

    /** Soft drop shadow / glow halo width outside the pin perimeter */
    haloWidth: number;
}

export interface SpritePinMaterialOptions extends SpriteMaterialOptions {
    innerColor?: RgbaLike;
    innerRadius?: number;
    haloWidth?: number;
}

/**
 * Contract for raster textured billboard sprites.
 */
export interface ISpriteTextureMaterial extends ISpriteMaterial {
    /** 2D texture bound to TextureUnit.Color */
    texture: ITexture | null;

    /** Cutoff alpha threshold below which fragments are discarded */
    alphaCutoff: number;
}

export interface SpriteTextureMaterialOptions extends SpriteMaterialOptions {
    texture?: ITexture | null;
    alphaCutoff?: number;
}
