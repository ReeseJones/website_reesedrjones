import type { ISceneNode } from "./scene_node_types";
import type { ICamera } from "../camera/camera_types";
import type {
    AnimationFrameCallback,
    AnimationFrameState,
} from "./animation_frame_manager_types";

/**
 * Execution state delivered to every registered scene frame callback on each simulation tick.
 * Decoupled from WebGL2RenderingContext so behavior continues even when GPU rendering is paused.
 */
export interface SceneFrameState extends AnimationFrameState {
    /** Underlying programmatic scene instance */
    readonly scene: IScene;
    /** Current active camera appointed to the scene */
    readonly activeCamera: ICamera | null;
}

/**
 * Callback invoked on each simulation tick of the Scene frame loop.
 */
export type SceneFrameCallback = AnimationFrameCallback<SceneFrameState>;

export interface IScene extends ISceneNode {
    /** Appointed active camera for the scene */
    activeCamera: ICamera | null;

    /** Registers a camera with the scene and optionally appoints it as activeCamera. Returns unregister cleanup closure. */
    registerCamera(camera: ICamera, makeDefault?: boolean): () => void;

    /** Subscribes a simulation/behavior callback to the scene's demand-driven RAF loop. Returns unsubscribe cleanup closure. */
    subscribeFrame(callback: SceneFrameCallback, priority?: number): () => void;

    /** Updates transforms for the entire graph */
    update(): void;

    /** Traverses all visible nodes in the scene */
    traverseVisible(callback: (node: ISceneNode) => void): void;

    /** Clears all scene nodes and frees resources */
    clear(): void;
}
