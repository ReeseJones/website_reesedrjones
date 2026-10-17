import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import { ContextProvider } from "@lit/context";
import { Scene } from "../core/scene";
import type { IScene, SceneFrameCallback } from "../core/scene_types";
import type { ICamera } from "../camera/camera_types";
import {
    sceneContext,
    parentNodeContext,
    type ISceneContext,
} from "./scene_element_types";
import { SceneCameraChangedEvent } from "./scene_element_events";
import {
    TAG_RJ_SCENE,
    DEFAULT_SCENE_PASS_PRIORITY,
    DEFAULT_SCENE_CLEAR_DEPTH,
    DEFAULT_SCENE_ROOT_NAME,
} from "./scene_element_constants";

/**
 * Root Web Component (<rj-scene>) hosting a programmatic 3D Scene graph,
 * managing active camera selection, demand-driven simulation subscriptions,
 * and providing hierarchical scene and parent node contexts via @lit/context.
 */
export class SceneElement extends LitElement implements ISceneContext {
    @property({ type: Number, reflect: true })
    public accessor priority: number = DEFAULT_SCENE_PASS_PRIORITY;

    @property({ type: Boolean, attribute: "clear-depth", reflect: true })
    public accessor clearDepth: boolean = DEFAULT_SCENE_CLEAR_DEPTH;

    private readonly _scene: Scene;
    private readonly _sceneProvider: ContextProvider<typeof sceneContext>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    public constructor() {
        super();
        this._scene = new Scene(DEFAULT_SCENE_ROOT_NAME);

        this._sceneProvider = new ContextProvider(this, {
            context: sceneContext,
            initialValue: this,
        });

        this._parentProvider = new ContextProvider(this, {
            context: parentNodeContext,
            initialValue: this._scene,
        });
    }

    /**
     * Renders into the Light DOM rather than creating a Shadow Root,
     * allowing transparent child node traversal and CSS styling.
     */
    public override createRenderRoot(): HTMLElement {
        return this;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._sceneProvider.setValue(this);
        this._parentProvider.setValue(this._scene);
    }

    /**
     * Underlying programmatic Scene instance.
     */
    public get scene(): IScene {
        return this._scene;
    }

    /**
     * Currently active camera appointed to the scene, or null if no camera is registered.
     */
    public get activeCamera(): ICamera | null {
        return this._scene.activeCamera;
    }

    /**
     * Registers a camera with the scene. If makeDefault is true or no camera is active,
     * appoints it as the active camera. Returns an unregister cleanup function.
     */
    public registerCamera(camera: ICamera, makeDefault?: boolean): () => void {
        const previousCamera = this._scene.activeCamera;
        const unregister = this._scene.registerCamera(camera, makeDefault);
        this._notifyActiveCameraChangedIfUpdated(previousCamera);

        return () => {
            const beforeUnregisterCamera = this._scene.activeCamera;
            unregister();
            this._notifyActiveCameraChangedIfUpdated(beforeUnregisterCamera);
        };
    }

    /**
     * Explicitly sets the active camera for the scene.
     */
    public setActiveCamera(camera: ICamera | null): void {
        const previousCamera = this._scene.activeCamera;
        this._scene.activeCamera = camera;
        this._notifyActiveCameraChangedIfUpdated(previousCamera);
    }

    /**
     * Subscribes a callback to the scene simulation frame loop.
     */
    public subscribeFrame(
        callback: SceneFrameCallback,
        priority?: number
    ): () => void {
        return this._scene.subscribeFrame(callback, priority);
    }

    /**
     * Explicitly destroys the programmatic scene and releases its resources.
     */
    public destroy(): void {
        this._scene.destroy();
    }

    private _notifyActiveCameraChangedIfUpdated(previousCamera: ICamera | null): void {
        if (this._scene.activeCamera !== previousCamera) {
            this._sceneProvider.setValue(this, true);
            this.dispatchEvent(new SceneCameraChangedEvent(this._scene.activeCamera));
        }
    }
}

let isSceneElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-scene> with customElements.
 */
export function setupSceneElement(): void {
    if (
        isSceneElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_SCENE))
    ) {
        return;
    }

    customElements.define(TAG_RJ_SCENE, SceneElement);
    isSceneElementRegistered = true;
}
