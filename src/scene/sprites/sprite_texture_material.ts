import { SpriteMaterial } from "./sprite_material";
import type { ISpriteTextureMaterial, SpriteTextureMaterialOptions } from "./sprite_material_types";
import type { ITexture } from "../../webgl/textures/texture_types";
import { TextureUnit } from "../../webgl/textures/texture_types";
import { DEFAULT_ALPHA_CUTOFF } from "./sprite_constants";

/**
 * Specialized billboard material rendering sampled 2D raster textures with color tinting
 * and alpha discard thresholding.
 */
export class SpriteTextureMaterial extends SpriteMaterial implements ISpriteTextureMaterial {
    private _alphaCutoff: number = DEFAULT_ALPHA_CUTOFF;

    constructor(options?: SpriteTextureMaterialOptions) {
        super({
            ...options,
            shaderKey: "sprite_texture",
        });

        if (options?.texture) {
            this.setTexture(TextureUnit.Color, options.texture);
        }

        if (options?.alphaCutoff !== undefined) {
            this._alphaCutoff = options.alphaCutoff;
        }

        this.setUniform("u_alphaCutoff", this._alphaCutoff);
    }

    /**
     * 2D texture bound to TextureUnit.Color for billboard sampling.
     */
    public get texture(): ITexture | null {
        return this.getTexture(TextureUnit.Color);
    }

    public set texture(value: ITexture | null) {
        this.setTexture(TextureUnit.Color, value);
    }

    /**
     * Alpha cutoff threshold below which fragments are discarded.
     */
    public get alphaCutoff(): number {
        return this._alphaCutoff;
    }

    public set alphaCutoff(value: number) {
        if (this._alphaCutoff !== value) {
            this._alphaCutoff = value;
            this.setUniform("u_alphaCutoff", this._alphaCutoff);
        }
    }
}
