import { MeshGeometry } from "../mesh_geometry";
import { generateStarBuffer } from "../../../galaxy_backdrop/galaxy_math";
import { DEFAULT_PINPRICK_PARAMETERS } from "../../../galaxy_backdrop/parameters/presets/pinprick";
import type { GalaxyParameters } from "../../../galaxy_backdrop/parameters/types";
import { GALAXY_VERTEX_LAYOUT } from "./galaxy_geometry_types";
import type { GalaxyGeometryOptions } from "./galaxy_geometry_types";
import { GLPrimitive } from "../../../webgl/core/webgl_constants_types";

/**
 * Specialized procedural geometry for the interactive spiral galaxy backdrop.
 * Packs 6 domain attributes per star (radius, angle, zOffset, size, spectralType, driftPhase)
 * and configures primitive drawing as WebGL POINTS.
 */
export class GalaxyGeometry extends MeshGeometry {
    public readonly galaxyParams: GalaxyParameters;

    /**
     * @param options Partial galaxy simulation parameters or options object.
     * @param id Optional explicit identifier.
     */
    constructor(
        options?: Partial<GalaxyParameters> | GalaxyGeometryOptions,
        id?: string
    ) {
        const rawParams =
            options && "params" in options && options.params !== undefined
                ? options.params
                : (options as Partial<GalaxyParameters> | undefined);

        const resolvedParams: GalaxyParameters = {
            ...DEFAULT_PINPRICK_PARAMETERS,
            ...rawParams,
        };

        const attributes = generateStarBuffer(resolvedParams);

        super(
            {
                attributes,
                layout: GALAXY_VERTEX_LAYOUT,
                vertexCount: resolvedParams.starCount,
            },
            GLPrimitive.Points,
            id
        );

        this.galaxyParams = resolvedParams;
    }
}
