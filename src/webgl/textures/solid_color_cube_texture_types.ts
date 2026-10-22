import type { RgbLike, RgbaLike } from "../../helpers/colors_types";
import type { TextureOptions } from "./texture_types";

/**
 * Options for configuring a SolidColorCubeTexture.
 */
export interface SolidColorCubeTextureOptions extends TextureOptions {
    /** Color as RgbLike or RgbaLike */
    color?: RgbLike | RgbaLike;
    /** Red channel (0 - 255) */
    r?: number;
    /** Green channel (0 - 255) */
    g?: number;
    /** Blue channel (0 - 255) */
    b?: number;
    /** Alpha channel (0 - 255, defaults to 255) */
    a?: number;
}

