import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { PerspectiveCamera } from "../camera/perspective_camera";
import { vector3Converter } from "../../lit/converters/vector3_converter";
import type { Vector3Tuple } from "../../lit/converters/vector3_converter_types";
import type { ISceneNode } from "../core/scene_node_types";
import {
    sceneContext,
    parentNodeContext,
    type ISceneContext,
} from "./scene_element_types";
import {
    TAG_RJ_PERSPECTIVE_CAMERA,
    DEFAULT_CAMERA_FOV,
    DEFAULT_CAMERA_NEAR,
    DEFAULT_CAMERA_FAR,
    DEFAULT_CAMERA_ASPECT,
    DEFAULT_CAMERA_MAKE_DEFAULT,
    DEFAULT_CAMERA_VISIBLE,
    DEFAULT_CAMERA_POSITION,
    DEFAULT_CAMERA_ROTATION,
    DEFAULT_CAMERA_SCALE,
    VECTOR_INDEX_X,
    VECTOR_INDEX_Y,
    VECTOR_INDEX_Z,
} from "./perspective_camera_element_constants";

/**
 * Declarative Perspective Camera Web Component (<rj-perspective-camera>)
 * synchronizing projection attributes and spatial transformations with an
 * underlying programmatic PerspectiveCamera instance, wiring itself to the
 * enclosing scene and parent node contexts via @lit/context.
 */
export class PerspectiveCameraElement extends LitElement {
    public static override properties = {
        fov: { type: Number, reflect: true },
        near: { type: Number, reflect: true },
        far: { type: Number, reflect: true },
        aspect: { type: Number, reflect: true },
        makeDefault: { type: Boolean, attribute: "make-default", reflect: true },
        position: { converter: vector3Converter, reflect: true },
        rotation: { converter: vector3Converter, reflect: true },
        scale: { converter: vector3Converter, reflect: true },
        visible: { type: Boolean, reflect: true },
    };

    public declare fov: number;
    public declare near: number;
    public declare far: number;
    public declare aspect: number | undefined;
    public declare makeDefault: boolean;
    public declare position: Vector3Tuple;
    public declare rotation: Vector3Tuple;
    public declare scale: Vector3Tuple;
    public declare visible: boolean;

    private readonly _camera: PerspectiveCamera = new PerspectiveCamera({
        fov: DEFAULT_CAMERA_FOV,
        near: DEFAULT_CAMERA_NEAR,
        far: DEFAULT_CAMERA_FAR,
        aspect: DEFAULT_CAMERA_ASPECT,
    });

    private readonly _sceneConsumer: ContextConsumer<typeof sceneContext, PerspectiveCameraElement>;
    private readonly _parentConsumer: ContextConsumer<typeof parentNodeContext, PerspectiveCameraElement>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    private _sceneUnregister: (() => void) | undefined = undefined;
    private _currentSceneContext: ISceneContext | null = null;
    private _currentParent: ISceneNode | null = null;

    public constructor() {
        super();
        this.fov = DEFAULT_CAMERA_FOV;
        this.near = DEFAULT_CAMERA_NEAR;
        this.far = DEFAULT_CAMERA_FAR;
        this.aspect = undefined;
        this.makeDefault = DEFAULT_CAMERA_MAKE_DEFAULT;
        this.position = DEFAULT_CAMERA_POSITION;
        this.rotation = DEFAULT_CAMERA_ROTATION;
        this.scale = DEFAULT_CAMERA_SCALE;
        this.visible = DEFAULT_CAMERA_VISIBLE;

        this._sceneConsumer = new ContextConsumer(this, {
            context: sceneContext,
            subscribe: true,
            callback: (context) => this._handleSceneContext(context),
        });

        this._parentConsumer = new ContextConsumer(this, {
            context: parentNodeContext,
            subscribe: true,
            callback: (parent) => this._handleParentNode(parent),
        });

        this._parentProvider = new ContextProvider(this, {
            context: parentNodeContext,
            initialValue: this._camera,
        });
    }

    /**
     * Renders into the Light DOM rather than creating a Shadow Root,
     * enabling transparent DOM queries and child scene element attachment.
     */
    public override createRenderRoot(): HTMLElement {
        return this;
    }

    /**
     * Public accessor exposing the underlying programmatic PerspectiveCamera instance.
     */
    public get camera(): PerspectiveCamera {
        return this._camera;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._parentProvider.setValue(this._camera);
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this._sceneUnregister) {
            this._sceneUnregister();
            this._sceneUnregister = undefined;
        }
        this._currentSceneContext = null;

        if (this._currentParent) {
            this._currentParent.removeChild(this._camera);
            this._currentParent = null;
        }
    }

    protected override updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);

        if (
            changedProperties.has("fov") ||
            changedProperties.has("near") ||
            changedProperties.has("far") ||
            changedProperties.has("aspect")
        ) {
            this._camera.fov = this.fov;
            this._camera.near = this.near;
            this._camera.far = this.far;
            this._camera.aspect = this.aspect ?? DEFAULT_CAMERA_ASPECT;
        }

        if (changedProperties.has("position") && this.position) {
            this._camera.transform.setPosition(
                this.position[VECTOR_INDEX_X],
                this.position[VECTOR_INDEX_Y],
                this.position[VECTOR_INDEX_Z]
            );
        }

        if (changedProperties.has("rotation") && this.rotation) {
            this._camera.transform.setRotationEuler(
                this.rotation[VECTOR_INDEX_X],
                this.rotation[VECTOR_INDEX_Y],
                this.rotation[VECTOR_INDEX_Z]
            );
        }

        if (changedProperties.has("scale") && this.scale) {
            this._camera.transform.setScale(
                this.scale[VECTOR_INDEX_X],
                this.scale[VECTOR_INDEX_Y],
                this.scale[VECTOR_INDEX_Z]
            );
        }

        if (changedProperties.has("visible")) {
            this._camera.visible = this.visible;
        }

        if (changedProperties.has("makeDefault") && this.makeDefault) {
            this._currentSceneContext?.setActiveCamera(this._camera);
        }
    }

    private _handleSceneContext(context: ISceneContext | undefined): void {
        if (this._currentSceneContext === context) {
            return;
        }

        if (this._sceneUnregister) {
            this._sceneUnregister();
            this._sceneUnregister = undefined;
        }

        this._currentSceneContext = context ?? null;

        if (context) {
            this._sceneUnregister = context.registerCamera(this._camera, this.makeDefault);
        }
    }

    private _handleParentNode(parent: ISceneNode | undefined): void {
        if (this._currentParent === parent) {
            return;
        }

        if (this._currentParent) {
            this._currentParent.removeChild(this._camera);
            this._currentParent = null;
        }

        if (parent) {
            parent.addChild(this._camera);
            this._currentParent = parent;
        }
    }
}

let isPerspectiveCameraElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-perspective-camera> with customElements.
 */
export function setupPerspectiveCameraElement(): void {
    if (
        isPerspectiveCameraElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_PERSPECTIVE_CAMERA))
    ) {
        return;
    }

    customElements.define(TAG_RJ_PERSPECTIVE_CAMERA, PerspectiveCameraElement);
    isPerspectiveCameraElementRegistered = true;
}
