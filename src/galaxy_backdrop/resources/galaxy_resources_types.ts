import type { GalaxyGeometry } from "../../scene/models/galaxy_geometry";
import type { GalaxyMaterial } from "../../scene/materials/galaxy_material";
import type { ScreenQuadGeometry } from "../../scene/models/screen_quad_geometry";
import type { GalacticCloudMaterial } from "../../scene/materials/galactic_cloud_material";
import type { GalaxyParameters } from "../parameters/types";

/**
 * Snapshot contract of active shared singleton resources utilized by
 * the galaxy backdrop rendering pipeline.
 */
export interface SharedGalaxyResources {
    cloudGeometry: ScreenQuadGeometry | null;
    cloudMaterial: GalacticCloudMaterial | null;
    galaxyGeometry: GalaxyGeometry | null;
    galaxyMaterial: GalaxyMaterial | null;
}
