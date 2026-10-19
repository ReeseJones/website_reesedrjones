import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { ModelInstance } from "../models/model_instance";
import type { IMeshGeometry } from "../models/mesh_geometry_types";
import type { IMaterial } from "../materials/material_types";
import { vector3Converter } from "../../lit/converters/vector3_converter";
import type { Vector3Tuple } from "../../lit/converters/vector3_converter_types";
import type { ISceneNode } from "../core/scene_node_types";
import { parentNodeContext } from "./scene_element_types";
import {
    TAG_RJ_MODEL_INSTANCE,
    DEFAULT_MODEL_INSTANCE_NAME,
    DEFAULT_MODEL_INSTANCE_VISIBLE,
    DEFAULT_MODEL_INSTANCE_RENDER_ORDER,
    DEFAULT_MODEL_INSTANCE_POSITION,
    DEFAULT_MODEL_INSTANCE_ROTATION,
    DEFAULT_MODEL_INSTANCE_SCALE,
    VECTOR_INDEX_X,
    VECTOR_INDEX_Y,
    VECTOR_INDEX_Z,
} from "./model_instance_element_constants";

/**
 * Declarative 3D Model Instance Web Component (<rj-model-instance>)
 * synchronizing geometry, material, render order, transform hierarchy,
 * Euler rotations, translation, scale, and visibility with an underlying
 * programmatic ModelInstance, wiring itself to parent and child nodes via @lit/context.
 */
export class ModelInstanceElement extends LitElement {
    public static override properties = {
        name: { type: String, reflect: true },
        position: { converter: vector3Converter, reflect: true },
        rotation: { converter: vector3Converter, reflect: true },
        scale: { converter: vector3Converter, reflect: true },
        visible: { type: Boolean, reflect: true },
        renderOrder: { type: Number, attribute: "render-order", reflect: true },
        geometry: { attribute: false },
        material: { attribute: false },
    };

    public declare name: string;
    public declare position: Vector3Tuple;
    public declare rotation: Vector3Tuple;
    public declare scale: Vector3Tuple;
    public declare visible: boolean;
    public declare renderOrder: number;
    public declare geometry: IMeshGeometry | undefined;
    public declare material: IMaterial | undefined;

    private readonly _modelInstance: ModelInstance = new ModelInstance();
    private readonly _parentConsumer: ContextConsumer<typeof parentNodeContext, ModelInstanceElement>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    private _currentParent: ISceneNode | null = null;

    public constructor() {
        super();
        this.name = DEFAULT_MODEL_INSTANCE_NAME;
        this.position = DEFAULT_MODEL_INSTANCE_POSITION;
        this.rotation = DEFAULT_MODEL_INSTANCE_ROTATION;
        this.scale = DEFAULT_MODEL_INSTANCE_SCALE;
        this.visible = DEFAULT_MODEL_INSTANCE_VISIBLE;
        this.renderOrder = DEFAULT_MODEL_INSTANCE_RENDER_ORDER;
        this.geometry = undefined;
        this.material = undefined;

        this._parentConsumer = new ContextConsumer(this, {
            context: parentNodeContext,
            subscribe: true,
            callback: (parent) => this._handleParentNode(parent),
        });

        this._parentProvider = new ContextProvider(this, {
            context: parentNodeContext,
            initialValue: this._modelInstance,
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
     * Public accessor exposing the underlying programmatic ModelInstance.
     */
    public get modelInstance(): ModelInstance {
        return this._modelInstance;
    }

    /**
     * Public accessor exposing the underlying programmatic ModelInstance as an ISceneNode.
     */
    public get node(): ModelInstance {
        return this._modelInstance;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._parentProvider.setValue(this._modelInstance);
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this._currentParent) {
            this._currentParent.removeChild(this._modelInstance);
            this._currentParent = null;
        }
    }

    protected override willUpdate(changedProperties: PropertyValues<this>): void {
        super.willUpdate(changedProperties);

        if (changedProperties.has("name")) {
            this._modelInstance.name = this.name;
        }

        if (changedProperties.has("position") && this.position) {
            this._modelInstance.transform.setPosition(
                this.position[VECTOR_INDEX_X],
                this.position[VECTOR_INDEX_Y],
                this.position[VECTOR_INDEX_Z]
            );
        }

        if (changedProperties.has("rotation") && this.rotation) {
            this._modelInstance.transform.setRotationEuler(
                this.rotation[VECTOR_INDEX_X],
                this.rotation[VECTOR_INDEX_Y],
                this.rotation[VECTOR_INDEX_Z]
            );
        }

        if (changedProperties.has("scale") && this.scale) {
            this._modelInstance.transform.setScale(
                this.scale[VECTOR_INDEX_X],
                this.scale[VECTOR_INDEX_Y],
                this.scale[VECTOR_INDEX_Z]
            );
        }

        if (changedProperties.has("visible")) {
            this._modelInstance.visible = this.visible;
        }

        if (changedProperties.has("renderOrder")) {
            this._modelInstance.renderOrder = this.renderOrder;
        }

        if (changedProperties.has("geometry")) {
            this._modelInstance.geometry = this.geometry;
        }

        if (changedProperties.has("material")) {
            this._modelInstance.material = this.material;
        }
    }

    private _handleParentNode(parent: ISceneNode | undefined): void {
        if (this._currentParent === parent) {
            return;
        }

        if (this._currentParent) {
            this._currentParent.removeChild(this._modelInstance);
            this._currentParent = null;
        }

        if (parent) {
            parent.addChild(this._modelInstance);
            this._currentParent = parent;
        }
    }
}

let isModelInstanceElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-model-instance> with customElements.
 */
export function setupModelInstanceElement(): void {
    if (
        isModelInstanceElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_MODEL_INSTANCE))
    ) {
        return;
    }

    customElements.define(TAG_RJ_MODEL_INSTANCE, ModelInstanceElement);
    isModelInstanceElementRegistered = true;
}
