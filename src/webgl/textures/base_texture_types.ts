import type { IDisposable } from "../core/subsystem_types";
import type { TextureFilter, TextureTarget, TextureUnit, TextureWrap } from "./texture_types";

/**
 * Common configuration options for WebGL texture resources.
 */
export interface BaseTextureOptions {
    /** Horizontal wrap mode (defaults to "clamp_to_edge") */
    wrapS?: TextureWrap;
    /** Vertical wrap mode (defaults to "clamp_to_edge") */
    wrapT?: TextureWrap;
    /** Minification filter (defaults to "linear_mipmap_linear" or "nearest") */
    minFilter?: TextureFilter;
    /** Magnification filter (defaults to "linear" or "nearest") */
    magFilter?: TextureFilter;
    /** Whether to flip the Y axis to match WebGL UV coordinates (defaults to true) */
    flipY?: boolean;
    /** Whether to generate mipmaps when dimensions allow (defaults to false or true based on subclass) */
    generateMipmaps?: boolean;
    /** Human-readable label for debugging and diagnostics */
    label?: string;
    /** Target WebGL texture binding target (e.g. TextureTarget.Texture2D, TextureTarget.CubeMap) */
    target?: TextureTarget;
}

/**
 * Common public interface for managed WebGL texture resources.
 */
export interface IBaseTexture extends IDisposable {
    /** Unique debug label */
    readonly label: string;

    /** WebGL texture binding target (e.g. TextureTarget.Texture2D or TextureTarget.CubeMap) */
    readonly target: TextureTarget;

    /** Underlying WebGLTexture GPU handle (null if unallocated or context lost) */
    readonly handle: WebGLTexture | null;

    /** Width in pixels */
    readonly width: number;

    /** Height in pixels */
    readonly height: number;

    /** Whether the texture content is ready for sampling */
    readonly isLoaded: boolean;

    /** Active configuration options */
    readonly options: Readonly<BaseTextureOptions>;

    /** Allocates GPU resources and uploads texture data */
    init(gl: WebGL2RenderingContext): void;

    /** Binds texture to a hardware texture unit */
    bind(unit?: TextureUnit | number): void;

    /** Unbinds texture from a hardware texture unit */
    unbind(unit?: TextureUnit | number): void;

    /** Re-uploads pixel data from CPU or source */
    updateFromSource(): void;

    /** Releases GPU texture memory */
    destroy(): void;

    /** WebGL context lost lifecycle hook */
    onContextLost(): void;

    /** WebGL context restored lifecycle hook */
    onContextRestored(gl: WebGL2RenderingContext): void;
}

