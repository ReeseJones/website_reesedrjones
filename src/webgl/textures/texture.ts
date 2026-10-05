import { BaseTexture } from "./base_texture";
import { SolidColorTexture } from "./solid_color_texture";
import {
    TextureTarget,
    type TextureOptions,
    type TextureSource,
} from "./texture_types";

/**
 * Image-based WebGL2 texture resource abstraction with immediate 1x1 fallback,
 * asynchronous image decoding, filtering, mipmapping, and automatic context recovery.
 * Extends BaseTexture for unified GPU texture handle and binding lifecycle.
 */
export class Texture extends BaseTexture {
    private _source: TextureSource | string | null = null;
    private _cachedImage: HTMLImageElement | null = null;

    /**
     * @param sourceOrOptions Asset URL string, image source, or configuration options object.
     * @param extraOptions Optional additional options when source is provided as first argument.
     */
    constructor(
        sourceOrOptions?: string | TextureSource | TextureOptions,
        extraOptions?: TextureOptions
    ) {
        let resolvedOptions: TextureOptions = {};

        if (typeof sourceOrOptions === "string" || (sourceOrOptions && "width" in sourceOrOptions)) {
            resolvedOptions = extraOptions ?? {};
        } else if (sourceOrOptions) {
            resolvedOptions = sourceOrOptions as TextureOptions;
        }

        super({
            wrapS: resolvedOptions.wrapS ?? "clamp_to_edge",
            wrapT: resolvedOptions.wrapT ?? "clamp_to_edge",
            minFilter: resolvedOptions.minFilter ?? "linear_mipmap_linear",
            magFilter: resolvedOptions.magFilter ?? "linear",
            flipY: resolvedOptions.flipY ?? true,
            generateMipmaps: resolvedOptions.generateMipmaps ?? true,
            label: resolvedOptions.label ?? "Texture",
            target: TextureTarget.Texture2D,
        });

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
        } else if (this._source) {
            this._isLoaded = true;
        }
    }

    /**
     * Re-uploads pixel data from the stored image or canvas source.
     */
    public override updateFromSource(): void {
        if (!this._gl || !this._handle) return;

        const source = this._cachedImage ?? (typeof this._source !== "string" ? this._source : null);
        if (source) {
            this.uploadSource(this._gl, source);
        }
    }

    /**
     * Releases GPU texture memory and resets loading state.
     */
    public override dispose(): void {
        super.dispose();
        this._isLoaded = false;
    }

    // --- Protected / Private Helpers ---

    protected uploadGPU(gl: WebGL2RenderingContext): void {
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
            })
            .catch((err) => {
                console.error(`[Texture] Failed to decode image from '${url}':`, err);
            });
    }

    private initFallback(gl: WebGL2RenderingContext): void {
        if (!this._handle) return;

        gl.bindTexture(this.target, this._handle);
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
        gl.bindTexture(this.target, null);
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
    }

    // --- Static Factory Constructors ---

    /**
     * Loads a texture asynchronously from a URL string.
     */
    public static fromUrl(url: string, options?: TextureOptions): Texture {
        return new Texture(url, options);
    }

    /**
     * Instantiates a texture from an already-decoded HTMLImageElement.
     */
    public static fromImage(image: HTMLImageElement, options?: TextureOptions): Texture {
        return new Texture(image, options);
    }

    /**
     * Instantiates a texture from an HTMLCanvasElement.
     */
    public static fromCanvas(canvas: HTMLCanvasElement, options?: TextureOptions): Texture {
        return new Texture(canvas, options);
    }

    /**
     * Creates a 1x1 solid color texture implementing ITexture.
     */
    public static createSolidColor(
        r: number,
        g: number,
        b: number,
        a: number = 255,
        options?: TextureOptions
    ): SolidColorTexture {
        return new SolidColorTexture(r, g, b, a, options);
    }
}
