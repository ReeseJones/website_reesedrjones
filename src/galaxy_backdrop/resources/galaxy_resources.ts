import { ScreenQuadGeometry } from "../../scene/models/screen_quad_geometry";
import { GalacticCloudMaterial } from "../../scene/materials/galactic_cloud_material";
import { GalaxyGeometry } from "../../scene/models/galaxy_geometry";
import { GalaxyMaterial } from "../../scene/materials/galaxy_material";
import { BlendMode } from "../../scene/materials/material_types";
import type { GalaxyParameters } from "../parameters/types";
import type { SharedGalaxyResources } from "./galaxy_resources_types";

let _sharedCloudGeometry: ScreenQuadGeometry | null = null;
let _sharedCloudMaterial: GalacticCloudMaterial | null = null;
let _sharedGalaxyGeometry: GalaxyGeometry | null = null;
let _sharedGalaxyMaterial: GalaxyMaterial | null = null;

/**
 * Returns or lazily instantiates the shared ScreenQuadGeometry singleton.
 */
export function getSharedCloudGeometry(): ScreenQuadGeometry {
    if (!_sharedCloudGeometry) {
        _sharedCloudGeometry = new ScreenQuadGeometry();
    }
    return _sharedCloudGeometry;
}

/**
 * Returns or lazily instantiates the shared GalacticCloudMaterial singleton,
 * optionally updating parameters if already instantiated.
 */
export function getSharedCloudMaterial(params?: Partial<GalaxyParameters>): GalacticCloudMaterial {
    if (!_sharedCloudMaterial) {
        _sharedCloudMaterial = new GalacticCloudMaterial({ params });
        return _sharedCloudMaterial;
    }

    if (params) {
        _sharedCloudMaterial.updateParameters(params);
    }

    return _sharedCloudMaterial;
}

/**
 * Returns or lazily instantiates the shared GalaxyGeometry singleton,
 * regenerating geometry only if morphology parameters change.
 */
export function getSharedGalaxyGeometry(params?: Partial<GalaxyParameters>): GalaxyGeometry {
    if (!_sharedGalaxyGeometry) {
        _sharedGalaxyGeometry = new GalaxyGeometry({ params });
        return _sharedGalaxyGeometry;
    }

    if (params) {
        const currentGeoParams = _sharedGalaxyGeometry.galaxyParams;
        const needsGeometryRebuild =
            (params.starCount !== undefined &&
                params.starCount !== currentGeoParams.starCount) ||
            (params.armCount !== undefined &&
                params.armCount !== currentGeoParams.armCount) ||
            (params.armWinding !== undefined &&
                params.armWinding !== currentGeoParams.armWinding) ||
            (params.armDispersion !== undefined &&
                params.armDispersion !== currentGeoParams.armDispersion) ||
            (params.spurFrequency !== undefined &&
                params.spurFrequency !== currentGeoParams.spurFrequency) ||
            (params.coreRadius !== undefined &&
                params.coreRadius !== currentGeoParams.coreRadius) ||
            (params.diskRadius !== undefined &&
                params.diskRadius !== currentGeoParams.diskRadius) ||
            (params.diskThickness !== undefined &&
                params.diskThickness !== currentGeoParams.diskThickness) ||
            (params.coreDensityRatio !== undefined &&
                params.coreDensityRatio !== currentGeoParams.coreDensityRatio);

        if (needsGeometryRebuild) {
            _sharedGalaxyGeometry.updateParameters(params);
        }
    }

    return _sharedGalaxyGeometry;
}

/**
 * Returns or lazily instantiates the shared GalaxyMaterial singleton configured for additive blending,
 * optionally updating simulation uniforms if already instantiated.
 */
export function getSharedGalaxyMaterial(params?: Partial<GalaxyParameters>): GalaxyMaterial {
    if (!_sharedGalaxyMaterial) {
        _sharedGalaxyMaterial = new GalaxyMaterial({
            params,
            pipelineState: {
                blendMode: BlendMode.Additive,
                depthTest: false,
                depthWrite: false,
                cullFace: false,
            },
        });
        return _sharedGalaxyMaterial;
    }

    if (params) {
        _sharedGalaxyMaterial.updateParameters(params);
    }

    return _sharedGalaxyMaterial;
}

/**
 * Disposes instantiated shared geometry buffers and resets singleton references to null.
 */
export function disposeSharedGalaxyResources(): void {
    if (_sharedCloudGeometry) {
        _sharedCloudGeometry.dispose();
        _sharedCloudGeometry = null;
    }
    _sharedCloudMaterial = null;
    if (_sharedGalaxyGeometry) {
        _sharedGalaxyGeometry.dispose();
        _sharedGalaxyGeometry = null;
    }
    _sharedGalaxyMaterial = null;
}

/**
 * Returns a snapshot of the current shared resource singleton references.
 */
export function getSharedGalaxyResources(): SharedGalaxyResources {
    return {
        cloudGeometry: _sharedCloudGeometry,
        cloudMaterial: _sharedCloudMaterial,
        galaxyGeometry: _sharedGalaxyGeometry,
        galaxyMaterial: _sharedGalaxyMaterial,
    };
}
