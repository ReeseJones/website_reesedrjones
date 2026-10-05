import type {
    CubeTextureFaces,
    CubeTextureOptions,
    ICubeTexture,
} from "./cube_texture_types";
import { GLCubeFace } from "../core/webgl_constants_types";

type FaceKey = keyof CubeTextureFaces;

const FACE_TARGETS: Record<FaceKey, GLCubeFace> = {
    posX: GLCubeFace.PositiveX,
    negX: GLCubeFace.NegativeX,
    posY: GLCubeFace.PositiveY,
    negY: GLCubeFace.NegativeY,
    posZ: GLCubeFace.PositiveZ,
    negZ: GLCubeFace.NegativeZ,
};

const FACE_ORDER: FaceKey[] = ["posX", "negX", "posY", "negY", "posZ", "negZ"];

/**
 * Pure WebGL 2 cubemap texture resource.
 *
 * Manages 6-face image loading, 1x1 black fallback initialization,
 * GPU texture allocation, mipmap generation, and automatic context recovery.
 */
export class CubeTexture implements ICubeTexture {
    public readonly faces: CubeTextureFaces;
    public label: string;

    private _handle: WebGLTexture | null = null;
    private _isReady: boolean = false;
    private _isDisposed: boolean = false;
    private _gl: WebGL2RenderingContext | null = null;

    private readonly _minFilter?: number;
    private readonly _magFilter?: number;
    private readonly _generateMipmaps: boolean;

    private _decodedImages: Partial<Record<FaceKey, HTMLImageElement | ImageBitmap>> = {};
    private _loadPromise: Promise<void> | null = null;
    private readonly _onDisposeCallbacks: (() => void)[] = [];

    constructor(options: CubeTextureOptions) {
        this.faces = options.faces;
        this._minFilter = options.minFilter;
        this._magFilter = options.magFilter;
        this._generateMipmaps = options.generateMipmaps ?? true;
        this.label = options.label ?? "CubeTexture";

        // Automatically trigger parallel asynchronous image load
        this.load().catch((err) => {
            console.error(`[CubeTexture] Failed to load cubemap faces (${this.label}):`, err);
        });
    }

    public get handle(): WebGLTexture | null {
        return this._handle;
    }

    public get isReady(): boolean {
        return this._isReady;
    }

    public get isValid(): boolean {
        return !!this._handle && !this._isDisposed && (!this._gl || !this._gl.isContextLost());
    }

    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    /**
     * Asynchronously loads and decodes all 6 cubemap face images concurrently.
     */
    public async load(): Promise<void> {
        if (this._loadPromise) {
            return this._loadPromise;
        }

        this._loadPromise = (async () => {
            const loadFace = async (key: FaceKey): Promise<HTMLImageElement | ImageBitmap> => {
                const source = this.faces[key];
                if (typeof source === "string") {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = source;
                    if (img.decode) {
                        await img.decode();
                    } else {
                        await new Promise<void>((resolve, reject) => {
                            img.onload = () => resolve();
                            img.onerror = () => reject(new Error(`Failed to load face ${key}: ${source}`));
                        });
                    }
                    return img;
                }
                return source;
            };

            const results = await Promise.all(FACE_ORDER.map((k) => loadFace(k)));
            FACE_ORDER.forEach((key, index) => {
                this._decodedImages[key] = results[index];
            });

            this._isReady = true;

            // If WebGL context is already attached, upload decoded textures now
            if (this._gl && this._handle && !this._gl.isContextLost()) {
                this._uploadImages(this._gl);
            }
        })();

        return this._loadPromise;
    }

    /**
     * Allocates the GPU cubemap texture. If decoded face images are not yet ready,
     * seeds each face with a 1x1 black fallback pixel so draw calls never sample an incomplete cubemap.
     */
    public init(gl: WebGL2RenderingContext): void {
        if (this._isDisposed) {
            return;
        }

        this._gl = gl;

        if (this._handle) {
            gl.deleteTexture(this._handle);
            this._handle = null;
        }

        const texture = gl.createTexture();
        if (!texture) {
            console.error("[CubeTexture] WebGL failed to create texture object.");
            return;
        }

        this._handle = texture;
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

        // Configure edge wrapping (clamp to edge is mandatory to avoid cubemap face seam artifacts)
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

        if (this._isReady) {
            this._uploadImages(gl);
        } else {
            this._uploadFallback(gl);
        }

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }

    private _uploadFallback(gl: WebGL2RenderingContext): void {
        const blackPixel = new Uint8Array([0, 0, 0, 255]);
        for (const key of FACE_ORDER) {
            const target = FACE_TARGETS[key];
            gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blackPixel);
        }
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    private _uploadImages(gl: WebGL2RenderingContext): void {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._handle);

        for (const key of FACE_ORDER) {
            const img = this._decodedImages[key];
            if (img) {
                const target = FACE_TARGETS[key];
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            }
        }

        const minFilter = this._minFilter ?? (this._generateMipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
        const magFilter = this._magFilter ?? gl.LINEAR;

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, magFilter);

        if (this._generateMipmaps) {
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        }

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }

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

    public dispose(): void {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        if (this._handle && this._gl && !this._gl.isContextLost()) {
            this._gl.deleteTexture(this._handle);
        }
        this._handle = null;
        this._gl = null;
        this._decodedImages = {};

        for (const cb of this._onDisposeCallbacks) {
            cb();
        }
        this._onDisposeCallbacks.length = 0;
    }

    public onContextLost(): void {
        this._handle = null;
        this._gl = null;
    }

    public onContextRestored(gl: WebGL2RenderingContext): void {
        this.init(gl);
    }
}
