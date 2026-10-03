import type { IWebGLContextManager } from "./context_manager_types";
import type { ITexture, TextureFilter, TextureOptions, TextureSource, TextureWrap } from "./texture_types";

/**
 * Pure WebGL2 texture resource abstraction with immediate 1x1 fallback,
 * asynchronous image decoding, filtering, mipmapping, and context recovery.
 */
export class Texture implements ITexture {
    public readonly label: string;
    public readonly options: Readonly<TextureOptions>;

    private _contextManager: IWebGLContextManager;
    private _handle: WebGLTexture | null = null;
    private _width: number = 1;
    private _height: number = 1;
    private _isLoaded: boolean = false;
    private _source: TextureSource | string | null = null;
    private _cachedImage: HTMLImageElement | null = null;

    constructor(contextManager: IWebGLContextManager, options?: TextureOptions) {
        this._contextManager = contextManager;
        this.label = options?.label ?? "Texture";
        this.options = {
            wrapS: options?.wrapS ?? "clamp_to_edge",
            wrapT: options?.wrapT ?? "clamp_to_edge",
            minFilter: options?.minFilter ?? "linear_mipmap_linear",
            magFilter: options?.magFilter ?? "linear",
            flipY: options?.flipY ?? true,
            generateMipmaps: options?.generateMipmaps ?? true,
            label: options?.label,
        };

        const gl = this._contextManager.getContext();
        if (gl) {
            this.initFallback(gl);
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
     * Binds this texture to a specific hardware texture unit (defaults to Unit 0).
     */
    public bind(unit: number = 0): void {
        this._contextManager.bindTexture(unit, this._handle);
    }

    /**
     * Re-uploads pixel data from the stored image or canvas source.
     */
    public updateFromSource(): void {
        const gl = this._contextManager.getContext();
        if (!gl || !this._handle) return;

        const source = this._cachedImage ?? (typeof this._source !== "string" ? this._source : null);
        if (source) {
            this.uploadSource(gl, source);
        }
    }

    /**
     * Disposes of GPU texture memory.
     */
    public destroy(): void {
        const gl = this._contextManager.getContext();
        if (gl && this._handle) {
            gl.deleteTexture(this._handle);
        }
        this._handle = null;
        this._isLoaded = false;
    }

    public onContextLost(): void {
        this._handle = null;
    }

    public onContextRestored(gl: WebGL2RenderingContext): void {
        this.initFallback(gl);
        this.updateFromSource();
    }

    // --- Private Setup & Upload Helpers ---

    private initFallback(gl: WebGL2RenderingContext): void {
        const handle = gl.createTexture();
        if (!handle) return;

        this._handle = handle;
        this._width = 1;
        this._height = 1;

        // Temporarily bind via contextManager to isolate state
        this._contextManager.bindTexture(0, handle);

        // Upload 1x1 white pixel [255, 255, 255, 255]
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
    }

    private uploadSource(gl: WebGL2RenderingContext, source: TextureSource): void {
        if (!this._handle) {
            this._handle = gl.createTexture();
            if (!this._handle) return;
        }

        this._contextManager.bindTexture(0, this._handle);

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

        this._width = source.width;
        this._height = source.height;
        this._isLoaded = true;
    }

    // --- Static Factory Constructors ---

    /**
     * Loads a texture asynchronously from a URL string (such as an ESM image import).
     */
    public static fromUrl(
        contextManager: IWebGLContextManager,
        url: string,
        options?: TextureOptions
    ): Texture {
        const tex = new Texture(contextManager, options);
        tex._source = url;

        if (typeof Image !== "undefined") {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;

            img.decode()
                .then(() => {
                    tex._cachedImage = img;
                    const gl = contextManager.getContext();
                    if (gl) {
                        tex.uploadSource(gl, img);
                    }
                })
                .catch((err) => {
                    console.error(`[Texture] Failed to decode image from '${url}':`, err);
                });
        }

        return tex;
    }

    /**
     * Instantiates a texture from an already-decoded HTMLImageElement.
     */
    public static fromImage(
        contextManager: IWebGLContextManager,
        image: HTMLImageElement,
        options?: TextureOptions
    ): Texture {
        const tex = new Texture(contextManager, options);
        tex._source = image;
        tex._cachedImage = image;

        const gl = contextManager.getContext();
        if (gl) {
            tex.uploadSource(gl, image);
        }

        return tex;
    }

    /**
     * Instantiates a texture from an HTMLCanvasElement.
     */
    public static fromCanvas(
        contextManager: IWebGLContextManager,
        canvas: HTMLCanvasElement,
        options?: TextureOptions
    ): Texture {
        const tex = new Texture(contextManager, options);
        tex._source = canvas;

        const gl = contextManager.getContext();
        if (gl) {
            tex.uploadSource(gl, canvas);
        }

        return tex;
    }

    /**
     * Creates a 1x1 solid color texture.
     */
    public static createSolidColor(
        contextManager: IWebGLContextManager,
        r: number,
        g: number,
        b: number,
        a: number = 255,
        options?: TextureOptions
    ): Texture {
        const tex = new Texture(contextManager, options);
        const gl = contextManager.getContext();
        if (gl && tex.handle) {
            contextManager.bindTexture(0, tex.handle);
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([r, g, b, a])
            );
            tex._isLoaded = true;
        }
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
