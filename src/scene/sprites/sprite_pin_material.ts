import { SpriteMaterial } from "./sprite_material";
import type { ISpritePinMaterial, SpritePinMaterialOptions } from "./sprite_material_types";
import type { RgbaLike } from "../../helpers/colors_types";
import {
    DEFAULT_PIN_INNER_R,
    DEFAULT_PIN_INNER_G,
    DEFAULT_PIN_INNER_B,
    DEFAULT_PIN_INNER_A,
    DEFAULT_PIN_INNER_RADIUS,
    DEFAULT_PIN_HALO_WIDTH,
} from "./sprite_constants";

/**
 * Specialized billboard material rendering procedural Signed Distance Field (SDF) waypoint pins.
 * Eliminates raster image assets, provides infinite crisp zoom, and supports inner dots and soft halos.
 */
export class SpritePinMaterial extends SpriteMaterial implements ISpritePinMaterial {
    private readonly _innerColor: Float32Array = new Float32Array([
        DEFAULT_PIN_INNER_R,
        DEFAULT_PIN_INNER_G,
        DEFAULT_PIN_INNER_B,
        DEFAULT_PIN_INNER_A,
    ]);
    private _innerRadius: number = DEFAULT_PIN_INNER_RADIUS;
    private _haloWidth: number = DEFAULT_PIN_HALO_WIDTH;

    constructor(options?: SpritePinMaterialOptions) {
        super({
            ...options,
            shaderKey: "sprite_sdf_pin",
        });

        if (options?.innerColor) {
            this._innerColor[0] = options.innerColor.r;
            this._innerColor[1] = options.innerColor.g;
            this._innerColor[2] = options.innerColor.b;
            this._innerColor[3] = options.innerColor.a ?? DEFAULT_PIN_INNER_A;
        }

        if (options?.innerRadius !== undefined) {
            this._innerRadius = options.innerRadius;
        }

        if (options?.haloWidth !== undefined) {
            this._haloWidth = options.haloWidth;
        }

        this.setUniform("u_innerDotColor", this._innerColor);
        this.setUniform("u_innerRadius", this._innerRadius);
        this.setUniform("u_haloWidth", this._haloWidth);
    }

    /**
     * Returns a safe copy of the inner indicator core color or writes into the optional target-out object.
     */
    public getInnerColor(out?: RgbaLike): RgbaLike {
        if (out) {
            out.r = this._innerColor[0];
            out.g = this._innerColor[1];
            out.b = this._innerColor[2];
            out.a = this._innerColor[3];
            return out;
        }
        return {
            r: this._innerColor[0],
            g: this._innerColor[1],
            b: this._innerColor[2],
            a: this._innerColor[3],
        };
    }

    /**
     * Sets the inner indicator core color via a semantic RgbaLike object or scalar RGBA arguments.
     */
    public setInnerColor(color: RgbaLike): this;
    public setInnerColor(r: number, g: number, b: number, a?: number): this;
    public setInnerColor(rOrColor: number | RgbaLike, g?: number, b?: number, a?: number): this {
        let r: number;
        let green: number;
        let blue: number;
        let alpha: number;

        if (typeof rOrColor === "number") {
            r = rOrColor;
            green = g ?? DEFAULT_PIN_INNER_G;
            blue = b ?? DEFAULT_PIN_INNER_B;
            alpha = a ?? DEFAULT_PIN_INNER_A;
        } else {
            r = rOrColor.r;
            green = rOrColor.g;
            blue = rOrColor.b;
            alpha = rOrColor.a ?? DEFAULT_PIN_INNER_A;
        }

        if (
            this._innerColor[0] !== r ||
            this._innerColor[1] !== green ||
            this._innerColor[2] !== blue ||
            this._innerColor[3] !== alpha
        ) {
            this._innerColor[0] = r;
            this._innerColor[1] = green;
            this._innerColor[2] = blue;
            this._innerColor[3] = alpha;
            this.setUniform("u_innerDotColor", this._innerColor);
        }

        return this;
    }

    /**
     * Normalized radius of the inner circular core indicator.
     */
    public get innerRadius(): number {
        return this._innerRadius;
    }

    public set innerRadius(value: number) {
        if (this._innerRadius !== value) {
            this._innerRadius = value;
            this.setUniform("u_innerRadius", this._innerRadius);
        }
    }

    /**
     * Soft drop shadow / glow halo width outside the pin perimeter.
     */
    public get haloWidth(): number {
        return this._haloWidth;
    }

    public set haloWidth(value: number) {
        if (this._haloWidth !== value) {
            this._haloWidth = value;
            this.setUniform("u_haloWidth", this._haloWidth);
        }
    }
}
