import type { MaterialOptions } from "./material_types";
import type { ITexture } from "../../webgl/textures/texture_types";
import type { UnlitShaderKey } from "../../webgl/shaders/shader_types";

/**
 * Options for configuring an UnlitMaterial.
 */
export interface UnlitMaterialOptions extends Partial<MaterialOptions> {
    /** Shader program key. Defaults to "unlit". */
    shaderKey?: UnlitShaderKey;
    /** Base color multiplier [r, g, b] or [r, g, b, a] */
    color?: [number, number, number] | [number, number, number, number];
    /** 2D Texture asset bound to Semantic Unit 0 (u_texture) */
    texture?: ITexture | null;
    /** Whether texture sampling is active */
    useTexture?: boolean;
}

