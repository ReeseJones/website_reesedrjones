import { Material } from "../materials/material";
import { BlendMode } from "../materials/material_types";
import type { RgbaLike } from "../../helpers/colors_types";
import type { IPolylineMaterial, PolylineMaterialOptions } from "./polyline_material_types";
import {
    DEFAULT_POLYLINE_WIDTH,
    DEFAULT_POLYLINE_MITER_LIMIT,
    DEFAULT_POLYLINE_COLOR_R,
    DEFAULT_POLYLINE_COLOR_G,
    DEFAULT_POLYLINE_COLOR_B,
    DEFAULT_POLYLINE_COLOR_A,
    DEFAULT_POLYLINE_GLOW_R,
    DEFAULT_POLYLINE_GLOW_G,
    DEFAULT_POLYLINE_GLOW_B,
    DEFAULT_POLYLINE_GLOW_A,
    DEFAULT_POLYLINE_GLOW_INTENSITY,
    DEFAULT_POLYLINE_DASH_SPEED,
    DEFAULT_POLYLINE_DASH_FREQUENCY,
} from "./polyline_constants";

const COLOR_CHANNELS = 4;
const CHANNEL_R = 0;
const CHANNEL_G = 1;
const CHANNEL_B = 2;
const CHANNEL_A = 3;

/**
 * Material managing screen-space ribbon extrusion uniforms, neon glow colors,
 * anti-aliasing parameters, and pulse wave propagation.
 */
export class PolylineMaterial extends Material implements IPolylineMaterial {
    private readonly _color: Float32Array = new Float32Array([
        DEFAULT_POLYLINE_COLOR_R,
        DEFAULT_POLYLINE_COLOR_G,
        DEFAULT_POLYLINE_COLOR_B,
        DEFAULT_POLYLINE_COLOR_A,
    ]);

    private readonly _glowColor: Float32Array = new Float32Array([
        DEFAULT_POLYLINE_GLOW_R,
        DEFAULT_POLYLINE_GLOW_G,
        DEFAULT_POLYLINE_GLOW_B,
        DEFAULT_POLYLINE_GLOW_A,
    ]);

    private _lineWidth: number = DEFAULT_POLYLINE_WIDTH;
    private _miterLimit: number = DEFAULT_POLYLINE_MITER_LIMIT;
    private _glowIntensity: number = DEFAULT_POLYLINE_GLOW_INTENSITY;
    private _dashSpeed: number = DEFAULT_POLYLINE_DASH_SPEED;
    private _dashFrequency: number = DEFAULT_POLYLINE_DASH_FREQUENCY;

    constructor(options?: PolylineMaterialOptions) {
        super({
            shaderKey: "polyline_ribbon",
            pipelineState: {
                cullFace: false,
                blendMode: BlendMode.Additive,
                depthTest: true,
                depthWrite: false,
                ...options?.pipelineState,
            },
            uniforms: options?.uniforms,
            textures: options?.textures,
            cubeTextures: options?.cubeTextures,
        });

        if (options?.lineWidth !== undefined) {
            this._lineWidth = options.lineWidth;
        }

        if (options?.miterLimit !== undefined) {
            this._miterLimit = options.miterLimit;
        }

        if (options?.glowIntensity !== undefined) {
            this._glowIntensity = options.glowIntensity;
        }

        if (options?.dashSpeed !== undefined) {
            this._dashSpeed = options.dashSpeed;
        }

        if (options?.dashFrequency !== undefined) {
            this._dashFrequency = options.dashFrequency;
        }

        if (options?.color) {
            this._color[CHANNEL_R] = options.color.r;
            this._color[CHANNEL_G] = options.color.g;
            this._color[CHANNEL_B] = options.color.b;
            this._color[CHANNEL_A] = options.color.a ?? DEFAULT_POLYLINE_COLOR_A;
        }

        if (options?.glowColor) {
            this._glowColor[CHANNEL_R] = options.glowColor.r;
            this._glowColor[CHANNEL_G] = options.glowColor.g;
            this._glowColor[CHANNEL_B] = options.glowColor.b;
            this._glowColor[CHANNEL_A] = options.glowColor.a ?? DEFAULT_POLYLINE_GLOW_A;
        }

        this._syncUniforms();
    }

    private _syncUniforms(): void {
        this.setUniform("u_color", this._color);
        this.setUniform("u_glowColor", this._glowColor);
        this.setUniform("u_lineWidth", this._lineWidth);
        this.setUniform("u_miterLimit", this._miterLimit);
        this.setUniform("u_glowIntensity", this._glowIntensity);
        this.setUniform("u_dashSpeed", this._dashSpeed);
        this.setUniform("u_dashFrequency", this._dashFrequency);
    }

    public get lineWidth(): number {
        return this._lineWidth;
    }

    public set lineWidth(value: number) {
        if (this._lineWidth !== value) {
            this._lineWidth = value;
            this.setUniform("u_lineWidth", this._lineWidth);
        }
    }

    public get miterLimit(): number {
        return this._miterLimit;
    }

    public set miterLimit(value: number) {
        if (this._miterLimit !== value) {
            this._miterLimit = value;
            this.setUniform("u_miterLimit", this._miterLimit);
        }
    }

    public get glowIntensity(): number {
        return this._glowIntensity;
    }

    public set glowIntensity(value: number) {
        if (this._glowIntensity !== value) {
            this._glowIntensity = value;
            this.setUniform("u_glowIntensity", this._glowIntensity);
        }
    }

    public get dashSpeed(): number {
        return this._dashSpeed;
    }

    public set dashSpeed(value: number) {
        if (this._dashSpeed !== value) {
            this._dashSpeed = value;
            this.setUniform("u_dashSpeed", this._dashSpeed);
        }
    }

    public get dashFrequency(): number {
        return this._dashFrequency;
    }

    public set dashFrequency(value: number) {
        if (this._dashFrequency !== value) {
            this._dashFrequency = value;
            this.setUniform("u_dashFrequency", this._dashFrequency);
        }
    }

    /**
     * Retrieves the outer halo line color.
     */
    public getColor(out?: RgbaLike): RgbaLike {
        if (out) {
            out.r = this._color[CHANNEL_R];
            out.g = this._color[CHANNEL_G];
            out.b = this._color[CHANNEL_B];
            out.a = this._color[CHANNEL_A];
            return out;
        }
        return {
            r: this._color[CHANNEL_R],
            g: this._color[CHANNEL_G],
            b: this._color[CHANNEL_B],
            a: this._color[CHANNEL_A],
        };
    }

    /**
     * Sets the outer halo line color with dirty checking.
     */
    public setColor(color: RgbaLike): this;
    public setColor(r: number, g: number, b: number, a?: number): this;
    public setColor(rOrColor: number | RgbaLike, g?: number, b?: number, a?: number): this {
        const nr = typeof rOrColor === "number" ? rOrColor : rOrColor.r;
        const ng = typeof rOrColor === "number" ? (g ?? rOrColor) : rOrColor.g;
        const nb = typeof rOrColor === "number" ? (b ?? rOrColor) : rOrColor.b;
        const na = typeof rOrColor === "number" ? (a ?? DEFAULT_POLYLINE_COLOR_A) : (rOrColor.a ?? DEFAULT_POLYLINE_COLOR_A);

        if (
            this._color[CHANNEL_R] !== nr ||
            this._color[CHANNEL_G] !== ng ||
            this._color[CHANNEL_B] !== nb ||
            this._color[CHANNEL_A] !== na
        ) {
            this._color[CHANNEL_R] = nr;
            this._color[CHANNEL_G] = ng;
            this._color[CHANNEL_B] = nb;
            this._color[CHANNEL_A] = na;
            this.setUniform("u_color", this._color);
        }

        return this;
    }

    /**
     * Retrieves the central energy beam core color.
     */
    public getGlowColor(out?: RgbaLike): RgbaLike {
        if (out) {
            out.r = this._glowColor[CHANNEL_R];
            out.g = this._glowColor[CHANNEL_G];
            out.b = this._glowColor[CHANNEL_B];
            out.a = this._glowColor[CHANNEL_A];
            return out;
        }
        return {
            r: this._glowColor[CHANNEL_R],
            g: this._glowColor[CHANNEL_G],
            b: this._glowColor[CHANNEL_B],
            a: this._glowColor[CHANNEL_A],
        };
    }

    /**
     * Sets the central energy beam core color with dirty checking.
     */
    public setGlowColor(color: RgbaLike): this;
    public setGlowColor(r: number, g: number, b: number, a?: number): this;
    public setGlowColor(rOrColor: number | RgbaLike, g?: number, b?: number, a?: number): this {
        const nr = typeof rOrColor === "number" ? rOrColor : rOrColor.r;
        const ng = typeof rOrColor === "number" ? (g ?? rOrColor) : rOrColor.g;
        const nb = typeof rOrColor === "number" ? (b ?? rOrColor) : rOrColor.b;
        const na = typeof rOrColor === "number" ? (a ?? DEFAULT_POLYLINE_GLOW_A) : (rOrColor.a ?? DEFAULT_POLYLINE_GLOW_A);

        if (
            this._glowColor[CHANNEL_R] !== nr ||
            this._glowColor[CHANNEL_G] !== ng ||
            this._glowColor[CHANNEL_B] !== nb ||
            this._glowColor[CHANNEL_A] !== na
        ) {
            this._glowColor[CHANNEL_R] = nr;
            this._glowColor[CHANNEL_G] = ng;
            this._glowColor[CHANNEL_B] = nb;
            this._glowColor[CHANNEL_A] = na;
            this.setUniform("u_glowColor", this._glowColor);
        }

        return this;
    }
}
