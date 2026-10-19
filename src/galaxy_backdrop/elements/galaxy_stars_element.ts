import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { ModelInstance } from "../../scene/models/model_instance";
import type { ISceneNode } from "../../scene/core/scene_node_types";
import { parentNodeContext } from "../../scene/elements/scene_element_types";
import { DEFAULT_GALAXY_PARAMETERS } from "../parameters/index";
import type { GalaxyParameters } from "../parameters/types";
import {
    DEFAULT_GALAXY_STARS_NAME,
    TAG_RJ_GALAXY_STARS,
} from "./galaxy_stars_element_constants";
import { getSharedGalaxyGeometry, getSharedGalaxyMaterial } from "../resources/galaxy_resources";

/**
 * Declarative spiral galaxy starfield model element (<rj-galaxy-stars>).
 * Composes an internal programmatic ModelInstance, synchronizing procedural
 * GalaxyGeometry and GalaxyMaterial lifecycles with the scene graph hierarchy.
 */
export class GalaxyStarsElement extends LitElement {
    public static override properties = {
        params: { attribute: false },
    };

    public declare params: GalaxyParameters;

    private readonly _modelInstance: ModelInstance = new ModelInstance();
    private readonly _parentConsumer: ContextConsumer<typeof parentNodeContext, GalaxyStarsElement>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    private _currentParent: ISceneNode | null = null;

    public constructor() {
        super();
        this.params = DEFAULT_GALAXY_PARAMETERS;

        this._modelInstance.name = DEFAULT_GALAXY_STARS_NAME;
        this._modelInstance.geometry = getSharedGalaxyGeometry(this.params);
        this._modelInstance.material = getSharedGalaxyMaterial(this.params);

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
     * enabling transparent DOM queries and scene graph hierarchy attachment.
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

        if (changedProperties.has("params")) {
            this._modelInstance.geometry = getSharedGalaxyGeometry(this.params);
            this._modelInstance.material = getSharedGalaxyMaterial(this.params);
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

let isGalaxyStarsElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-galaxy-stars> with customElements.
 */
export function setupGalaxyStarsElement(): void {
    if (
        isGalaxyStarsElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_GALAXY_STARS))
    ) {
        return;
    }

    customElements.define(TAG_RJ_GALAXY_STARS, GalaxyStarsElement);
    isGalaxyStarsElementRegistered = true;
}
