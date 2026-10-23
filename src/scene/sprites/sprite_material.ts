import { Material } from "../materials/material";
import { BlendMode } from "../materials/material_types";
import type { RgbaLike } from "../../helpers/colors_types";
import type { ShaderKey } from "../../webgl/shaders/shader_types";
import type { ISpriteMaterial, SpriteMaterialOptions } from "./sprite_material_types";
import {
    DEFAULT_TINT_R,
    DEFAULT_TINT_G,
    DEFAULT_TINT_B,
    DEFAULT_TINT_A,
} from "./sprite_constants";

export interface InternalSpriteMaterialOptions extends SpriteMaterialOptions {
    shaderKey: ShaderKey;
}

/**
 * Base material class for camera-facing billboard sprites and waypoints.
 * Configures default two-sided rasterization, alpha blending, and vector-compliant tint storage.
 */
export class SpriteMaterial extends Material implements ISpriteMaterial {
    private readonly _tint: Float32Array = new Float32Array([
        DEFAULT_TINT_R,
        DEFAULT_TINT_G,
        DEFAULT_TINT_B,
        DEFAULT_TINT_A,
    ]);
    private _alwaysOnTop: boolean = false;

    constructor(options: InternalSpriteMaterialOptions) {
        const alwaysOnTop = options.alwaysOnTop ?? false;

        super({
            ...options,
            shaderKey: options.shaderKey,
            pipelineState: {
                blendMode: options.pipelineState?.blendMode ?? BlendMode.Alpha,
                cullFace: options.pipelineState?.cullFace ?? false,
                depthTest: alwaysOnTop ? false : (options.pipelineState?.depthTest ?? true),
                depthWrite: options.pipelineState?.depthWrite ?? false,
            },
        });

        this._alwaysOnTop = alwaysOnTop;

        if (options.tint) {
            this._tint[0] = options.tint.r;
            this._tint[1] = options.tint.g;
            this._tint[2] = options.tint.b;
            this._tint[3] = options.tint.a ?? DEFAULT_TINT_A;
        }

        this.setUniform("u_tintColor", this._tint);
    }

    /**
     * Whether depth testing is bypassed to render unconditionally on top of all celestial objects.
     */
    public get alwaysOnTop(): boolean {
        return this._alwaysOnTop;
    }

    public set alwaysOnTop(value: boolean) {
        if (this._alwaysOnTop !== value) {
            this._alwaysOnTop = value;
            this.pipelineState.depthTest = !value;
            this.pipelineState.depthWrite = false;
        }
    }

    /**
     * Returns a safe copy of the color tint or writes into the optional target-out object.
     */
    public getTint(out?: RgbaLike): RgbaLike {
        if (out) {
            out.r = this._tint[0];
            out.g = this._tint[1];
            out.b = this._tint[2];
            out.a = this._tint[3];
            return out;
        }
        return {
            r: this._tint[0],
            g: this._tint[1],
            b: this._tint[2],
            a: this._tint[3],
        };
    }

    /**
     * Sets the color tint via a semantic RgbaLike object or scalar RGBA arguments with change detection.
     */
    public setTint(tint: RgbaLike): this;
    public setTint(r: number, g: number, b: number, a?: number): this;
    public setTint(rOrTint: number | RgbaLike, g?: number, b?: number, a?: number): this {
        let r: number;
        let green: number;
        let blue: number;
        let alpha: number;

        if (typeof rOrTint === "number") {
            r = rOrTint;
            green = g ?? DEFAULT_TINT_G;
            blue = b ?? DEFAULT_TINT_B;
            alpha = a ?? DEFAULT_TINT_A;
        } else {
            r = rOrTint.r;
            green = rOrTint.g;
            blue = rOrTint.b;
            alpha = rOrTint.a ?? DEFAULT_TINT_A;
        }

        if (
            this._tint[0] !== r ||
            this._tint[1] !== green ||
            this._tint[2] !== blue ||
            this._tint[3] !== alpha
        ) {
            this._tint[0] = r;
            this._tint[1] = green;
            this._tint[2] = blue;
            this._tint[3] = alpha;
            this.setUniform("u_tintColor", this._tint);
        }

        return this;
    }
}
