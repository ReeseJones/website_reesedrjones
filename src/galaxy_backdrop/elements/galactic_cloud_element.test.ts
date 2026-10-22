import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { mat3, mat4, quat } from "gl-matrix";
import {
    GalacticCloudElement,
    setupGalacticCloudElement,
} from "./galactic_cloud_element";
import {
    TAG_RJ_GALACTIC_CLOUD,
    DEFAULT_GALACTIC_CLOUD_NAME,
} from "./galactic_cloud_element_constants";
import {
    getSharedCloudGeometry,
    getSharedCloudMaterial,
    disposeSharedGalaxyResources,
} from "../resources/galaxy_resources";
import { DEFAULT_GALAXY_PARAMETERS } from "../parameters/index";
import type { GalacticCloudParameters, GalaxyParameters } from "../parameters/types";
import {
    DEFAULT_CLOUD_ASPECT,
    DEFAULT_CLOUD_PARALLAX_FACTOR,
    DEG_TO_RAD,
    GALACTIC_CLOUD_RENDER_ORDER,
    HALF_FOV_FACTOR,
} from "../../scene/materials/galactic_cloud_material_constants";
import { GalacticCloudMaterial } from "../../scene/materials/galactic_cloud_material";
import { UnlitMaterial } from "../../scene/materials/unlit_material";
import { setupSceneElement, SceneElement } from "../../scene/elements/scene_element";
import { TAG_RJ_SCENE } from "../../scene/elements/scene_element_constants";
import { PerspectiveCamera } from "../../scene/camera/perspective_camera";
import type { SceneFrameCallback, SceneFrameState } from "../../scene/core/scene_types";
import type { QuaternionTuple } from "../../scene/core/transform_types";
import { ScreenQuadGeometry } from "../../scene/models/screen_quad_geometry";
import { setupNode3DElement, Node3DElement } from "../../scene/elements/node_3d_element";
import { TAG_RJ_NODE_3D } from "../../scene/elements/node_3d_element_constants";

function computeExpectedBaseRotation(params: Partial<GalaxyParameters>): {
    baseMat: mat4;
    baseQuat: quat;
    baseRotationMat3: mat3;
} {
    const pitch = params.pitchAngle ?? DEFAULT_GALAXY_PARAMETERS.pitchAngle;
    const yaw = params.yawAngle ?? DEFAULT_GALAXY_PARAMETERS.yawAngle;
    const roll = params.rollAngle ?? DEFAULT_GALAXY_PARAMETERS.rollAngle;

    const baseMat = mat4.create();
    mat4.identity(baseMat);
    mat4.rotateX(baseMat, baseMat, pitch);
    mat4.rotateY(baseMat, baseMat, yaw);
    mat4.rotateZ(baseMat, baseMat, roll);
    mat4.invert(baseMat, baseMat);

    const baseQuat = quat.create();
    mat4.getRotation(baseQuat, baseMat);

    const baseRotationMat3 = mat3.create();
    mat3.fromQuat(baseRotationMat3, baseQuat);

    return { baseMat, baseQuat, baseRotationMat3 };
}

function computeExpectedCameraRotation(
    baseQuat: quat,
    camQuat: quat | QuaternionTuple,
    parallaxFactor: number
): mat3 {
    const cloudQuat = quat.create();
    quat.slerp(cloudQuat, baseQuat, camQuat as quat, parallaxFactor);
    const rotationMat3 = mat3.create();
    mat3.fromQuat(rotationMat3, cloudQuat);
    return rotationMat3;
}

describe("setupGalacticCloudElement()", () => {
    it("should be idempotent and register the custom element tag", () => {
        setupGalacticCloudElement();
        expect(customElements.get(TAG_RJ_GALACTIC_CLOUD)).toBe(GalacticCloudElement);

        expect(() => setupGalacticCloudElement()).not.toThrow();
        expect(customElements.get(TAG_RJ_GALACTIC_CLOUD)).toBe(GalacticCloudElement);
    });
});

describe("GalacticCloudElement", () => {
    let element: GalacticCloudElement;

    beforeAll(() => {
        setupGalacticCloudElement();
        setupSceneElement();
        setupNode3DElement();
    });

    beforeEach(() => {
        disposeSharedGalaxyResources();
        element = document.createElement(TAG_RJ_GALACTIC_CLOUD);
        document.body.appendChild(element);
    });

    afterEach(() => {
        element.remove();
        document.body.innerHTML = "";
        disposeSharedGalaxyResources();
        vi.restoreAllMocks();
    });

    describe("createRenderRoot()", () => {
        it("should return the element itself for Light DOM rendering without shadow root", () => {
            expect(element.createRenderRoot()).toBe(element);
            expect(element.shadowRoot).toBeNull();
        });
    });

    describe("defaults", () => {
        it("should initialize internal model instance name matching DEFAULT_GALACTIC_CLOUD_NAME", async () => {
            await element.updateComplete;

            expect(element.node.name).toBe(DEFAULT_GALACTIC_CLOUD_NAME);
            expect(element.modelInstance.name).toBe(DEFAULT_GALACTIC_CLOUD_NAME);
            expect(element.node).toBe(element.modelInstance);
        });

        it("should initialize with default renderOrder matching GALACTIC_CLOUD_RENDER_ORDER", async () => {
            await element.updateComplete;

            expect(element.renderOrder).toBe(GALACTIC_CLOUD_RENDER_ORDER);
            expect(element.modelInstance.renderOrder).toBe(GALACTIC_CLOUD_RENDER_ORDER);
        });

        it("should initialize with geometry matching getSharedCloudGeometry() singleton", async () => {
            await element.updateComplete;

            const expectedGeometry = getSharedCloudGeometry();
            expect(element.modelInstance.geometry).toBe(expectedGeometry);
            expect(element.modelInstance.geometry).toBeInstanceOf(ScreenQuadGeometry);
        });

        it("should initialize with material matching getSharedCloudMaterial(params)", async () => {
            await element.updateComplete;

            const expectedMaterial = getSharedCloudMaterial(element.params);
            expect(element.modelInstance.material).toBe(expectedMaterial);
            expect(element.modelInstance.material).toBeInstanceOf(GalacticCloudMaterial);
        });

        it("should initialize visible matching params.cloudEnabled", async () => {
            await element.updateComplete;

            const expectedVisible = element.params.cloudEnabled ?? true;
            expect(element.visible).toBe(expectedVisible);
            expect(element.modelInstance.visible).toBe(expectedVisible);
        });


        it("should initialize params with DEFAULT_GALAXY_PARAMETERS", async () => {
            await element.updateComplete;

            expect(element.params).toBe(DEFAULT_GALAXY_PARAMETERS);
        });
    });

    describe("params reactivity", () => {
        it("should update visibility when cloudEnabled toggles to false", async () => {
            await element.updateComplete;
            expect(element.visible).toBe(true);
            expect(element.modelInstance.visible).toBe(true);

            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                cloudEnabled: false,
            };
            await element.updateComplete;

            expect(element.visible).toBe(false);
            expect(element.modelInstance.visible).toBe(false);
        });

        it("should update visibility when cloudEnabled toggles back to true", async () => {
            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                cloudEnabled: false,
            };
            await element.updateComplete;
            expect(element.visible).toBe(false);

            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                cloudEnabled: true,
            };
            await element.updateComplete;

            expect(element.visible).toBe(true);
            expect(element.modelInstance.visible).toBe(true);
        });

        it("should fall back to true when cloudEnabled is undefined in params", async () => {
            const partialParams: Partial<GalacticCloudParameters> = {
                cloudDensity: 0.7,
                cloudScale: 1.5,
                cloudSpeed: 0.1,
                cloudParallaxFactor: 0.3,
                horizonIntensity: 1.2,
                horizonThickness: 0.35,
                horizonColorCenter: { r: 1, g: 1, b: 1 },
                horizonColorOuter: { r: 0, g: 0, b: 1 },

                cloudColorPrimary: { r: 0.1, g: 0.2, b: 0.3 },
                cloudColorSecondary: { r: 0.3, g: 0.2, b: 0.1 },
            };

            element.params = partialParams as GalacticCloudParameters;
            await element.updateComplete;

            expect(element.visible).toBe(true);
            expect(element.modelInstance.visible).toBe(true);
        });

        it("should synchronize material parameters when params change", async () => {
            await element.updateComplete;

            const targetIntensity = 3.75;
            const targetThickness = 0.85;

            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                horizonIntensity: targetIntensity,
                horizonThickness: targetThickness,
            };
            await element.updateComplete;

            const material = element.modelInstance.material as GalacticCloudMaterial;
            expect(material).toBeInstanceOf(GalacticCloudMaterial);
            const uniforms = material.getUniforms();
            expect(uniforms.uHorizonIntensity).toBe(targetIntensity);
            expect(uniforms.uHorizonThickness).toBe(targetThickness);
            expect(element.modelInstance.material).toBe(material);
        });
    });

    describe("camera orientation parallax reactivity", () => {
        it("should derive cameraRotation 3x3 matrix from active camera transform via slerp during frame tick", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let registeredFrameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                registeredFrameCallback = cb;
                return () => {
                    registeredFrameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            expect(registeredFrameCallback).toBeDefined();

            const cloudMaterial = element.modelInstance.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const camera = new PerspectiveCamera({ fov: 45, aspect: 16 / 9 });
            const cameraPitch = 0.5;
            const cameraYaw = -0.4;
            const cameraRoll = 0.0;
            camera.transform.setRotationEuler(cameraPitch, cameraYaw, cameraRoll);

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: camera,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            const params = element.params as GalaxyParameters;
            const { baseQuat } = computeExpectedBaseRotation(params);
            const parallaxFactor = params.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;
            const expectedRotationMat3 = computeExpectedCameraRotation(
                baseQuat,
                camera.transform.getQuaternion(),
                parallaxFactor
            );

            registeredFrameCallback!(frameState);

            expect(updateSpy).toHaveBeenCalledTimes(1);
            const callArgs = updateSpy.mock.calls[0][0];
            expect(callArgs.aspect).toBe(16 / 9);
            expect(callArgs.fovScale).toBeCloseTo(Math.tan(45 * DEG_TO_RAD * HALF_FOV_FACTOR), 5);
            expect(callArgs.cameraRotation).toBeInstanceOf(Float32Array);
            expect(callArgs.cameraRotation).toHaveLength(9);
            expect(callArgs.cameraRotation).toBeMatrixCloseTo(expectedRotationMat3, 4);

            sceneElement.remove();
        });

        it("should reflect new interpolated orientation when camera orientation changes", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let registeredFrameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                registeredFrameCallback = cb;
                return () => {
                    registeredFrameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            const cloudMaterial = element.modelInstance.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const camera = new PerspectiveCamera({ fov: 45, aspect: 16 / 9 });
            camera.transform.setRotationEuler(0.2, 0.3, 0.0);

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: camera,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            const params = element.params as GalaxyParameters;
            const { baseQuat } = computeExpectedBaseRotation(params);
            const parallaxFactor = params.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;

            // Frame 1
            registeredFrameCallback!(frameState);
            expect(updateSpy).toHaveBeenCalledTimes(1);
            const firstCallArgs = updateSpy.mock.calls[0][0];
            const firstRotation = new Float32Array(firstCallArgs.cameraRotation);
            const expectedRotation1 = computeExpectedCameraRotation(
                baseQuat,
                camera.transform.getQuaternion(),
                parallaxFactor
            );
            expect(firstRotation).toBeMatrixCloseTo(expectedRotation1, 4);

            // Change camera orientation
            camera.transform.setRotationEuler(-0.6, 0.8, 0.1);

            // Frame 2
            registeredFrameCallback!(frameState);
            expect(updateSpy).toHaveBeenCalledTimes(2);
            const secondCallArgs = updateSpy.mock.calls[1][0];
            const expectedRotation2 = computeExpectedCameraRotation(
                baseQuat,
                camera.transform.getQuaternion(),
                parallaxFactor
            );
            expect(secondCallArgs.cameraRotation).toBeMatrixCloseTo(expectedRotation2, 4);
            expect(secondCallArgs.cameraRotation).not.toBeMatrixCloseTo(firstRotation, 4);

            sceneElement.remove();
        });

        it("should scale orientation interpolation using custom params.cloudParallaxFactor", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let registeredFrameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                registeredFrameCallback = cb;
                return () => {
                    registeredFrameCallback = undefined;
                };
            });

            const customParallaxFactor = 0.85;
            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                cloudParallaxFactor: customParallaxFactor,
            };

            sceneElement.appendChild(element);

            const cloudMaterial = element.modelInstance.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const camera = new PerspectiveCamera({ fov: 45, aspect: 16 / 9 });
            camera.transform.setRotationEuler(0.3, 0.6, 0.0);

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: camera,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            const params = element.params as GalaxyParameters;
            const { baseQuat } = computeExpectedBaseRotation(params);
            const expectedRotation = computeExpectedCameraRotation(
                baseQuat,
                camera.transform.getQuaternion(),
                customParallaxFactor
            );

            registeredFrameCallback!(frameState);

            expect(updateSpy).toHaveBeenCalledTimes(1);
            const callArgs = updateSpy.mock.calls[0][0];
            expect(callArgs.cameraRotation).toBeMatrixCloseTo(expectedRotation, 4);

            sceneElement.remove();
        });

        it("should fall back to base galaxy orientation when activeCamera is null or undefined", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let registeredFrameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                registeredFrameCallback = cb;
                return () => {
                    registeredFrameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            const cloudMaterial = element.modelInstance.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const params = element.params as GalaxyParameters;
            const { baseRotationMat3 } = computeExpectedBaseRotation(params);

            // Null activeCamera
            const frameStateNull: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: null,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            registeredFrameCallback!(frameStateNull);

            expect(updateSpy).toHaveBeenCalledTimes(1);
            const callArgsNull = updateSpy.mock.calls[0][0];
            expect(callArgsNull.aspect).toBe(DEFAULT_CLOUD_ASPECT);
            expect(callArgsNull.cameraRotation).toBeInstanceOf(Float32Array);
            expect(callArgsNull.cameraRotation).toHaveLength(9);
            expect(callArgsNull.cameraRotation).toBeMatrixCloseTo(baseRotationMat3, 4);

            // Undefined activeCamera
            updateSpy.mockClear();
            const frameStateUndefined: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: undefined as unknown as null,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 2 },
            };

            registeredFrameCallback!(frameStateUndefined);

            expect(updateSpy).toHaveBeenCalledTimes(1);
            const callArgsUndef = updateSpy.mock.calls[0][0];
            expect(callArgsUndef.aspect).toBe(DEFAULT_CLOUD_ASPECT);
            expect(callArgsUndef.cameraRotation).toBeMatrixCloseTo(baseRotationMat3, 4);

            sceneElement.remove();
        });
    });

    describe("sceneContext frame tick", () => {
        it("should subscribe to frame loop when mounted inside SceneElement (<rj-scene>)", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            const subscribeSpy = vi.spyOn(sceneElement, "subscribeFrame");
            sceneElement.appendChild(element);

            expect(subscribeSpy).toHaveBeenCalledTimes(1);

            sceneElement.remove();
        });

        it("should call updateFrameUniforms on cloudMaterial with computed view uniforms during frame tick", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            const cloudMaterial = element.modelInstance.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const params = element.params as GalaxyParameters;
            const customCamera = new PerspectiveCamera({ fov: 60, aspect: 2.0 });
            customCamera.transform.setRotationEuler(params.pitchAngle, params.yawAngle, params.rollAngle);
            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: customCamera,
                timeInfo: { time: 2.5, dt: 0.016, frameCount: 15 },
            };

            const expectedFovRad = customCamera.fov * DEG_TO_RAD;
            const expectedFovScale = Math.tan(expectedFovRad * HALF_FOV_FACTOR);
            const { baseQuat } = computeExpectedBaseRotation(params);
            const parallaxFactor = params.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;
            const expectedRotation = computeExpectedCameraRotation(
                baseQuat,
                customCamera.transform.getQuaternion(),
                parallaxFactor
            );

            frameCallback!(frameState);

            expect(updateSpy).toHaveBeenCalledTimes(1);
            const callArgs = updateSpy.mock.calls[0][0];
            expect(callArgs.aspect).toBe(2.0);
            expect(callArgs.fovScale).toBeCloseTo(expectedFovScale, 5);
            expect(callArgs.cameraRotation).toBeInstanceOf(Float32Array);
            expect(callArgs.cameraRotation).toHaveLength(9);
            expect(callArgs.cameraRotation).toBeMatrixCloseTo(expectedRotation, 4);

            sceneElement.remove();
        });

        it("should fall back to DEFAULT_CLOUD_ASPECT when activeCamera is null in frameState", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            const cloudMaterial = element.modelInstance.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: null,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            frameCallback!(frameState);

            expect(updateSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    aspect: DEFAULT_CLOUD_ASPECT,
                })
            );

            sceneElement.remove();
        });

        it("should fall back to default orientation and fov when params lacks fov property", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            const partialParams: GalacticCloudParameters = {
                cloudEnabled: true,
                cloudDensity: 0.5,
                cloudScale: 2.0,
                cloudSpeed: 0.05,
                cloudParallaxFactor: 0.25,
                horizonIntensity: 1.0,
                horizonThickness: 0.2,
                horizonColorCenter: { r: 1, g: 1, b: 1 },
                horizonColorOuter: { r: 0, g: 0, b: 1 },

                cloudColorPrimary: { r: 0.1, g: 0.2, b: 0.3 },
                cloudColorSecondary: { r: 0.3, g: 0.2, b: 0.1 },
            };
            element.params = partialParams;

            const cloudMaterial = element.modelInstance.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: null,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            const defaultFovRad = DEFAULT_GALAXY_PARAMETERS.fov * DEG_TO_RAD;
            const expectedFovScale = Math.tan(defaultFovRad * HALF_FOV_FACTOR);
            const { baseRotationMat3 } = computeExpectedBaseRotation(DEFAULT_GALAXY_PARAMETERS);

            frameCallback!(frameState);

            expect(updateSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    aspect: DEFAULT_CLOUD_ASPECT,
                    fovScale: expectedFovScale,
                    cameraRotation: expect.any(Float32Array),
                })
            );
            const callArgs = updateSpy.mock.calls[0][0];
            expect(callArgs.cameraRotation).toBeMatrixCloseTo(baseRotationMat3, 4);

            sceneElement.remove();
        });

        it("should early return without error if material is not GalacticCloudMaterial", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            element.modelInstance.material = new UnlitMaterial();

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: null,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            expect(() => frameCallback!(frameState)).not.toThrow();

            sceneElement.remove();
        });

        it("should remove frame subscription when disconnected from DOM", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            const unsubscribeSpy = vi.fn();
            vi.spyOn(sceneElement, "subscribeFrame").mockReturnValue(unsubscribeSpy);

            sceneElement.appendChild(element);
            expect(unsubscribeSpy).not.toHaveBeenCalled();

            element.remove();
            expect(unsubscribeSpy).toHaveBeenCalledTimes(1);

            sceneElement.remove();
        });

        it("should resubscribe to frame loop when reconnected to DOM inside scene", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            const subscribeSpy = vi.spyOn(sceneElement, "subscribeFrame");

            sceneElement.appendChild(element);
            expect(subscribeSpy).toHaveBeenCalledTimes(1);

            element.remove();

            sceneElement.appendChild(element);
            expect(subscribeSpy).toHaveBeenCalledTimes(2);

            sceneElement.remove();
        });

        it("should ignore redundant scene context emissions when the same context instance is emitted", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            const subscribeSpy = vi.spyOn(sceneElement, "subscribeFrame");

            sceneElement.appendChild(element);
            expect(subscribeSpy).toHaveBeenCalledTimes(1);

            sceneElement.requestUpdate();
            expect(subscribeSpy).toHaveBeenCalledTimes(1);

            sceneElement.remove();
        });
    });

    describe("parentNodeContext integration", () => {
        it("should consume parent node from enclosing SceneElement and add modelInstance to parent", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            const addChildSpy = vi.spyOn(sceneElement.scene, "addChild");
            sceneElement.appendChild(element);

            expect(addChildSpy).toHaveBeenCalledWith(element.modelInstance);
            expect(sceneElement.scene.children).toContain(element.modelInstance);
            expect(element.modelInstance.parent).toBe(sceneElement.scene);

            sceneElement.remove();
        });

        it("should remove modelInstance from parent on disconnectedCallback", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            sceneElement.appendChild(element);
            expect(sceneElement.scene.children).toContain(element.modelInstance);

            const removeChildSpy = vi.spyOn(sceneElement.scene, "removeChild");
            element.remove();

            expect(removeChildSpy).toHaveBeenCalledWith(element.modelInstance);
            expect(sceneElement.scene.children).not.toContain(element.modelInstance);
            expect(element.modelInstance.parent).toBeNull();

            sceneElement.remove();
        });

        it("should support hierarchical scene graph nesting inside Node3DElement", () => {
            const parentElement = document.createElement(TAG_RJ_NODE_3D) as Node3DElement;
            document.body.appendChild(parentElement);

            parentElement.appendChild(element);

            expect(parentElement.node.children).toContain(element.modelInstance);
            expect(element.modelInstance.parent).toBe(parentElement.node);

            element.remove();
            expect(parentElement.node.children).not.toContain(element.modelInstance);
            expect(element.modelInstance.parent).toBeNull();

            parentElement.remove();
        });
    });
});
