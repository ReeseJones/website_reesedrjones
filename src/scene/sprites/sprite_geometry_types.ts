import type { IMeshGeometry } from "../models/mesh_geometry_types";

/**
 * Contract for static billboard quad geometry.
 */
export interface ISpriteGeometry extends IMeshGeometry {
    /** Whether this geometry references the globally shared unit quad buffer */
    readonly isShared: boolean;
}
