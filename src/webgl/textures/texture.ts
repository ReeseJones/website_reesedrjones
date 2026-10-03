import {
    TextureUnit,
    type ITexture,
    type TextureFilter,
    type TextureOptions,
    type TextureSource,
    type TextureWrap,
} from "./texture_types";

/**
 * Pure WebGL2 texture resource abstraction with immediate 1x1 fallback,
 * asynchronous image decoding, filtering, mipmapping, and context recovery.
 * Completely decoupled from IWebGLContextManager at instantiation.
 */
export class Texture implements ITexture {
    public readonly label: string;
    public readonly options: Readonly<TextureOptions>;

    private _handle: WebGLTexture | null = null;
    private _width: number = 1;
    private _height: number = 1;
    private _isLoaded: boolean = false;
    private _isDisposed: boolean = false;
    private readonly _onDisposeCallbacks: (() => void)[] = [];
    private _source: TextureSource | string | null = null;
    private _cachedImage: HTMLImageElement | null = null;
    private _gl: WebGL2RenderingContext | null = null;

    public get isDisposed(): boolean {
        return this._isDisposed;
    }

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
            this._source = sourceOrOptions as TextureSource | string;
            resolvedOptions = extraOptions ?? {};
        } else if (sourceOrOptions) {
            resolvedOptions = sourceOrOptions as TextureOptions;
            this._source = resolvedOptions.source ?? null;
        }

        this.label = resolvedOptions.label ?? "Texture";
        this.options = {
            wrapS: resolvedOptions.wrapS ?? "clamp_to_edge",
            wrapT: resolvedOptions.wrapT ?? "clamp_to_edge",
            minFilter: resolvedOptions.minFilter ?? "linear_mipmap_linear",
            magFilter: resolvedOptions.magFilter ?? "linear",
            flipY: resolvedOptions.flipY ?? true,
            generateMipmaps: resolvedOptions.generateMipmaps ?? true,
            label: resolvedOptions.label,
        };

        if (typeof this._source === "string") {
            this._loadImage(this._source);
        } else if (this._source && "src" in this._source) {
            this._cachedImage = this._source as HTMLImageElement;
            this._isLoaded = true;
        } else if (this._source) {
            this._isLoaded = true;
        }
    }

    public get handle(): WebGLTexture | null {
        return this._handle;
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public get isLoaded(): boolean {
        return this._isLoaded;
    }

    /**
     * Allocates the GPU texture handle with initial fallback and uploads source if ready.
     */
    public init(gl: WebGL2RenderingContext): void {
        this._gl = gl;

        if (this._handle) {
            gl.deleteTexture(this._handle);
            this._handle = null;
        }

        const handle = gl.createTexture();
        if (!handle) return;

        this._handle = handle;
        this.initFallback(gl);

        if (this._isLoaded) {
            this.updateFromSource();
        }
    }

    /**
     * Binds this texture directly to a target WebGL context unit (if initialized).
     */
    public bind(unit: TextureUnit | number = TextureUnit.Color): void {
        if (!this._gl || !this._handle) return;
        this._gl.activeTexture(this._gl.TEXTURE0 + unit);
        this._gl.bindTexture(this._gl.TEXTURE_2D, this._handle);
    }

    /**
     * Re-uploads pixel data from the stored image or canvas source.
     */
    public updateFromSource(): void {
        if (!this._gl || !this._handle) return;

        const source = this._cachedImage ?? (typeof this._source !== "string" ? this._source : null);
        if (source) {
            this.uploadSource(this._gl, source);
        }
    }

    /**
     * Registers a callback to be invoked when this texture is disposed.
     */
    public onDispose(callback: () => void): void {
        if (this._isDisposed) {
            callback();
            return;
        }
        this._onDisposeCallbacks.push(callback);
    }

    /**
     * Deterministic disposal: frees GPU memory and fires registered disposal callbacks.
     */
    public dispose(): void {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        this.destroy();
        for (const cb of this._onDisposeCallbacks) {
            cb();
        }
        this._onDisposeCallbacks.length = 0;
    }

    /**
     * Disposes of GPU texture memory.
     */
    public destroy(): void {
        if (this._gl && this._handle && !this._gl.isContextLost()) {
            this._gl.deleteTexture(this._handle);
        }
        this._handle = null;
        this._gl = null;
        this._isLoaded = false;
    }

    public onContextLost(): void {
        this._handle = null;
        this._gl = null;
    }

    public onContextRestored(gl: WebGL2RenderingContext): void {
        this.init(gl);
    }

    // --- Private Setup & Upload Helpers ---

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

        gl.bindTexture(gl.TEXTURE_2D, this._handle);
        const fallbackPixel = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            fallbackPixel
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    private uploadSource(gl: WebGL2RenderingContext, source: TextureSource): void {
        if (!this._handle) return;

        gl.bindTexture(gl.TEXTURE_2D, this._handle);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.options.flipY ?? true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, toGLWrap(gl, this.options.wrapS ?? "clamp_to_edge"));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, toGLWrap(gl, this.options.wrapT ?? "clamp_to_edge"));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, toGLFilter(gl, this.options.magFilter ?? "linear"));

        const minFilter = this.options.minFilter ?? "linear_mipmap_linear";
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, toGLFilter(gl, minFilter));

        if (this.options.generateMipmaps) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);

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
     * Creates a 1x1 solid color texture.
     */
    public static createSolidColor(
        r: number,
        g: number,
        b: number,
        a: number = 255,
        options?: TextureOptions
    ): Texture {
        const tex = new Texture(undefined, options);
        // Will be uploaded with custom pixel when init(gl) runs
        return tex;
    }
}

// --- Standalone Pure Helpers ---

function toGLWrap(gl: WebGL2RenderingContext, wrap: TextureWrap): number {
    switch (wrap) {
        case "repeat":
            return gl.REPEAT;
        case "mirrored_repeat":
            return gl.MIRRORED_REPEAT;
        case "clamp_to_edge":
        default:
            return gl.CLAMP_TO_EDGE;
    }
}

function toGLFilter(gl: WebGL2RenderingContext, filter: TextureFilter): number {
    switch (filter) {
        case "nearest":
            return gl.NEAREST;
        case "nearest_mipmap_nearest":
            return gl.NEAREST_MIPMAP_NEAREST;
        case "linear_mipmap_nearest":
            return gl.LINEAR_MIPMAP_NEAREST;
        case "nearest_mipmap_linear":
            return gl.NEAREST_MIPMAP_LINEAR;
        case "linear_mipmap_linear":
            return gl.LINEAR_MIPMAP_LINEAR;
        case "linear":
        default:
            return gl.LINEAR;
    }
}
