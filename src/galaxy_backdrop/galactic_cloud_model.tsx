import React, { useEffect, useRef } from "react";
import { mat3, mat4, quat } from "gl-matrix";
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
import type { QuaternionTuple } from "../scene/core/transform_types";

const sBaseMat4 = mat4.create();
const sBaseQuat = quat.create();
const sCloudQuat = quat.create();
const sCameraRotationMat3 = mat3.create();

/**
 * Declarative background galactic cloud horizon quad component.
 * Manages ScreenQuadGeometry and GalacticCloudMaterial lifecycles and
 * synchronizes per-frame view/parallax uniforms via useSceneFrame.
 */
export function GalacticCloudModel({
    params,
    parallaxRef: _parallaxRef,
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

        const baseMat = sBaseMat4;
        mat4.identity(baseMat);
        mat4.rotateX(baseMat, baseMat, params.pitchAngle);
        mat4.rotateY(baseMat, baseMat, params.yawAngle);
        mat4.rotateZ(baseMat, baseMat, params.rollAngle);
        mat4.invert(baseMat, baseMat);

        const baseQuat = sBaseQuat;
        mat4.getRotation(baseQuat, baseMat);

        if (activeCamera) {
            const camTransform = activeCamera.transform as unknown as {
                rotation?: QuaternionTuple;
                getQuaternion?: () => QuaternionTuple;
            };
            const camQuat = (camTransform.rotation ??
                (typeof camTransform.getQuaternion === "function" ? camTransform.getQuaternion() : undefined)) as quat;
            const parallax = params.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;

            if (camQuat) {
                quat.slerp(sCloudQuat, baseQuat, camQuat, parallax);
                mat3.fromQuat(sCameraRotationMat3, sCloudQuat);
            } else {
                mat3.fromQuat(sCameraRotationMat3, baseQuat);
            }
        } else {
            mat3.fromQuat(sCameraRotationMat3, baseQuat);
        }

        cloudMaterial.updateFrameUniforms({
            aspect: activeCamera?.aspect ?? DEFAULT_CLOUD_ASPECT,
            fovScale,
            cameraRotation: sCameraRotationMat3,
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
