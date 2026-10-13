import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Scene as ProgrammaticScene } from "../core/scene";
import { ScenePass } from "../renderer/scene_pass";
import { SceneContext, ParentNodeContext } from "./scene_context";
import { DEFAULT_SCENE_PASS_PRIORITY } from "./scene_react_constants";
import type { ICamera } from "../camera/camera_types";
import type { SceneFrameCallback } from "../core/scene_types";
import type { ISceneContextValue, IParentNodeContextValue, SceneProps } from "./scene_react_types";

/**
 * Declarative root <Scene /> component hosting the programmatic 3D scene graph,
 * delegating camera registration and the demand-driven simulation loop to
 * ProgrammaticScene, and bridging to the canvas compositor via <ScenePass />.
 */
export function Scene({
    priority = DEFAULT_SCENE_PASS_PRIORITY,
    clearDepth = true,
    children,
    ref,
}: SceneProps): React.JSX.Element {
    const sceneRef = useRef<ProgrammaticScene | null>(null);
    if (!sceneRef.current) {
        sceneRef.current = new ProgrammaticScene();
    }
    const scene = sceneRef.current;

    // React 19 ref assignment
    useImperativeHandle(ref, () => scene, [scene]);

    const [activeCamera, setActiveCamera] = useState<ICamera | null>(null);

    const registerCamera = useCallback(
        (camera: ICamera, makeDefault?: boolean) => {
            const unregister = scene.registerCamera(camera, makeDefault);
            setActiveCamera(scene.activeCamera);

            return () => {
                unregister();
                setActiveCamera(scene.activeCamera);
            };
        },
        [scene]
    );

    const handleSetActiveCamera = useCallback(
        (camera: ICamera | null) => {
            scene.activeCamera = camera;
            setActiveCamera(camera);
        },
        [scene]
    );

    const subscribeFrame = useCallback(
        (callback: SceneFrameCallback, subscriberPriority?: number) => {
            return scene.subscribeFrame(callback, subscriberPriority);
        },
        [scene]
    );

    useEffect(() => {
        return () => {
            scene.destroy();
            sceneRef.current = null;
        };
    }, [scene]);

    const sceneContextValue = useMemo<ISceneContextValue>(() => ({
        scene,
        activeCamera,
        setActiveCamera: handleSetActiveCamera,
        registerCamera,
        subscribeFrame,
    }), [scene, activeCamera, handleSetActiveCamera, registerCamera, subscribeFrame]);

    const parentContextValue = useMemo<IParentNodeContextValue>(() => ({
        parent: scene,
    }), [scene]);

    return (
        <SceneContext.Provider value={sceneContextValue}>
            <ParentNodeContext.Provider value={parentContextValue}>
                {activeCamera && (
                    <ScenePass
                        scene={scene}
                        camera={activeCamera}
                        priority={priority}
                        clearDepth={clearDepth}
                    />
                )}
                {children}
            </ParentNodeContext.Provider>
        </SceneContext.Provider>
    );
}

