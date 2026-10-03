import type { GalaxyParameters } from "../../../galaxy_backdrop/parameters/types";
import type { MaterialOptions } from "../material_types";

/**
 * Configuration options for creating a GalaxyMaterial.
 */
export interface GalaxyMaterialOptions extends Partial<MaterialOptions> {
    /** Galaxy simulation parameters determining uniform constants */
    params?: Partial<GalaxyParameters>;
}
