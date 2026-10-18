import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { ModelInstance } from "../../scene/models/model_instance";
import type { IMeshGeometry } from "../../scene/models/mesh_geometry_types";
import type { IMaterial } from "../../scene/materials/material_types";
import type { ISceneNode } from "../../scene/core/scene_node_types";
import {
    parentNodeContext,
    sceneContext,
    type ISceneContext,
} from "../../scene/elements/scene_element_types";
import type { SceneFrameState } from "../../scene/core/scene_types";
import { GalacticCloudMaterial } from "../../scene/materials/galactic_cloud_material";
import {
    DEFAULT_CLOUD_ASPECT,
    DEFAULT_CLOUD_PARALLAX_FACTOR,
    DEFAULT_CLOUD_PITCH,
    DEFAULT_CLOUD_ROLL,
    DEFAULT_CLOUD_YAW,
    DEG_TO_RAD,
    GALACTIC_CLOUD_RENDER_ORDER,
    HALF_FOV_FACTOR,
} from "../../scene/materials/galactic_cloud_material_constants";
import { DEFAULT_GALAXY_PARAMETERS } from "../parameters/index";
import type { GalacticCloudParameters, GalaxyParameters } from "../parameters/types";
import type { GalaxyParallaxState } from "../galaxy_scene_types";
import {
    DEFAULT_GALACTIC_CLOUD_NAME,
    DEFAULT_PARALLAX_PITCH_OFFSET,
    DEFAULT_PARALLAX_YAW_OFFSET,
    TAG_RJ_GALACTIC_CLOUD,
} from "./galactic_cloud_element_constants";
import { getSharedCloudGeometry, getSharedCloudMaterial } from "../resources/galaxy_resources";

/**
 * Declarative background celestial horizon and nebula cloud quad element (<rj-galactic-cloud>).
 * Composes an internal programmatic ModelInstance, synchronizes procedural ScreenQuadGeometry
 * and GalacticCloudMaterial lifecycles, and binds per-frame view-ray perspective and parallax
 * uniforms to the active scene camera tick.
 */
export class GalacticCloudElement extends LitElement {
    public static override properties = {
        params: { attribute: false },
        parallaxState: { attribute: false },
        name: { type: String, reflect: true },
        renderOrder: { type: Number, attribute: "render-order", reflect: true },
        visible: { type: Boolean, reflect: true },
        geometry: { attribute: false },
        material: { attribute: false },
    };

    public declare params: GalacticCloudParameters | GalaxyParameters;
    public declare parallaxState: GalaxyParallaxState;
    public declare name: string;
    public declare renderOrder: number;
    public declare visible: boolean;
    public declare geometry: IMeshGeometry | undefined;
    public declare material: IMaterial | undefined;

    private readonly _modelInstance: ModelInstance = new ModelInstance();
    private readonly _sceneConsumer: ContextConsumer<typeof sceneContext, GalacticCloudElement>;
    private readonly _parentConsumer: ContextConsumer<typeof parentNodeContext, GalacticCloudElement>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    private _frameUnsubscribe: (() => void) | undefined = undefined;
    private _currentSceneContext: ISceneContext | null = null;
    private _currentParent: ISceneNode | null = null;

    public constructor() {
        super();
        this.params = DEFAULT_GALAXY_PARAMETERS;
        this.parallaxState = {
            pitchOffset: DEFAULT_PARALLAX_PITCH_OFFSET,
            yawOffset: DEFAULT_PARALLAX_YAW_OFFSET,
        };
        this.name = DEFAULT_GALACTIC_CLOUD_NAME;
        this.renderOrder = GALACTIC_CLOUD_RENDER_ORDER;
        this.geometry = getSharedCloudGeometry();
        this.material = getSharedCloudMaterial(this.params);
        this.visible = this.params.cloudEnabled ?? true;

        this._modelInstance.name = this.name;
        this._modelInstance.renderOrder = this.renderOrder;
        this._modelInstance.geometry = this.geometry;
        this._modelInstance.material = this.material;
        this._modelInstance.visible = this.visible;

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
        if (changedProperties.has("params")) {
            this.visible = this.params.cloudEnabled ?? true;
            this.material = getSharedCloudMaterial(this.params);
        }
    }

    protected override updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);

        if (changedProperties.has("name")) {
            this._modelInstance.name = this.name;
        }

        if (changedProperties.has("renderOrder")) {
            this._modelInstance.renderOrder = this.renderOrder;
        }

        if (changedProperties.has("visible") || changedProperties.has("params")) {
            this._modelInstance.visible = this.visible;
        }

        if (changedProperties.has("geometry")) {
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
        const material = this.material;
        if (!(material instanceof GalacticCloudMaterial)) {
            return;
        }

        const params = this.params;
        let fov = DEFAULT_GALAXY_PARAMETERS.fov;
        let pitch = DEFAULT_CLOUD_PITCH;
        let yaw = DEFAULT_CLOUD_YAW;
        let roll = DEFAULT_CLOUD_ROLL;
        let mouseSensitivity = DEFAULT_GALAXY_PARAMETERS.mouseSensitivity;

        if ("fov" in params) {
            fov = params.fov;
            pitch = params.pitchAngle;
            yaw = params.yawAngle;
            roll = params.rollAngle;
            mouseSensitivity = params.mouseSensitivity;
        }

        const fovRad = fov * DEG_TO_RAD;
        const fovScale = Math.tan(fovRad * HALF_FOV_FACTOR);

        const parallaxFactor = this.params.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;
        const pitchOffset = this.parallaxState?.pitchOffset ?? DEFAULT_PARALLAX_PITCH_OFFSET;
        const yawOffset = this.parallaxState?.yawOffset ?? DEFAULT_PARALLAX_YAW_OFFSET;

        const effectivePitchOffset = pitchOffset * mouseSensitivity * parallaxFactor;
        const effectiveYawOffset = yawOffset * mouseSensitivity * parallaxFactor;

        material.updateFrameUniforms({
            aspect: frameState.activeCamera?.aspect ?? DEFAULT_CLOUD_ASPECT,
            fovScale,
            pitch,
            yaw,
            roll,
            effectivePitchOffset,
            effectiveYawOffset,
        });
    }
}

let isGalacticCloudElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-galactic-cloud> with customElements.
 */
export function setupGalacticCloudElement(): void {
    if (
        isGalacticCloudElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_GALACTIC_CLOUD))
    ) {
        return;
    }

    customElements.define(TAG_RJ_GALACTIC_CLOUD, GalacticCloudElement);
    isGalacticCloudElementRegistered = true;
}
