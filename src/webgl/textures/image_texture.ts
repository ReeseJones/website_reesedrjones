import { Texture } from "./texture";
import type { ImageTextureOptions } from "./image_texture_types";
import {
    TextureTarget,
    type TextureSource,
} from "./texture_types";

/**
 * Image-based WebGL2 texture resource abstraction with immediate 1x1 fallback,
 * asynchronous image decoding, filtering, mipmapping, and automatic context recovery.
 * Extends Texture for unified GPU texture handle and binding lifecycle.
 */
export class ImageTexture extends Texture {
    private _source: TextureSource | string | null = null;
    private _cachedImage: HTMLImageElement | null = null;
    private readonly _onLoadCallback?: () => void;
    private readonly _onLoadCallbacks: Set<() => void> = new Set();

    /**
     * @param sourceOrOptions Asset URL string, image source, or configuration options object.
     * @param extraOptions Optional additional options when source is provided as first argument.
     */
    constructor(
        sourceOrOptions?: string | TextureSource | ImageTextureOptions,
        extraOptions?: ImageTextureOptions
    ) {
        let resolvedOptions: ImageTextureOptions = {};

        if (typeof sourceOrOptions === "string" || (sourceOrOptions && "width" in sourceOrOptions)) {
            resolvedOptions = extraOptions ?? {};
        } else if (sourceOrOptions) {
            resolvedOptions = sourceOrOptions as ImageTextureOptions;
        } else if (extraOptions) {
            resolvedOptions = extraOptions;
        }

        const generateMipmaps = resolvedOptions.generateMipmaps ?? false;
        const defaultMin = generateMipmaps ? "linear_mipmap_linear" : "linear";

        super({
            wrapS: resolvedOptions.wrapS ?? "clamp_to_edge",
            wrapT: resolvedOptions.wrapT ?? "clamp_to_edge",
            minFilter: resolvedOptions.minFilter ?? defaultMin,
            magFilter: resolvedOptions.magFilter ?? "linear",
            flipY: resolvedOptions.flipY ?? true,
            generateMipmaps,
            label: resolvedOptions.label ?? "ImageTexture",
            target: TextureTarget.Texture2D,
        });

        this._onLoadCallback = resolvedOptions.onLoad;

        if (typeof sourceOrOptions === "string" || (sourceOrOptions && "width" in sourceOrOptions)) {
            this._source = sourceOrOptions as TextureSource | string;
        } else if (sourceOrOptions) {
            this._source = resolvedOptions.source ?? null;
        }

        if (typeof this._source === "string") {
            this._loadImage(this._source);
        } else if (this._source && "src" in this._source) {
            this._cachedImage = this._source as HTMLImageElement;
            this._isLoaded = true;
            this._onLoadCallback?.();
        } else if (this._source) {
            this._isLoaded = true;
            this._onLoadCallback?.();
        }
    }

    /**
     * Re-uploads pixel data from the stored image or canvas source.
     */
    public override updateFromSource(): void {
        if (!this._gl || !this._handle || this._gl.isContextLost()) return;

        const source = this._cachedImage ?? (typeof this._source !== "string" ? this._source : null);
        if (source) {
            this.uploadSource(this._gl, source);
        }
    }

    /**
     * Releases GPU texture memory and resets loading state.
     */
    /** Registers a callback fired when the image successfully decodes and uploads. */
    public onLoad(callback: () => void): () => void {
        if (this._isLoaded) {
            callback();
            return () => {};
        }
        this._onLoadCallbacks.add(callback);
        return () => {
            this._onLoadCallbacks.delete(callback);
        };
    }

    public override dispose(): void {
        super.dispose();
        this._isLoaded = false;
        this._onLoadCallbacks.clear();
    }

    // --- Protected / Private Helpers ---

    protected uploadToGPU(gl: WebGL2RenderingContext): void {
        const source = this._cachedImage ?? (typeof this._source !== "string" ? this._source : null);
        if (this._isLoaded && source) {
            this.uploadSource(gl, source);
        } else {
            this.initFallback(gl);
        }
    }

    private _loadImage(url: string): void {
        if (typeof Image === "undefined") return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;

        img.decode()
            .then(() => {
                this._cachedImage = img;
                this._isLoaded = true;
                if (this._gl && this._handle && !this._gl.isContextLost()) {
                    this.uploadSource(this._gl, img);
                }
                this._onLoadCallback?.();
                for (const cb of this._onLoadCallbacks) {
                    cb();
                }
            })
            .catch((err) => {
                console.error(`[ImageTexture] Failed to decode image from '${url}':`, err);
            });
    }

    private initFallback(gl: WebGL2RenderingContext): void {
        const fallbackPixel = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(
            this.target,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            fallbackPixel
        );

        gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    private uploadSource(gl: WebGL2RenderingContext, source: TextureSource): void {
        if (!this._handle) return;

        gl.bindTexture(this.target, this._handle);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.options.flipY ?? true);
        gl.texImage2D(this.target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

        this.applySamplerParameters(gl);

        if (this.options.generateMipmaps) {
            gl.generateMipmap(this.target);
        }

        gl.bindTexture(this.target, null);

        this._width = source.width;
        this._height = source.height;
        this._isLoaded = true;
        this.notifyUpdate();
    }

    // --- Static Factory Constructors ---

    /**
     * Loads a texture asynchronously from a URL string.
     */
    public static fromUrl(url: string, options?: ImageTextureOptions): ImageTexture {
        return new ImageTexture(url, options);
    }

    /**
     * Instantiates a texture from an already-decoded HTMLImageElement.
     */
    public static fromImage(image: HTMLImageElement, options?: ImageTextureOptions): ImageTexture {
        return new ImageTexture(image, options);
    }

    /**
     * Instantiates a texture from an HTMLCanvasElement.
     */
    public static fromCanvas(canvas: HTMLCanvasElement, options?: ImageTextureOptions): ImageTexture {
        return new ImageTexture(canvas, options);
    }
}
