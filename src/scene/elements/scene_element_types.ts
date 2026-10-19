import { createContext } from "@lit/context";
import type { IScene, SceneFrameCallback } from "../core/scene_types";
import type { ISceneNode } from "../core/scene_node_types";
import type { ICamera } from "../camera/camera_types";
import type { SceneElement } from "./scene_element";

/**
 * Public declarative property inputs for the root SceneElement (<rj-scene>).
 */
export interface SceneElementProps {
    priority?: number;
    clearDepth?: boolean;
    "clear-depth"?: boolean;
}

/**
 * Hierarchical scene context provided by the root <rj-scene> element to descendants.
 */
export interface ISceneContext {
    /** Underlying programmatic root scene instance */
    readonly scene: IScene;
    /** Current active camera appointed to the scene */
    readonly activeCamera: ICamera | null;
    /** Registers a camera with the scene and optionally appoints it as activeCamera */
    registerCamera(camera: ICamera, makeDefault?: boolean): () => void;
    /** Explicitly appoints the active camera or clears it */
    setActiveCamera(camera: ICamera | null): void;
    /** Subscribes a simulation frame callback to the scene loop */
    subscribeFrame(callback: SceneFrameCallback, priority?: number): () => void;
}

/**
 * Context token providing access to the root IScene instance and camera registry.
 */
export const sceneContext = createContext<ISceneContext>(
    Symbol("rj-scene-context")
);

/**
 * Context token providing access to the immediate parent ISceneNode in the hierarchy.
 */
export const parentNodeContext = createContext<ISceneNode>(
    Symbol("rj-parent-node-context")
);

declare global {
    interface HTMLElementTagNameMap {
        "rj-scene": SceneElement;
    }
}
