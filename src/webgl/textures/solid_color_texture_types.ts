import type { BaseTextureOptions } from "./base_texture_types";

/**
 * Options for configuring a SolidColorTexture.
 */
export interface SolidColorTextureOptions extends BaseTextureOptions {
    /** Red channel (0 - 255) */
    r?: number;
    /** Green channel (0 - 255) */
    g?: number;
    /** Blue channel (0 - 255) */
    b?: number;
    /** Alpha channel (0 - 255, defaults to 255) */
    a?: number;
}
