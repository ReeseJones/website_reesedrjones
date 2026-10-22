import type { RgbLike, RgbaLike } from "../../helpers/colors_types";
import { Texture } from "./texture";
import type { CubeTextureFaces, ICubeTexture } from "./cube_texture_types";
import type { SolidColorCubeTextureOptions } from "./solid_color_cube_texture_types";
import { TextureTarget } from "./texture_types";
import { GLCubeFace } from "../core/webgl_constants_types";

const CUBE_MAP_FACES = [
    GLCubeFace.PositiveX,
    GLCubeFace.NegativeX,
    GLCubeFace.PositiveY,
    GLCubeFace.NegativeY,
    GLCubeFace.PositiveZ,
    GLCubeFace.NegativeZ,
];

/**
 * 1x1 solid-color WebGL cubemap texture across all 6 faces.
 * Synchronous, immediately marked ready, and implements ICubeTexture with full GPU lifecycle management.
 */
export class SolidColorCubeTexture extends Texture implements ICubeTexture {
    private readonly _pixelData: Uint8Array;
    private readonly _dummyFaces: CubeTextureFaces;

    constructor(
        r: number = 0,
        g: number = 0,
        b: number = 0,
        a: number = 255,
        options?: Omit<SolidColorCubeTextureOptions, "r" | "g" | "b" | "a">
    ) {
        super({
            wrapS: "clamp_to_edge",
            wrapT: "clamp_to_edge",
            minFilter: "nearest",
            magFilter: "nearest",
            generateMipmaps: false,
            flipY: false,
            label: "SolidColorCubeTexture",
            ...options,
            target: TextureTarget.CubeMap,
        });

        this._width = 1;
        this._height = 1;
        this._isLoaded = true;
        this._pixelData = new Uint8Array([r, g, b, a]);
        this._dummyFaces = {
            posX: "",
            negX: "",
            posY: "",
            negY: "",
            posZ: "",
            negZ: "",
        };
    }

    public get pixelData(): Uint8Array {
        return this._pixelData;
    }

    public get isReady(): boolean {
        return this._isLoaded;
    }

    public get faces(): CubeTextureFaces {
        return this._dummyFaces;
    }

    public async load(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Updates the color components and immediately re-uploads to GPU if active.
     */
    public setColor(color: RgbLike | RgbaLike): void;
    public setColor(r: number, g: number, b: number, a?: number): void;
    public setColor(rOrColor: number | RgbLike | RgbaLike, g?: number, b?: number, a: number = 255): void {
        if (typeof rOrColor === "object" && rOrColor !== null) {
            const toByte = (v: number): number =>
                v > 1 ? Math.min(255, Math.max(0, Math.round(v))) : Math.min(255, Math.max(0, Math.round(v * 255)));
            this._pixelData[0] = toByte(rOrColor.r);
            this._pixelData[1] = toByte(rOrColor.g);
            this._pixelData[2] = toByte(rOrColor.b);
            this._pixelData[3] =
                "a" in rOrColor && typeof (rOrColor as RgbaLike).a === "number"
                    ? toByte((rOrColor as RgbaLike).a)
                    : 255;
        } else {
            this._pixelData[0] = rOrColor;
            this._pixelData[1] = g ?? 0;
            this._pixelData[2] = b ?? 0;
            this._pixelData[3] = a;
        }

        this.updateFromSource();
    }

    /**
     * Re-uploads the pixel data to all 6 faces on the active GPU texture handle.
     */
    public override updateFromSource(): void {
        if (this._gl && this._handle && !this._gl.isContextLost()) {
            this._gl.bindTexture(this.target, this._handle);
            this.uploadToGPU(this._gl);
            this._gl.bindTexture(this.target, null);
        }
    }

    /**
     * Dispatches the 1x1 RGBA pixel upload to all 6 cubemap faces.
     */
    protected uploadToGPU(gl: WebGL2RenderingContext): void {
        for (const face of CUBE_MAP_FACES) {
            gl.texImage2D(
                face,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                this._pixelData
            );
        }
    }
}

