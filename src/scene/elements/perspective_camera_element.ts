import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { PerspectiveCamera } from "../camera/perspective_camera";
import { vector3Converter } from "../../lit/converters/vector3_converter";
import type { Vector3Like } from "../../maths/vector_types";
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
    DEFAULT_CAMERA_HIDDEN,
    DEFAULT_CAMERA_POSITION,
    DEFAULT_CAMERA_ROTATION,
    DEFAULT_CAMERA_SCALE,
    DEFAULT_CAMERA_NAME,
} from "./perspective_camera_element_constants";

/**
 * Declarative Perspective Camera Web Component (<rj-perspective-camera>)
 * synchronizing projection attributes and spatial transformations with an
 * underlying programmatic PerspectiveCamera instance, wiring itself to the
 * enclosing scene and parent node contexts via @lit/context.
 */
export class PerspectiveCameraElement extends LitElement {
    public static override properties = {
        name: { type: String, reflect: true },
        fov: { type: Number },
        near: { type: Number },
        far: { type: Number },
        aspect: { type: Number },
        makeDefault: { type: Boolean, attribute: "make-default", reflect: true },
        position: { converter: vector3Converter, reflect: true },
        rotation: { converter: vector3Converter, reflect: true },
        scale: { converter: vector3Converter, reflect: true },
        hidden: { type: Boolean, reflect: true },
    };

    public declare name: string;
    public declare fov: number;
    public declare near: number;
    public declare far: number;
    public declare aspect: number | undefined;
    public declare makeDefault: boolean;
    public declare position: Vector3Like;
    public declare rotation: Vector3Like;
    public declare scale: Vector3Like;
    public declare hidden: boolean;

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
        this.name = DEFAULT_CAMERA_NAME;
        this.fov = DEFAULT_CAMERA_FOV;
        this.near = DEFAULT_CAMERA_NEAR;
        this.far = DEFAULT_CAMERA_FAR;
        this.aspect = undefined;
        this.makeDefault = DEFAULT_CAMERA_MAKE_DEFAULT;
        this.position = DEFAULT_CAMERA_POSITION;
        this.rotation = DEFAULT_CAMERA_ROTATION;
        this.scale = DEFAULT_CAMERA_SCALE;
        // eslint-disable-next-line wc/no-constructor-attributes
        this.hidden = DEFAULT_CAMERA_HIDDEN;
        this._camera.visible = !DEFAULT_CAMERA_HIDDEN;

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

    protected override willUpdate(changedProperties: PropertyValues<this>): void {
        super.willUpdate(changedProperties);

        if (changedProperties.has("name")) {
            this._camera.name = this.name;
        }

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
                this.position.x,
                this.position.y,
                this.position.z
            );
        }

        if (changedProperties.has("rotation") && this.rotation) {
            this._camera.transform.setRotationEuler(
                this.rotation.x,
                this.rotation.y,
                this.rotation.z
            );
        }

        if (changedProperties.has("scale") && this.scale) {
            this._camera.transform.setScale(
                this.scale.x,
                this.scale.y,
                this.scale.z
            );
        }

        if (changedProperties.has("hidden")) {
            this._camera.visible = !this.hidden;
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
