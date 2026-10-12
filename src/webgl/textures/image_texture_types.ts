import type { TextureOptions, TextureSource } from "./texture_types";

/**
 * Configuration options for constructing or updating an ImageTexture.
 */
export interface ImageTextureOptions extends TextureOptions {
    /** Image source element, bitmap, canvas, or URL string */
    source?: TextureSource | string;
}
