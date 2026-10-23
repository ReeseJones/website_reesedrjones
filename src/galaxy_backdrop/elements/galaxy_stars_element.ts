import { html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { ModelInstance } from "../../scene/models/model_instance";
import type { ISceneNode } from "../../scene/core/scene_node_types";
import {
    parentNodeContext,
    sceneContext,
    type ISceneContext,
} from "../../scene/elements/scene_element_types";
import type { SceneFrameState } from "../../scene/core/scene_types";
import type { Vector3Like } from "../../maths/vector_types";
import { DEFAULT_GALAXY_PARAMETERS } from "../parameters/index";
import type { GalaxyParameters } from "../parameters/types";
import {
    DEFAULT_GALAXY_STARS_NAME,
    TAG_RJ_GALAXY_STARS,
} from "./galaxy_stars_element_constants";
import { getSharedGalaxyGeometry, getSharedGalaxyMaterial } from "../resources/galaxy_resources";

const ROTATION_AXIS_X = 0;
const ROTATION_AXIS_Z = 0;

/**
 * Declarative spiral galaxy starfield model element (<rj-galaxy-stars>).
 * Directly owns and manages an underlying ModelInstance, synchronizing procedural
 * GalaxyGeometry and GalaxyMaterial lifecycles with the scene graph hierarchy, and rotates
 * the galaxy instance along Euler Y according to scene frame ticks and rotationSpeed.
 */
export class GalaxyStarsElement extends LitElement {
    public static override properties = {
        params: { attribute: false },
    };

    public declare params: GalaxyParameters;

    private readonly _modelInstance: ModelInstance = new ModelInstance();
    private readonly _sceneConsumer: ContextConsumer<typeof sceneContext, GalaxyStarsElement>;
    private readonly _parentConsumer: ContextConsumer<typeof parentNodeContext, GalaxyStarsElement>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    private _currentRotation: Vector3Like = { x: ROTATION_AXIS_X, y: 0, z: ROTATION_AXIS_Z };
    private _frameUnsubscribe: (() => void) | undefined = undefined;
    private _currentSceneContext: ISceneContext | null = null;
    private _currentParent: ISceneNode | null = null;

    public constructor() {
        super();
        this.params = DEFAULT_GALAXY_PARAMETERS;

        this._modelInstance.name = DEFAULT_GALAXY_STARS_NAME;
        this._modelInstance.geometry = getSharedGalaxyGeometry(this.params);
        this._modelInstance.material = getSharedGalaxyMaterial(this.params);

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
            initialValue: this._modelInstance,
        });
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

    /**
     * Public accessor exposing the current Euler rotation vector.
     */
    public get currentRotation(): Vector3Like {
        return this._currentRotation;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._parentProvider.setValue(this._modelInstance);

        if (this._sceneConsumer.value && !this._frameUnsubscribe) {
            this._handleSceneContext(this._sceneConsumer.value);
        }
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this._frameUnsubscribe) {
            this._frameUnsubscribe();
            this._frameUnsubscribe = undefined;
        }
        this._currentSceneContext = null;

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

    protected override render(): TemplateResult {
        return html`<slot></slot>`;
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

    private _handleSceneContext(context: ISceneContext | undefined): void {
        if (this._currentSceneContext === context) {
            return;
        }

        if (this._frameUnsubscribe) {
            this._frameUnsubscribe();
            this._frameUnsubscribe = undefined;
        }

        this._currentSceneContext = context ?? null;

        if (context) {
            this._frameUnsubscribe = context.subscribeFrame((frameState) => {
                this._onFrame(frameState);
            });
        }
    }

    private _onFrame(frameState: SceneFrameState): void {
        const speed = this.params.rotationSpeed ?? DEFAULT_GALAXY_PARAMETERS.rotationSpeed;
        const currentAngle = frameState.timeInfo.time * speed;
        this._currentRotation = { x: ROTATION_AXIS_X, y: currentAngle, z: ROTATION_AXIS_Z };
        this._modelInstance.transform.setRotationEuler(
            ROTATION_AXIS_X,
            currentAngle,
            ROTATION_AXIS_Z
        );
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
