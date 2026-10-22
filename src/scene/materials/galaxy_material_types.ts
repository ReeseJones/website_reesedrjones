import type { RgbLike } from "../../helpers/colors_types";
import type { GalaxyParameters } from "../../galaxy_backdrop/parameters/types";
import type { MaterialOptions } from "./material_types";
import type { GalaxyShaderKey } from "../../webgl/shaders/shader_types";

/**
 * Configuration options for creating a GalaxyMaterial.
 */

export type GalaxyColor = RgbLike | [number, number, number];

export interface GalaxyMaterialParameters
    extends Partial<
        Omit<
            GalaxyParameters,
            "coreColor" | "coreBlazeColor" | "armInnerColor" | "armOuterColor" | "accentColor"
        >
    > {
    coreColor?: GalaxyColor;
    coreBlazeColor?: GalaxyColor;
    armInnerColor?: GalaxyColor;
    armOuterColor?: GalaxyColor;
    accentColor?: GalaxyColor;
}

export type ResolvedGalaxyMaterialParameters = Omit<
    GalaxyParameters,
    "coreColor" | "coreBlazeColor" | "armInnerColor" | "armOuterColor" | "accentColor"
> & {
    coreColor: GalaxyColor;
    coreBlazeColor: GalaxyColor;
    armInnerColor: GalaxyColor;
    armOuterColor: GalaxyColor;
    accentColor: GalaxyColor;
};

export interface GalaxyMaterialOptions extends Partial<MaterialOptions> {
    /** Galaxy starfield shader program ("galaxy_pinprick" | "galaxy_orb"). Defaults to "galaxy_orb". */
    shaderKey?: GalaxyShaderKey;
    /** Galaxy simulation parameters determining uniform constants */
    params?: GalaxyMaterialParameters;
}
