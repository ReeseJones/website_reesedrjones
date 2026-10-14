import type { ICamera } from "../camera/camera_types";
import type { ISceneNode } from "../core/scene_node_types";
import {
    EVENT_ACTIVE_CAMERA_CHANGED,
    EVENT_SCENE_NODE_ATTACHED,
    EVENT_SCENE_NODE_DETACHED,
} from "./scene_element_constants";

/**
 * Event dispatched whenever the active camera of an <rj-scene> changes.
 */
export class SceneCameraChangedEvent extends Event {
    public static readonly TYPE = EVENT_ACTIVE_CAMERA_CHANGED;

    public readonly camera: ICamera | null;

    public constructor(camera: ICamera | null) {
        super(SceneCameraChangedEvent.TYPE, { bubbles: true, composed: true });
        this.camera = camera;
    }
}

/**
 * Event dispatched when a scene graph node attaches to the DOM hierarchy.
 */
export class SceneNodeAttachedEvent extends Event {
    public static readonly TYPE = EVENT_SCENE_NODE_ATTACHED;

    public readonly node: ISceneNode;
    public readonly element: HTMLElement;

    public constructor(node: ISceneNode, element: HTMLElement) {
        super(SceneNodeAttachedEvent.TYPE, { bubbles: true, composed: true });
        this.node = node;
        this.element = element;
    }
}

/**
 * Event dispatched when a scene graph node detaches from the DOM hierarchy.
 */
export class SceneNodeDetachedEvent extends Event {
    public static readonly TYPE = EVENT_SCENE_NODE_DETACHED;

    public readonly node: ISceneNode;
    public readonly element: HTMLElement;

    public constructor(node: ISceneNode, element: HTMLElement) {
        super(SceneNodeDetachedEvent.TYPE, { bubbles: true, composed: true });
        this.node = node;
        this.element = element;
    }
}

declare global {
    interface HTMLElementEventMap {
        [SceneCameraChangedEvent.TYPE]: SceneCameraChangedEvent;
        [SceneNodeAttachedEvent.TYPE]: SceneNodeAttachedEvent;
        [SceneNodeDetachedEvent.TYPE]: SceneNodeDetachedEvent;
    }
}
