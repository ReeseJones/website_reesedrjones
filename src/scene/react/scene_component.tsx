import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Scene as ProgrammaticScene } from "../core/scene";
import { ScenePass } from "../renderer/scene_pass";
import { SceneContext, ParentNodeContext } from "./scene_context";
import { DEFAULT_SCENE_PASS_PRIORITY } from "./scene_react_constants";
import type { ICamera } from "../camera/camera_types";
import type { ISceneContextValue, IParentNodeContextValue, SceneProps } from "./scene_react_types";

/**
 * Declarative root <Scene /> component hosting the programmatic 3D scene graph,
 * managing registered cameras and active camera appointment, and bridging to
 * the canvas compositor via <ScenePass />.
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
    useImperativeHandle(ref, () => scene, [scene, ref]);

    const camerasRef = useRef<ICamera[]>([]);
    const [activeCamera, setActiveCamera] = useState<ICamera | null>(null);

    const registerCamera = useCallback((camera: ICamera, makeDefault?: boolean) => {
        if (!camerasRef.current.includes(camera)) {
            camerasRef.current.push(camera);
        }

        setActiveCamera((current) => {
            if (makeDefault || current === null) {
                return camera;
            }
            return current;
        });

        return () => {
            const index = camerasRef.current.indexOf(camera);
            if (index !== -1) {
                camerasRef.current.splice(index, 1);
            }

            setActiveCamera((current) => {
                if (current === camera) {
                    return camerasRef.current.length > 0
                        ? camerasRef.current[camerasRef.current.length - 1]
                        : null;
                }
                return current;
            });
        };
    }, []);

    const handleSetActiveCamera = useCallback((camera: ICamera | null) => {
        setActiveCamera(camera);
    }, []);

    useEffect(() => {
        scene.activeCamera = activeCamera;
    }, [scene, activeCamera]);

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
    }), [scene, activeCamera, handleSetActiveCamera, registerCamera]);

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
