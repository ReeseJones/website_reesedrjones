import { SceneNode } from "./scene_node";
import type { ISceneNode } from "./scene_node_types";
import type { IScene } from "./scene_types";

/**
 * Top-level container managing the root of the scene graph, hierarchical transform
 * updates, and visibility-pruned traversals.
 */
export class Scene implements IScene {
    public readonly root: SceneNode;

    constructor(rootName: string = "SceneRoot") {
        this.root = new SceneNode(rootName);
    }

    public add(node: ISceneNode): this {
        this.root.addChild(node);
        return this;
    }

    public remove(node: ISceneNode): boolean {
        return this.root.removeChild(node);
    }

    public update(): void {
        this.root.updateWorldTransform();
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

        visit(this.root);
    }

    public clear(): void {
        const children = [...this.root.children];
        for (let i = 0; i < children.length; i++) {
            children[i].destroy();
        }
    }

    public dispose(): void {
        this.clear();
        this.root.destroy();
    }
}
