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
    /** Minification filter (defaults to gl.LINEAR_MIPMAP_LINEAR) */
    minFilter?: number;
    /** Magnification filter (defaults to gl.LINEAR) */
    magFilter?: number;
    /** Whether to automatically generate mipmaps upon upload (defaults to true) */
    generateMipmaps?: boolean;
    /** Optional debugging label */
    label?: string;
}

import type { IWebGLResource } from "../core/resource_types";

/**
 * Pure WebGL 2 cubemap texture interface.
 */
export interface ICubeTexture extends IWebGLResource {
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
}
