import React, { useEffect, useRef } from "react";
import { ModelInstance } from "../scene/react/model_instance_component";
import { GalaxyGeometry } from "../scene/models/galaxy_geometry";
import { GalaxyMaterial } from "../scene/materials/galaxy_material";
import { BlendMode } from "../scene/materials/material_types";
import type { IModelInstance } from "../scene/models/model_instance_types";
import type { GalaxyStarsModelProps } from "./galaxy_scene_types";

/**
 * Declarative spiral galaxy starfield model component.
 * Manages procedural GalaxyGeometry and GalaxyMaterial lifecycles, rebuilding
 * vertex buffers only when structural morphology parameters change.
 */
export function GalaxyStarsModel({
    params,
}: GalaxyStarsModelProps): React.JSX.Element {
    const modelRef = useRef<IModelInstance>(null);

    const geometryRef = useRef<GalaxyGeometry | null>(null);
    if (!geometryRef.current) {
        geometryRef.current = new GalaxyGeometry({ params });
    }

    const materialRef = useRef<GalaxyMaterial | null>(null);
    if (!materialRef.current) {
        materialRef.current = new GalaxyMaterial({
            params,
            pipelineState: {
                blendMode: BlendMode.Additive,
                depthTest: false,
                depthWrite: false,
                cullFace: false,
            },
        });
    }

    useEffect(() => {
        const currentGeo = geometryRef.current;
        const currentMat = materialRef.current;
        if (!currentGeo || !currentMat) {
            return;
        }

        const currentGeoParams = currentGeo.galaxyParams;
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

        if (needsGeometryRebuild && modelRef.current) {
            currentGeo.dispose();
            const newGeo = new GalaxyGeometry({ params });
            modelRef.current.geometry = newGeo;
            geometryRef.current = newGeo;
        }

        currentMat.updateParameters(params);
    }, [params]);

    useEffect(() => {
        return () => {
            geometryRef.current?.dispose();
            geometryRef.current = null;
            materialRef.current = null;
        };
    }, []);

    return (
        <ModelInstance
            ref={modelRef}
            name="GalaxyModel"
            geometry={geometryRef.current}
            material={materialRef.current}
        />
    );
}
