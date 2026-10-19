import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { ModelInstance } from "../../scene/models/model_instance";
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
        renderOrder: { type: Number, attribute: "render-order", reflect: true },
        visible: { type: Boolean, reflect: true },
    };

    public declare params: GalacticCloudParameters | GalaxyParameters;
    public declare renderOrder: number;
    public declare visible: boolean;

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
        this.renderOrder = GALACTIC_CLOUD_RENDER_ORDER;
        this.visible = this.params.cloudEnabled ?? true;

        this._modelInstance.name = DEFAULT_GALACTIC_CLOUD_NAME;
        this._modelInstance.renderOrder = this.renderOrder;
        this._modelInstance.geometry = getSharedCloudGeometry();
        this._modelInstance.material = getSharedCloudMaterial(this.params);
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
        super.willUpdate(changedProperties);

        if (changedProperties.has("params")) {
            this.visible = this.params.cloudEnabled ?? true;
            this._modelInstance.material = getSharedCloudMaterial(this.params);
        }

        if (changedProperties.has("renderOrder")) {
            this._modelInstance.renderOrder = this.renderOrder;
        }

        if (changedProperties.has("visible") || changedProperties.has("params")) {
            this._modelInstance.visible = this.visible;
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
        const material = this._modelInstance.material;
        if (!(material instanceof GalacticCloudMaterial)) {
            return;
        }

        const params = this.params;
        let fov = DEFAULT_GALAXY_PARAMETERS.fov;
        let pitch = DEFAULT_CLOUD_PITCH;
        let yaw = DEFAULT_CLOUD_YAW;
        let roll = DEFAULT_CLOUD_ROLL;

        if ("fov" in params) {
            fov = params.fov;
            pitch = params.pitchAngle;
            yaw = params.yawAngle;
            roll = params.rollAngle;
        }

        const fovRad = fov * DEG_TO_RAD;
        const fovScale = Math.tan(fovRad * HALF_FOV_FACTOR);

        const parallaxFactor = this.params.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;
        const cameraAngles = frameState.activeCamera?.transform.getEulerAngles();
        const pitchOffset = cameraAngles ? cameraAngles.pitch - pitch : DEFAULT_PARALLAX_PITCH_OFFSET;
        const yawOffset = cameraAngles ? cameraAngles.yaw - yaw : DEFAULT_PARALLAX_YAW_OFFSET;

        const effectivePitchOffset = pitchOffset * parallaxFactor;
        const effectiveYawOffset = yawOffset * parallaxFactor;

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
