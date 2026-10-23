import type { TextureOptions, TextureSource } from "./texture_types";

/**
 * Configuration options for constructing or updating an ImageTexture.
 */
export interface ImageTextureOptions extends TextureOptions {
    /** Image source element, bitmap, canvas, or URL string */
    source?: TextureSource | string;
    /** Callback invoked when an asynchronous image successfully loads and uploads to GPU */
    onLoad?: () => void;
}
