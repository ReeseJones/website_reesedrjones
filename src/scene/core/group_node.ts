import { SceneNode } from "./scene_node";

/**
 * Lightweight empty scene node used for spatial organization, hierarchy grouping,
 * compound offsets, and pivot point definition.
 */
export class GroupNode extends SceneNode {
    constructor(name: string = "GroupNode", id?: string) {
        super(name, id);
    }
}
