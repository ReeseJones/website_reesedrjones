import { BaseTexture } from "./base_texture";
import type {
    CubeTextureFaces,
    CubeTextureOptions,
    ICubeTexture,
} from "./cube_texture_types";
import { GLCubeFace } from "../core/webgl_constants_types";
import { TextureTarget, type TextureFilter } from "./texture_types";

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
 * Extends BaseTexture for unified GPU resource lifecycle and unit binding.
 */
export class CubeTexture extends BaseTexture implements ICubeTexture {
    public readonly faces: CubeTextureFaces;

    private _decodedImages: Partial<Record<FaceKey, HTMLImageElement | ImageBitmap>> = {};
    private _loadPromise: Promise<void> | null = null;

    constructor(options: CubeTextureOptions) {
        const resolveFilter = (
            filter: TextureFilter | number | undefined,
            defaultPreset: TextureFilter
        ): TextureFilter => {
            if (typeof filter === "string") return filter;
            return defaultPreset;
        };

        const defaultMin = options.generateMipmaps ?? true ? "linear_mipmap_linear" : "linear";
        const minFilter = resolveFilter(options.minFilter, defaultMin);
        const magFilter = resolveFilter(options.magFilter, "linear");

        super({
            wrapS: options.wrapS ?? "clamp_to_edge",
            wrapT: options.wrapT ?? "clamp_to_edge",
            wrapR: options.wrapR ?? "clamp_to_edge",
            minFilter,
            magFilter,
            generateMipmaps: options.generateMipmaps ?? true,
            label: options.label ?? "CubeTexture",
            target: TextureTarget.CubeMap,
        });

        this.faces = options.faces;

        // Automatically trigger parallel asynchronous image load
        this.load().catch((err) => {
            console.error(`[CubeTexture] Failed to load cubemap faces (${this.label}):`, err);
        });
    }

    public get isReady(): boolean {
        return this._isLoaded;
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
                    if (typeof Image === "undefined") {
                        return {} as unknown as HTMLImageElement;
                    }
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

            this._isLoaded = true;

            // If WebGL context is already attached and texture is initialized, upload decoded textures
            if (this._gl && this._handle && !this._gl.isContextLost()) {
                this._gl.bindTexture(this.target, this._handle);
                this._uploadImages(this._gl);
                this._gl.bindTexture(this.target, null);
            }
        })();

        return this._loadPromise;
    }

    /**
     * Re-uploads pixel data from current decoded face images if loaded.
     */
    public override updateFromSource(): void {
        if (this._gl && this._handle && !this._gl.isContextLost() && this._isLoaded) {
            this._gl.bindTexture(this.target, this._handle);
            this._uploadImages(this._gl);
            this._gl.bindTexture(this.target, null);
        }
    }

    /**
     * Releases GPU memory and cleans up decoded image references.
     */
    public override dispose(): void {
        super.dispose();
        this._decodedImages = {};
    }

    /**
     * Dispatches cubemap pixel upload to the active GPU binding.
     */
    protected uploadToGPU(gl: WebGL2RenderingContext): void {
        if (this._isLoaded) {
            this._uploadImages(gl);
        } else {
            this._uploadFallback(gl);
        }
    }

    private _uploadFallback(gl: WebGL2RenderingContext): void {
        const blackPixel = new Uint8Array([0, 0, 0, 255]);
        for (const key of FACE_ORDER) {
            const target = FACE_TARGETS[key];
            gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blackPixel);
        }
    }

    private _uploadImages(gl: WebGL2RenderingContext): void {
        for (const key of FACE_ORDER) {
            const img = this._decodedImages[key];
            if (img) {
                const target = FACE_TARGETS[key];
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            }
        }

        this.applySamplerParameters(gl);

        if (this.options.generateMipmaps) {
            gl.generateMipmap(this.target);
        }
    }
}
