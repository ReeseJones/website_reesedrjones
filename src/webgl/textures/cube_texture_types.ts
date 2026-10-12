import type { IWebGLResource } from "../core/resource_types";
import type { TextureFilter, TextureUnit, TextureWrap } from "./texture_types";

/**
 * Six face sources for a WebGL cubemap.
 * Each face can be a URL string, HTMLImageElement, or ImageBitmap.
 */
export interface CubeTextureFaces {
    posX: string | HTMLImageElement | ImageBitmap;
    negX: string | HTMLImageElement | ImageBitmap;
    posY: string | HTMLImageElement | ImageBitmap;
    negY: string | HTMLImageElement | ImageBitmap;
    posZ: string | HTMLImageElement | ImageBitmap;
    negZ: string | HTMLImageElement | ImageBitmap;
}

/**
 * Configuration options for initializing a CubeTexture.
 */
export interface CubeTextureOptions {
    /** The 6 image sources for +X, -X, +Y, -Y, +Z, -Z faces */
    faces: CubeTextureFaces;
    /** Minification filter preset or WebGL constant (defaults to "linear_mipmap_linear") */
    minFilter?: TextureFilter | number;
    /** Magnification filter preset or WebGL constant (defaults to "linear") */
    magFilter?: TextureFilter | number;
    /** Horizontal wrap mode (defaults to "clamp_to_edge") */
    wrapS?: TextureWrap;
    /** Vertical wrap mode (defaults to "clamp_to_edge") */
    wrapT?: TextureWrap;
    /** Depth wrap mode (defaults to "clamp_to_edge") */
    wrapR?: TextureWrap;
    /** Whether to automatically generate mipmaps upon upload (defaults to true) */
    generateMipmaps?: boolean;
    /** Optional debugging label */
    label?: string;
}

/**
 * Pure WebGL 2 cubemap texture interface.
 */
export interface ICubeTexture extends IWebGLResource {
    /** Unique debug label */
    readonly label: string;
    /** Native WebGLTexture handle or null if unallocated/disposed */
    readonly handle: WebGLTexture | null;
    /** Whether all 6 face textures have finished loading and decoding */
    readonly isReady: boolean;
    /** Face definitions configured for this cubemap */
    readonly faces: CubeTextureFaces;

    /** Asynchronously loads and decodes all 6 face images in parallel */
    load(): Promise<void>;
    /** Allocates the GPU cubemap texture and uploads images or 1x1 fallback */
    init(gl: WebGL2RenderingContext): void;
    /** Binds texture to a hardware texture unit */
    bind(unit?: TextureUnit | number): void;
    /** Unbinds texture from a hardware texture unit */
    unbind(unit?: TextureUnit | number): void;
}
