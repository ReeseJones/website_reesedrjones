import type { ISceneNode } from "./scene_node_types";

export interface IScene {
    /** Root container node */
    readonly root: ISceneNode;

    /** Adds top-level nodes to the scene */
    add(node: ISceneNode): this;

    /** Removes nodes from the scene */
    remove(node: ISceneNode): boolean;

    /** Updates transforms for the entire graph */
    update(): void;

    /** Traverses all visible nodes in the scene */
    traverseVisible(callback: (node: ISceneNode) => void): void;

    /** Clears all scene nodes and frees resources */
    clear(): void;
}
