import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { ModelInstance } from "../../scene/models/model_instance";
import type { IMeshGeometry } from "../../scene/models/mesh_geometry_types";
import type { IMaterial } from "../../scene/materials/material_types";
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
 * Composes an internal programmatic ModelInstance and synchronizes procedural
 * GalaxyGeometry and GalaxyMaterial lifecycles with reactive GalaxyParameters inputs.
 */
export class GalaxyStarsElement extends LitElement {
    public static override properties = {
        params: { attribute: false },
        name: { type: String, reflect: true },
        geometry: { attribute: false },
        material: { attribute: false },
    };

    public declare params: GalaxyParameters;
    public declare name: string;
    public declare geometry: IMeshGeometry | undefined;
    public declare material: IMaterial | undefined;

    private readonly _modelInstance: ModelInstance = new ModelInstance();
    private readonly _parentConsumer: ContextConsumer<typeof parentNodeContext, GalaxyStarsElement>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    private _currentParent: ISceneNode | null = null;

    public constructor() {
        super();
        this.params = DEFAULT_GALAXY_PARAMETERS;
        this.name = DEFAULT_GALAXY_STARS_NAME;
        this.geometry = getSharedGalaxyGeometry(this.params);
        this.material = getSharedGalaxyMaterial(this.params);

        this._modelInstance.name = this.name;
        this._modelInstance.geometry = this.geometry;
        this._modelInstance.material = this.material;

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
        if (changedProperties.has("params")) {
            this.geometry = getSharedGalaxyGeometry(this.params);
            this.material = getSharedGalaxyMaterial(this.params);
        }
    }

    protected override updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);

        if (changedProperties.has("name")) {
            this._modelInstance.name = this.name;
        }

        if (changedProperties.has("geometry") || changedProperties.has("params")) {
            this._modelInstance.geometry = this.geometry;
        }

        if (changedProperties.has("material") || changedProperties.has("params")) {
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
