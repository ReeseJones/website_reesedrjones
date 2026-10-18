import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { Scene } from "../core/scene";
import type { IScene, SceneFrameCallback } from "../core/scene_types";
import type { ICamera } from "../camera/camera_types";
import {
    sceneContext,
    parentNodeContext,
    type ISceneContext,
} from "./scene_element_types";
import {
    webglCanvasContext,
    type IWebGLCanvasContext,
} from "./webgl_canvas_element_types";
import { SceneRenderer } from "../renderer/scene_renderer";
import type { WebGLSubscriber } from "../../webgl/canvas/subscriber_types";
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
    public static override properties = {
        priority: { type: Number, reflect: true },
        clearDepth: { type: Boolean, attribute: "clear-depth", reflect: true },
    };

    public declare priority: number;
    public declare clearDepth: boolean;

    private readonly _scene: Scene;
    private readonly _sceneProvider: ContextProvider<typeof sceneContext>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;
    private readonly _canvasConsumer: ContextConsumer<typeof webglCanvasContext, SceneElement>;

    private readonly _renderer: SceneRenderer = new SceneRenderer();
    private _canvasSubscription: (() => void) | null = null;
    private _currentCanvasContext: IWebGLCanvasContext | null = null;

    public constructor() {
        super();
        this.priority = DEFAULT_SCENE_PASS_PRIORITY;
        this.clearDepth = DEFAULT_SCENE_CLEAR_DEPTH;
        this._scene = new Scene(DEFAULT_SCENE_ROOT_NAME);

        this._sceneProvider = new ContextProvider(this, {
            context: sceneContext,
            initialValue: this,
        });

        this._parentProvider = new ContextProvider(this, {
            context: parentNodeContext,
            initialValue: this._scene,
        });

        this._canvasConsumer = new ContextConsumer(this, {
            context: webglCanvasContext,
            subscribe: true,
            callback: (canvasContext) => {
                this._handleCanvasContext(canvasContext);
            },
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

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this._canvasSubscription) {
            this._canvasSubscription();
            this._canvasSubscription = null;
        }
        this._currentCanvasContext = null;
        this._renderer.reset();
    }

    protected override updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);

        if (changedProperties.has("priority") && this._currentCanvasContext) {
            this._subscribeToCanvas(this._currentCanvasContext);
        }
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
     * Scene renderer instance managing render passes and queue dispatch.
     */
    public get renderer(): SceneRenderer {
        return this._renderer;
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
        if (this._canvasSubscription) {
            this._canvasSubscription();
            this._canvasSubscription = null;
        }
        this._currentCanvasContext = null;
        this._renderer.reset();
        this._scene.destroy();
    }

    private _handleCanvasContext(canvasContext: IWebGLCanvasContext | undefined): void {
        if (this._currentCanvasContext === canvasContext) {
            return;
        }

        if (this._canvasSubscription) {
            this._canvasSubscription();
            this._canvasSubscription = null;
        }

        if (canvasContext) {
            this._currentCanvasContext = canvasContext;
            this._subscribeToCanvas(canvasContext);
        } else {
            this._currentCanvasContext = null;
            this._renderer.reset();
        }
    }

    private _subscribeToCanvas(canvasContext: IWebGLCanvasContext): void {
        if (this._canvasSubscription) {
            this._canvasSubscription();
            this._canvasSubscription = null;
        }

        const subscriber: WebGLSubscriber = {
            priority: this.priority,
            render: (_gl, timeInfo, dims) => {
                if (!this._scene.activeCamera) {
                    return;
                }
                this._renderer.render({
                    contextManager: canvasContext.contextManager,
                    scene: this._scene,
                    camera: this._scene.activeCamera,
                    dimensions: dims,
                    timeInfo,
                    clearDepth: this.clearDepth,
                });
            },
            destroy: () => {
                this._renderer.reset();
            },
        };

        this._canvasSubscription = canvasContext.subscribe(subscriber);
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
