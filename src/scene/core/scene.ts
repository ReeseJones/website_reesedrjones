import { SceneNode } from "./scene_node";
import { AnimationFrameManager } from "./animation_frame_manager";
import { DEFAULT_FRAME_SUBSCRIBER_PRIORITY } from "./animation_frame_manager_constants";
import type { IAnimationFrameScheduler } from "./animation_frame_manager_types";
import type { ISceneNode } from "./scene_node_types";
import type {
    IScene,
    SceneFrameCallback,
    SceneFrameState,
} from "./scene_types";
import type { ICamera } from "../camera/camera_types";

/**
 * Top-level container managing the root of the scene graph, hierarchical transform
 * updates, registered cameras, active camera appointment, visibility-pruned traversals,
 * and the demand-driven simulation frame loop.
 */
export class Scene extends SceneNode implements IScene {
    public activeCamera: ICamera | null = null;

    private _cameras: ICamera[] = [];
    private readonly _frameManager: AnimationFrameManager<SceneFrameState>;

    constructor(
        name: string = "SceneRoot",
        id?: string,
        scheduler?: IAnimationFrameScheduler
    ) {
        super(name, id);
        this._frameManager = new AnimationFrameManager<SceneFrameState>(
            (timeInfo) => ({
                scene: this,
                activeCamera: this.activeCamera,
                timeInfo,
            }),
            scheduler
        );
    }

    public registerCamera(camera: ICamera, makeDefault?: boolean): () => void {
        if (!this._cameras.includes(camera)) {
            this._cameras.push(camera);
        }

        if (makeDefault || this.activeCamera === null) {
            this.activeCamera = camera;
        }

        return () => {
            const index = this._cameras.indexOf(camera);
            if (index !== -1) {
                this._cameras.splice(index, 1);
            }

            if (this.activeCamera === camera) {
                this.activeCamera = this._cameras.length > 0
                    ? this._cameras[this._cameras.length - 1]
                    : null;
            }
        };
    }

    public subscribeFrame(
        callback: SceneFrameCallback,
        priority: number = DEFAULT_FRAME_SUBSCRIBER_PRIORITY
    ): () => void {
        return this._frameManager.subscribe(callback, priority);
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
        this._frameManager.destroy();
        this._cameras = [];
        this.activeCamera = null;
        this.clear();
        super.destroy();
    }
}
