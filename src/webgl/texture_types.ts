/**
 * WebGL texture magnification and minification filter presets.
 */
export type TextureFilter =
    | "nearest"
    | "linear"
    | "nearest_mipmap_nearest"
    | "linear_mipmap_nearest"
    | "nearest_mipmap_linear"
    | "linear_mipmap_linear";

/**
 * WebGL texture wrapping modes for S and T coordinates.
 */
export type TextureWrap = "clamp_to_edge" | "repeat" | "mirrored_repeat";

/**
 * Pixel data formats supported for texture allocation.
 */
export type TextureFormat = "rgba" | "rgb" | "alpha" | "luminance";

/**
 * Supported image source types for texture loading.
 */
export type TextureSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap | ImageData;

/**
 * Configuration options for constructing or updating a Texture.
 */
export interface TextureOptions {
    /** Horizontal wrap mode (defaults to "clamp_to_edge") */
    wrapS?: TextureWrap;
    /** Vertical wrap mode (defaults to "clamp_to_edge") */
    wrapT?: TextureWrap;
    /** Minification filter (defaults to "linear_mipmap_linear") */
    minFilter?: TextureFilter;
    /** Magnification filter (defaults to "linear") */
    magFilter?: TextureFilter;
    /** Whether to flip the Y axis to match WebGL UV coordinates (defaults to true) */
    flipY?: boolean;
    /** Whether to generate mipmaps when dimensions allow (defaults to true) */
    generateMipmaps?: boolean;
    /** Human-readable label for debugging and context logging */
    label?: string;
}

/**
 * Public contract for managed WebGL texture resources.
 */
export interface ITexture {
    /** Unique debug label */
    readonly label: string;

    /** Underlying WebGLTexture GPU handle (null if context lost or unallocated) */
    readonly handle: WebGLTexture | null;

    /** Width in pixels (1 before image decode completes) */
    readonly width: number;

    /** Height in pixels (1 before image decode completes) */
    readonly height: number;

    /** Whether the full source asset has finished loading and uploading */
    readonly isLoaded: boolean;

    /** Active configuration options */
    readonly options: Readonly<TextureOptions>;

    /** Binds texture to a specific hardware texture unit via context manager */
    bind(unit?: number): void;

    /** Releases GPU texture memory */
    destroy(): void;

    /** WebGL context lost lifecycle hook */
    onContextLost(): void;

    /** WebGL context restored lifecycle hook */
    onContextRestored(gl: WebGL2RenderingContext): void;
}
