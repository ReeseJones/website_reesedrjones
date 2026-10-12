import React, { useEffect, useMemo, useRef } from "react";
import { PerspectiveCamera as ProgrammaticPerspectiveCamera } from "../camera/perspective_camera";
import type { ICamera } from "../camera/camera_types";
import { useScene, ParentNodeContext } from "./scene_context";
import { useSceneNode } from "./use_scene_node";
import type { PerspectiveCameraProps, IParentNodeContextValue } from "./scene_react_types";

/**
 * Declarative <PerspectiveCamera /> component providing 3D depth perspective projection,
 * active camera registration with <Scene />, and frustum parameter synchronization.
 */
export function PerspectiveCamera(props: PerspectiveCameraProps): React.JSX.Element {
    const cameraRef = useRef<ProgrammaticPerspectiveCamera | null>(null);
    if (!cameraRef.current) {
        cameraRef.current = new ProgrammaticPerspectiveCamera(
            {
                fov: props.fov,
                near: props.near,
                far: props.far,
                aspect: props.aspect,
            },
            props.name
        );
    }
    const camera = cameraRef.current;

    useSceneNode<ICamera>(camera, props);

    const { registerCamera } = useScene();

    useEffect(() => {
        return registerCamera(camera, props.makeDefault);
    }, [registerCamera, camera, props.makeDefault]);

    useEffect(() => {
        if (props.fov !== undefined && camera.fov !== props.fov) {
            camera.fov = props.fov;
        }
        if (props.near !== undefined && camera.near !== props.near) {
            camera.near = props.near;
        }
        if (props.far !== undefined && camera.far !== props.far) {
            camera.far = props.far;
        }
        if (props.aspect !== undefined && camera.aspect !== props.aspect) {
            camera.aspect = props.aspect;
        }
    }, [camera, props.fov, props.near, props.far, props.aspect]);

    useEffect(() => {
        return () => {
            cameraRef.current = null;
        };
    }, []);

    const contextValue = useMemo<IParentNodeContextValue>(() => ({
        parent: camera,
    }), [camera]);

    return (
        <ParentNodeContext.Provider value={contextValue}>
            {props.children}
        </ParentNodeContext.Provider>
    );
}
