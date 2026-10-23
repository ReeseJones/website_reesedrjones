import type { RgbLike, RgbaLike } from "../../helpers/colors_types";
import { Texture } from "./texture";
import type { SolidColorTextureOptions } from "./solid_color_texture_types";
import { TextureTarget } from "./texture_types";

/**
 * 1x1 solid-color WebGL 2D texture.
 * Synchronous, immediately marked loaded, and implements ITexture with full GPU lifecycle management.
 */
export class SolidColorTexture extends Texture {
    private readonly _pixelData: Uint8Array;

    constructor(
        r: number = 255,
        g: number = 255,
        b: number = 255,
        a: number = 255,
        options?: Omit<SolidColorTextureOptions, "r" | "g" | "b" | "a">
    ) {
        super({
            wrapS: "clamp_to_edge",
            wrapT: "clamp_to_edge",
            minFilter: "nearest",
            magFilter: "nearest",
            generateMipmaps: false,
            flipY: false,
            label: "SolidColorTexture",
            ...options,
            target: TextureTarget.Texture2D,
        });

        this._width = 1;
        this._height = 1;
        this._isLoaded = true;
        this._pixelData = new Uint8Array([r, g, b, a]);
    }

    /**
     * Raw RGBA pixel byte array.
     */
    public get pixelData(): Uint8Array {
        return this._pixelData;
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
     * Re-uploads the pixel data to the active GPU texture handle.
     */
    public override updateFromSource(): void {
        if (this._gl && this._handle && !this._gl.isContextLost()) {
            this._gl.bindTexture(this.target, this._handle);
            this.uploadToGPU(this._gl);
            this._gl.bindTexture(this.target, null);
            this.notifyUpdate();
        }
    }

    /**
     * Dispatches the 1x1 RGBA pixel upload to WebGL.
     */
    protected uploadToGPU(gl: WebGL2RenderingContext): void {
        gl.texImage2D(
            this.target,
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

