import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { SceneNode } from "../core/scene_node";
import { vector3Converter } from "../../lit/converters/vector3_converter";
import type { Vector3Like } from "../../maths/vector_types";
import type { ISceneNode } from "../core/scene_node_types";
import { parentNodeContext } from "./scene_element_types";
import {
    TAG_RJ_NODE_3D,
    DEFAULT_NODE_3D_NAME,
    DEFAULT_NODE_3D_VISIBLE,
    DEFAULT_NODE_3D_POSITION,
    DEFAULT_NODE_3D_ROTATION,
    DEFAULT_NODE_3D_SCALE,
} from "./node_3d_element_constants";

/**
 * Declarative 3D Spatial Node Web Component (<rj-node-3d>)
 * synchronizing transform hierarchy, Euler rotations, translation, scale,
 * and visibility with an underlying programmatic SceneNode instance,
 * wiring itself to parent and child nodes via @lit/context.
 */
export class Node3DElement extends LitElement {
    public static override properties = {
        name: { type: String, reflect: true },
        position: { converter: vector3Converter, reflect: true },
        rotation: { converter: vector3Converter, reflect: true },
        scale: { converter: vector3Converter, reflect: true },
        visible: { type: Boolean, reflect: true },
    };

    public declare name: string;
    public declare position: Vector3Like;
    public declare rotation: Vector3Like;
    public declare scale: Vector3Like;
    public declare visible: boolean;

    private readonly _node: SceneNode = new SceneNode();
    private readonly _parentConsumer: ContextConsumer<typeof parentNodeContext, Node3DElement>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    private _currentParent: ISceneNode | null = null;

    public constructor() {
        super();
        this.name = DEFAULT_NODE_3D_NAME;
        this.position = DEFAULT_NODE_3D_POSITION;
        this.rotation = DEFAULT_NODE_3D_ROTATION;
        this.scale = DEFAULT_NODE_3D_SCALE;
        this.visible = DEFAULT_NODE_3D_VISIBLE;

        this._parentConsumer = new ContextConsumer(this, {
            context: parentNodeContext,
            subscribe: true,
            callback: (parent) => this._handleParentNode(parent),
        });

        this._parentProvider = new ContextProvider(this, {
            context: parentNodeContext,
            initialValue: this._node,
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
     * Public accessor exposing the underlying programmatic SceneNode instance.
     */
    public get node(): SceneNode {
        return this._node;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._parentProvider.setValue(this._node);
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this._currentParent) {
            this._currentParent.removeChild(this._node);
            this._currentParent = null;
        }
    }

    protected override willUpdate(changedProperties: PropertyValues<this>): void {
        super.willUpdate(changedProperties);

        if (changedProperties.has("name")) {
            this._node.name = this.name;
        }

        if (changedProperties.has("position") && this.position) {
            this._node.transform.setPosition(
                this.position.x,
                this.position.y,
                this.position.z
            );
        }

        if (changedProperties.has("rotation") && this.rotation) {
            this._node.transform.setRotationEuler(
                this.rotation.x,
                this.rotation.y,
                this.rotation.z
            );
        }

        if (changedProperties.has("scale") && this.scale) {
            this._node.transform.setScale(
                this.scale.x,
                this.scale.y,
                this.scale.z
            );
        }

        if (changedProperties.has("visible")) {
            this._node.visible = this.visible;
        }
    }

    private _handleParentNode(parent: ISceneNode | undefined): void {
        if (this._currentParent === parent) {
            return;
        }

        if (this._currentParent) {
            this._currentParent.removeChild(this._node);
            this._currentParent = null;
        }

        if (parent) {
            parent.addChild(this._node);
            this._currentParent = parent;
        }
    }
}

let isNode3DElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-node-3d> with customElements.
 */
export function setupNode3DElement(): void {
    if (
        isNode3DElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_NODE_3D))
    ) {
        return;
    }

    customElements.define(TAG_RJ_NODE_3D, Node3DElement);
    isNode3DElementRegistered = true;
}
