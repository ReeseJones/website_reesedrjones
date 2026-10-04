import type { GalaxyParameters } from "../../../galaxy_backdrop/parameters/types";
import type { MaterialOptions } from "../material_types";
import type { GalaxyShaderKey } from "../../../webgl/shaders/shader_types";

/**
 * Configuration options for creating a GalaxyMaterial.
 */
export interface GalaxyMaterialOptions extends Partial<MaterialOptions> {
    /** Galaxy starfield shader program ("galaxy_pinprick" | "galaxy_orb"). Defaults to "galaxy_orb". */
    shaderKey?: GalaxyShaderKey;
    /** Galaxy simulation parameters determining uniform constants */
    params?: Partial<GalaxyParameters>;
}
