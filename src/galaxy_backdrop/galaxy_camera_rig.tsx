import React, { useEffect, useRef } from "react";
import { mat4, quat, vec3 } from "gl-matrix";
import { PerspectiveCamera } from "../scene/react/camera_component";
import { useSceneFrame } from "../scene/react/use_scene_frame";
import { DEFAULT_CLOUD_ASPECT } from "../scene/materials/galactic_cloud_material_constants";
import { OrientationInputController } from "./orientation_input";
import { calculateAutoFarPlane } from "./galaxy_math";
import {
    CAMERA_RIG_FRAME_PRIORITY,
    DEFAULT_GALAXY_INPUT_DAMPING,
    GALAXY_ASPECT_SCALE_REFERENCE,
    MAX_GALAXY_ASPECT_SCALE,
} from "./galaxy_scene_constants";
import type { GalaxyCameraRigProps } from "./galaxy_scene_types";

/**
 * Declarative camera rig for the galaxy backdrop.
 * Mounts the default <PerspectiveCamera />, manages pointer/device orientation
 * parallax damping via OrientationInputController, and updates the active camera's
 * 3D transform on each simulation frame.
 */
export function GalaxyCameraRig({
    params,
    parallaxRef,
}: GalaxyCameraRigProps): React.JSX.Element {
    const targetPitchOffset = useRef(0);
    const currentPitchOffset = useRef(0);
    const targetYawOffset = useRef(0);
    const currentYawOffset = useRef(0);

    const viewMatrixRef = useRef<mat4>(mat4.create());
    const invCameraWorldRef = useRef<mat4>(mat4.create());
    const rotQuatRef = useRef<quat>(quat.create());
    const transVecRef = useRef<vec3>(vec3.create());

    useEffect(() => {
        const controller = new OrientationInputController({
            onUpdate: (pitch, yaw) => {
                targetPitchOffset.current = pitch;
                targetYawOffset.current = yaw;
            },
        });
        controller.attach();
        return () => {
            controller.detach();
        };
    }, []);

    useSceneFrame(({ activeCamera, timeInfo }) => {
        const damping = params.inputDamping ?? DEFAULT_GALAXY_INPUT_DAMPING;
        const decay = 1.0 - Math.exp(-damping * timeInfo.dt);
        currentPitchOffset.current +=
            (targetPitchOffset.current - currentPitchOffset.current) * decay;
        currentYawOffset.current +=
            (targetYawOffset.current - currentYawOffset.current) * decay;

        if (parallaxRef?.current) {
            parallaxRef.current.pitchOffset = currentPitchOffset.current;
            parallaxRef.current.yawOffset = currentYawOffset.current;
        }

        if (!activeCamera) {
            return;
        }

        const aspect = activeCamera.aspect ?? DEFAULT_CLOUD_ASPECT;
        const aspectScale = Math.min(
            MAX_GALAXY_ASPECT_SCALE,
            aspect / GALAXY_ASPECT_SCALE_REFERENCE
        );
        const offsetX = params.centerOffsetX * aspectScale;
        const offsetY = params.centerOffsetY;

        const pitch =
            params.pitchAngle + currentPitchOffset.current * params.mouseSensitivity;
        const yaw =
            params.yawAngle + currentYawOffset.current * params.mouseSensitivity;
        const roll = params.rollAngle;

        const v = viewMatrixRef.current;
        mat4.identity(v);
        mat4.translate(v, v, [offsetX, offsetY, -params.cameraDistance]);
        mat4.rotateX(v, v, pitch);
        mat4.rotateY(v, v, yaw);
        mat4.rotateZ(v, v, roll);

        const invW = invCameraWorldRef.current;
        if (mat4.invert(invW, v)) {
            const q = rotQuatRef.current;
            const t = transVecRef.current;
            mat4.getRotation(q, invW);
            mat4.getTranslation(t, invW);
            activeCamera.transform.setPosition(t[0], t[1], t[2]);
            activeCamera.transform.setRotationQuaternion(q[0], q[1], q[2], q[3]);
        }
    }, CAMERA_RIG_FRAME_PRIORITY);

    const far = calculateAutoFarPlane(
        params.cameraDistance,
        params.diskRadius,
        params.farPlane
    );

    return (
        <PerspectiveCamera
            name="BackdropCamera"
            fov={params.fov}
            near={params.nearPlane}
            far={far}
            makeDefault
        />
    );
}
