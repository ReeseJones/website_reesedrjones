import { type PropertyValues } from "lit";
import { ContextConsumer } from "@lit/context";
import { mat4, quat, vec3 } from "gl-matrix";
import { PerspectiveCameraElement } from "../../scene/elements/perspective_camera_element";
import {
    sceneContext,
    type ISceneContext,
} from "../../scene/elements/scene_element_types";
import type { SceneFrameState } from "../../scene/core/scene_types";
import { OrientationInputController } from "../orientation_input";
import { calculateAutoFarPlane } from "../galaxy_math";
import {
    CAMERA_RIG_FRAME_PRIORITY,
    DEFAULT_GALAXY_INPUT_DAMPING,
    GALAXY_ASPECT_SCALE_REFERENCE,
    MAX_GALAXY_ASPECT_SCALE,
} from "../galaxy_scene_constants";
import { DEFAULT_CLOUD_ASPECT } from "../../scene/materials/galactic_cloud_material_constants";
import { DEFAULT_GALAXY_PARAMETERS } from "../parameters/index";
import type { GalaxyParameters } from "../parameters/types";
import {
    DEFAULT_GALAXY_CAMERA_NAME,
    TAG_RJ_GALAXY_CAMERA,
} from "./galaxy_camera_element_constants";

/**
 * Declarative camera rig Web Component (<rj-galaxy-camera>) subclassing PerspectiveCameraElement.
 * Encapsulates device/pointer orientation tracking via OrientationInputController,
 * simulation frame subscription at CAMERA_RIG_FRAME_PRIORITY (-10), exponential damping,
 * responsive aspect-ratio viewport compensation, view-matrix calculation, and synchronization
 * of position, rotation, and auto-computed far clipping plane back to element attributes.
 */
export class GalaxyCameraElement extends PerspectiveCameraElement {
    public static override properties = {
        ...PerspectiveCameraElement.properties,
        params: { attribute: false },
    };

    private _params: GalaxyParameters = DEFAULT_GALAXY_PARAMETERS;

    public get params(): GalaxyParameters {
        return this._params;
    }

    public set params(value: GalaxyParameters) {
        const oldParams = this._params;
        this._params = value;
        this.fov = value.fov;
        this.near = value.nearPlane;
        const autoFar = calculateAutoFarPlane(
            value.cameraDistance,
            value.diskRadius,
            value.farPlane
        );
        this.far = autoFar;
        this.camera.fov = this.fov;
        this.camera.near = this.near;
        this.camera.far = this.far;
        this.requestUpdate("params", oldParams);
    }

    private readonly _orientationController: OrientationInputController;
    private readonly _galaxySceneConsumer: ContextConsumer<typeof sceneContext, GalaxyCameraElement>;

    private _frameUnsubscribe: (() => void) | undefined = undefined;
    private _currentGalaxySceneContext: ISceneContext | null = null;

    private _targetPitchOffset: number = 0;
    private _currentPitchOffset: number = 0;
    private _targetYawOffset: number = 0;
    private _currentYawOffset: number = 0;

    private readonly _viewMatrix: mat4 = mat4.create();
    private readonly _invCameraWorld: mat4 = mat4.create();
    private readonly _rotQuat: quat = quat.create();
    private readonly _transVec: vec3 = vec3.create();
    private _hasWorldTransform: boolean = false;

    public constructor() {
        super();
        this.name = DEFAULT_GALAXY_CAMERA_NAME;
        this.params = DEFAULT_GALAXY_PARAMETERS;
        this.makeDefault = true;
        this.camera.name = this.name;

        this._orientationController = new OrientationInputController({
            onUpdate: (pitch, yaw) => {
                this._targetPitchOffset = pitch;
                this._targetYawOffset = yaw;
            },
        });

        this._galaxySceneConsumer = new ContextConsumer(this, {
            context: sceneContext,
            subscribe: true,
            callback: (context) => this._handleGalaxySceneContext(context),
        });
    }

    public get orientationController(): OrientationInputController {
        return this._orientationController;
    }

    public get currentPitchOffset(): number {
        return this._currentPitchOffset;
    }

    public get currentYawOffset(): number {
        return this._currentYawOffset;
    }

    public get targetPitchOffset(): number {
        return this._targetPitchOffset;
    }

    public get targetYawOffset(): number {
        return this._targetYawOffset;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._orientationController.attach();

        if (this._galaxySceneConsumer.value && !this._frameUnsubscribe) {
            this._handleGalaxySceneContext(this._galaxySceneConsumer.value);
        }
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._orientationController.detach();

        if (this._frameUnsubscribe) {
            this._frameUnsubscribe();
            this._frameUnsubscribe = undefined;
        }
        this._currentGalaxySceneContext = null;
    }

    protected override willUpdate(changedProperties: PropertyValues<this>): void {
        super.willUpdate(changedProperties);

        if (changedProperties.has("params")) {
            this.fov = this.params.fov;
            this.near = this.params.nearPlane;
            const autoFar = calculateAutoFarPlane(
                this.params.cameraDistance,
                this.params.diskRadius,
                this.params.farPlane
            );
            this.far = autoFar;
            this.camera.fov = this.fov;
            this.camera.near = this.near;
            this.camera.far = this.far;
        }

        if (changedProperties.has("rotation") && this._hasWorldTransform) {
            this.camera.transform.setRotationQuaternion(
                this._rotQuat[0],
                this._rotQuat[1],
                this._rotQuat[2],
                this._rotQuat[3]
            );
        }
    }

    private _handleGalaxySceneContext(context: ISceneContext | undefined): void {
        if (this._currentGalaxySceneContext === context) {
            return;
        }

        if (this._frameUnsubscribe) {
            this._frameUnsubscribe();
            this._frameUnsubscribe = undefined;
        }

        this._currentGalaxySceneContext = context ?? null;

        if (context) {
            this._frameUnsubscribe = context.subscribeFrame(
                (frameState) => this._onFrame(frameState),
                CAMERA_RIG_FRAME_PRIORITY
            );
        }
    }

    private _onFrame(frameState: SceneFrameState): void {
        const params = this.params;
        const damping = params.inputDamping ?? DEFAULT_GALAXY_INPUT_DAMPING;
        const decay = 1.0 - Math.exp(-damping * frameState.timeInfo.dt);
        this._currentPitchOffset += (this._targetPitchOffset - this._currentPitchOffset) * decay;
        this._currentYawOffset += (this._targetYawOffset - this._currentYawOffset) * decay;

        const aspect = this.camera.aspect ?? frameState.activeCamera?.aspect ?? DEFAULT_CLOUD_ASPECT;
        const aspectScale = Math.min(
            MAX_GALAXY_ASPECT_SCALE,
            aspect / GALAXY_ASPECT_SCALE_REFERENCE
        );
        const offsetX = params.centerOffsetX * aspectScale;
        const offsetY = params.centerOffsetY;

        const pitch = params.pitchAngle + this._currentPitchOffset * params.mouseSensitivity;
        const yaw = params.yawAngle + this._currentYawOffset * params.mouseSensitivity;
        const roll = params.rollAngle;

        const v = this._viewMatrix;
        mat4.identity(v);
        mat4.translate(v, v, [offsetX, offsetY, -params.cameraDistance]);
        mat4.rotateX(v, v, pitch);
        mat4.rotateY(v, v, yaw);
        mat4.rotateZ(v, v, roll);

        const invW = this._invCameraWorld;
        if (mat4.invert(invW, v)) {
            const q = this._rotQuat;
            const t = this._transVec;
            mat4.getRotation(q, invW);
            mat4.getTranslation(t, invW);
            this.camera.transform.setPosition(t[0], t[1], t[2]);
            this.camera.transform.setRotationQuaternion(q[0], q[1], q[2], q[3]);

            const euler = this.camera.transform.getEulerAngles();
            this.position = { x: t[0], y: t[1], z: t[2] };
            this.rotation = { x: euler.pitch, y: euler.yaw, z: euler.roll };
            this._hasWorldTransform = true;
        }

        const far = calculateAutoFarPlane(
            params.cameraDistance,
            params.diskRadius,
            params.farPlane
        );
        this.camera.far = far;
        this.far = far;
    }
}

let isGalaxyCameraElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-galaxy-camera> with customElements.
 */
export function setupGalaxyCameraElement(): void {
    if (
        isGalaxyCameraElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_GALAXY_CAMERA))
    ) {
        return;
    }

    customElements.define(TAG_RJ_GALAXY_CAMERA, GalaxyCameraElement);
    isGalaxyCameraElementRegistered = true;
}
