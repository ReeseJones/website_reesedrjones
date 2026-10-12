import type { ISceneNode } from "./scene_node_types";
import type { ICamera } from "../camera/camera_types";

export interface IScene extends ISceneNode {
    /** Appointed active camera for the scene */
    activeCamera: ICamera | null;

    /** Updates transforms for the entire graph */
    update(): void;

    /** Traverses all visible nodes in the scene */
    traverseVisible(callback: (node: ISceneNode) => void): void;

    /** Clears all scene nodes and frees resources */
    clear(): void;
}
