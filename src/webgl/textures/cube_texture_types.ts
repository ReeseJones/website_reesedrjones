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

import type { IDisposable } from "../core/subsystem_types";

/**
 * Pure WebGL 2 cubemap texture interface.
 */
export interface ICubeTexture extends IDisposable {
    /** Native WebGLTexture handle or null if unallocated/destroyed */
    readonly handle: WebGLTexture | null;
    /** Whether all 6 face textures have finished loading and decoding */
    readonly isReady: boolean;
    /** Whether the texture resource has been permanently destroyed */
    readonly isDestroyed: boolean;
    /** Face definitions configured for this cubemap */
    readonly faces: CubeTextureFaces;

    /** Asynchronously loads and decodes all 6 face images in parallel */
    load(): Promise<void>;
    /** Allocates the GPU cubemap texture and uploads images or 1x1 fallback */
    init(gl: WebGL2RenderingContext): void;
    /** Releases the GPU texture handle */
    destroy(): void;
    /** Handles context loss by clearing GPU handles */
    onContextLost(): void;
    /** Re-allocates and re-uploads cubemap data upon context restoration */
    onContextRestored(gl: WebGL2RenderingContext): void;
}
