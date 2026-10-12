import {
    TextureTarget,
    TextureUnit,
    type ITexture,
    type TextureFilter,
    type TextureOptions,
    type TextureWrap,
} from "./texture_types";

/**
 * Resolves high-level wrap mode to WebGL constant.
 */
export function resolveWrapMode(gl: WebGL2RenderingContext, wrap: TextureWrap): number {
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

/**
 * Resolves high-level filter mode to WebGL constant.
 */
export function resolveFilterMode(gl: WebGL2RenderingContext, filter: TextureFilter): number {
    switch (filter) {
        case "nearest":
            return gl.NEAREST;
        case "linear":
            return gl.LINEAR;
        case "nearest_mipmap_nearest":
            return gl.NEAREST_MIPMAP_NEAREST;
        case "linear_mipmap_nearest":
            return gl.LINEAR_MIPMAP_NEAREST;
        case "nearest_mipmap_linear":
            return gl.NEAREST_MIPMAP_LINEAR;
        case "linear_mipmap_linear":
        default:
            return gl.LINEAR_MIPMAP_LINEAR;
    }
}

/**
 * Applies wrap and filter sampling parameters to a bound WebGL texture target.
 */
export function applySamplerParameters(
    gl: WebGL2RenderingContext,
    target: TextureTarget,
    options: TextureOptions
): void {
    const wrapS = resolveWrapMode(gl, options.wrapS ?? "clamp_to_edge");
    const wrapT = resolveWrapMode(gl, options.wrapT ?? "clamp_to_edge");
    const minFilter = resolveFilterMode(gl, options.minFilter ?? "linear_mipmap_linear");
    const magFilter = resolveFilterMode(gl, options.magFilter ?? "linear");

    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
    if (target === TextureTarget.CubeMap || target === TextureTarget.Texture3D) {
        const wrapR = resolveWrapMode(gl, options.wrapR ?? "clamp_to_edge");
        gl.texParameteri(target, gl.TEXTURE_WRAP_R, wrapR);
    }
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);
}

/**
 * Abstract base class for all WebGL2 texture resources.
 * Manages GPU handle lifecycle, parameter configuration, binding, context recovery,
 * and deterministic disposal.
 */
export abstract class Texture implements ITexture {
    public readonly label: string;
    public readonly target: TextureTarget;
    public readonly options: Readonly<TextureOptions>;

    protected _handle: WebGLTexture | null = null;
    protected _width: number = 1;
    protected _height: number = 1;
    protected _isLoaded: boolean = false;
    protected _isDisposed: boolean = false;
    protected _gl: WebGL2RenderingContext | null = null;
    private readonly _onDisposeCallbacks: (() => void)[] = [];

    constructor(options: TextureOptions = {}) {
        this.label = options.label ?? "Texture";
        this.target = options.target ?? TextureTarget.Texture2D;
        this.options = {
            wrapS: options.wrapS ?? "clamp_to_edge",
            wrapT: options.wrapT ?? "clamp_to_edge",
            wrapR: options.wrapR ?? "clamp_to_edge",
            minFilter: options.minFilter ?? "linear_mipmap_linear",
            magFilter: options.magFilter ?? "linear",
            flipY: options.flipY ?? true,
            generateMipmaps: options.generateMipmaps ?? false,
            label: options.label,
            target: this.target,
        };
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

    public get isValid(): boolean {
        return this._handle !== null && !this._isDisposed;
    }

    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    /**
     * Allocates the GPU texture handle, applies parameters, and uploads data.
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
        gl.bindTexture(this.target, handle);
        this.applySamplerParameters(gl);
        this.uploadToGPU(gl);
        gl.bindTexture(this.target, null);
    }

    /**
     * Binds texture to a specific hardware texture unit.
     */
    public bind(unit: TextureUnit | number = TextureUnit.Color0): void {
        if (!this._gl || !this._handle) return;
        this._gl.activeTexture(this._gl.TEXTURE0 + unit);
        this._gl.bindTexture(this.target, this._handle);
    }

    /**
     * Unbinds texture from a specific hardware texture unit.
     */
    public unbind(unit: TextureUnit | number = TextureUnit.Color0): void {
        if (!this._gl) return;
        this._gl.activeTexture(this._gl.TEXTURE0 + unit);
        this._gl.bindTexture(this.target, null);
    }

    /**
     * Re-uploads pixel data from source (overridden by source-backed textures).
     */
    public updateFromSource(): void {
        // Base implementation is a no-op; subclasses can override
    }

    /**
     * Registers a callback to be executed when this texture is disposed.
     */
    public onDispose(callback: () => void): () => void {
        if (this._isDisposed) {
            callback();
            return () => {};
        }
        this._onDisposeCallbacks.push(callback);
        return () => {
            const idx = this._onDisposeCallbacks.indexOf(callback);
            if (idx !== -1) {
                this._onDisposeCallbacks.splice(idx, 1);
            }
        };
    }

    /**
     * Deterministic disposal: frees GPU memory and invokes disposal callbacks.
     */
    public dispose(): void {
        if (this._isDisposed) return;
        this._isDisposed = true;

        if (this._gl && this._handle && !this._gl.isContextLost()) {
            this._gl.deleteTexture(this._handle);
        }
        this._handle = null;
        this._gl = null;

        for (const cb of this._onDisposeCallbacks) {
            try {
                cb();
            } catch (err) {
                console.error(`[${this.label}] Error in onDispose callback:`, err);
            }
        }
        this._onDisposeCallbacks.length = 0;
    }

    /**
     * Resets GPU handle state on WebGL context loss.
     */
    public onContextLost(): void {
        this._handle = null;
        this._gl = null;
    }

    /**
     * Re-allocates GPU texture on WebGL context restoration.
     */
    public onContextRestored(gl: WebGL2RenderingContext): void {
        this.init(gl);
    }

    /**
     * Applies wrap and filter sampling parameters to the active texture binding.
     * Can be invoked externally or by subclasses when sampling parameters change.
     */
    public applySamplerParameters(gl?: WebGL2RenderingContext): void {
        const context = gl ?? this._gl;
        if (!context) return;
        applySamplerParameters(context, this.target, this.options);
    }

    /**
     * Subclasses implement this method to upload pixel data to the bound GPU texture.
     */
    protected abstract uploadToGPU(gl: WebGL2RenderingContext): void;
}
