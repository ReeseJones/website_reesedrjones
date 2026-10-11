import { SceneNode } from "./scene_node";
import type { ISceneNode } from "./scene_node_types";
import type { IScene } from "./scene_types";
import type { ICamera } from "../camera/camera_types";

/**
 * Top-level container managing the root of the scene graph, hierarchical transform
 * updates, active camera, and visibility-pruned traversals.
 */
export class Scene extends SceneNode implements IScene {
    public activeCamera: ICamera | null = null;

    constructor(name: string = "SceneRoot", id?: string) {
        super(name, id);
    }

    public update(): void {
        this.updateWorldTransform();
    }

    public traverseVisible(callback: (node: ISceneNode) => void): void {
        const visit = (node: ISceneNode): void => {
            if (!node.computedVisible) {
                return;
            }
            callback(node);
            const children = node.children;
            for (let i = 0; i < children.length; i++) {
                visit(children[i]);
            }
        };

        visit(this);
    }

    public clear(): void {
        const children = [...this.children];
        for (let i = 0; i < children.length; i++) {
            children[i].destroy();
        }
    }

    public override destroy(): void {
        this.clear();
        super.destroy();
    }
}
