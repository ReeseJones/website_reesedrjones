import React, { useEffect, useRef } from "react";
import { ModelInstance } from "../scene/react/model_instance_component";
import { useSceneFrame } from "../scene/react/use_scene_frame";
import { ScreenQuadGeometry } from "../scene/models/screen_quad_geometry";
import { GalacticCloudMaterial } from "../scene/materials/galactic_cloud_material";
import {
    DEFAULT_CLOUD_ASPECT,
    DEFAULT_CLOUD_PARALLAX_FACTOR,
    DEG_TO_RAD,
    GALACTIC_CLOUD_RENDER_ORDER,
    HALF_FOV_FACTOR,
} from "../scene/materials/galactic_cloud_material_constants";
import type { GalacticCloudModelProps } from "./galaxy_scene_types";

/**
 * Declarative background galactic cloud horizon quad component.
 * Manages ScreenQuadGeometry and GalacticCloudMaterial lifecycles and
 * synchronizes per-frame view/parallax uniforms via useSceneFrame.
 */
export function GalacticCloudModel({
    params,
    parallaxRef,
}: GalacticCloudModelProps): React.JSX.Element {
    const cloudGeometryRef = useRef<ScreenQuadGeometry | null>(null);
    if (!cloudGeometryRef.current) {
        cloudGeometryRef.current = new ScreenQuadGeometry();
    }
    const cloudGeometry = cloudGeometryRef.current;

    const cloudMaterialRef = useRef<GalacticCloudMaterial | null>(null);
    if (!cloudMaterialRef.current) {
        cloudMaterialRef.current = new GalacticCloudMaterial({ params });
    }
    const cloudMaterial = cloudMaterialRef.current;

    useEffect(() => {
        cloudMaterial.updateParameters(params);
    }, [cloudMaterial, params]);

    useEffect(() => {
        return () => {
            cloudGeometryRef.current?.dispose();
            cloudGeometryRef.current = null;
            cloudMaterialRef.current = null;
        };
    }, []);

    useSceneFrame(({ activeCamera }) => {
        const fovRad = params.fov * DEG_TO_RAD;
        const fovScale = Math.tan(fovRad * HALF_FOV_FACTOR);

        const parallax = params.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;
        const pitchOffset = parallaxRef?.current?.pitchOffset ?? 0;
        const yawOffset = parallaxRef?.current?.yawOffset ?? 0;

        const effectivePitchOffset = pitchOffset * params.mouseSensitivity * parallax;
        const effectiveYawOffset = yawOffset * params.mouseSensitivity * parallax;

        cloudMaterial.updateFrameUniforms({
            aspect: activeCamera?.aspect ?? DEFAULT_CLOUD_ASPECT,
            fovScale,
            pitch: params.pitchAngle,
            yaw: params.yawAngle,
            roll: params.rollAngle,
            effectivePitchOffset,
            effectiveYawOffset,
        });
    });

    return (
        <ModelInstance
            name="GalacticCloudModel"
            geometry={cloudGeometry}
            material={cloudMaterial}
            renderOrder={GALACTIC_CLOUD_RENDER_ORDER}
            visible={params.cloudEnabled ?? true}
        />
    );
}
