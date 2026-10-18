import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import {
    GalacticCloudElement,
    setupGalacticCloudElement,
} from "./galactic_cloud_element";
import {
    TAG_RJ_GALACTIC_CLOUD,
    DEFAULT_GALACTIC_CLOUD_NAME,
    DEFAULT_PARALLAX_PITCH_OFFSET,
    DEFAULT_PARALLAX_YAW_OFFSET,
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
    DEFAULT_CLOUD_PITCH,
    DEFAULT_CLOUD_ROLL,
    DEFAULT_CLOUD_YAW,
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
import { ScreenQuadGeometry } from "../../scene/models/screen_quad_geometry";
import { setupNode3DElement, Node3DElement } from "../../scene/elements/node_3d_element";
import { TAG_RJ_NODE_3D } from "../../scene/elements/node_3d_element_constants";

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
        it("should initialize with default name matching DEFAULT_GALACTIC_CLOUD_NAME", async () => {
            await element.updateComplete;

            expect(element.name).toBe(DEFAULT_GALACTIC_CLOUD_NAME);
            expect(element.modelInstance.name).toBe(DEFAULT_GALACTIC_CLOUD_NAME);
        });

        it("should initialize with default renderOrder matching GALACTIC_CLOUD_RENDER_ORDER", async () => {
            await element.updateComplete;

            expect(element.renderOrder).toBe(GALACTIC_CLOUD_RENDER_ORDER);
            expect(element.modelInstance.renderOrder).toBe(GALACTIC_CLOUD_RENDER_ORDER);
        });

        it("should initialize with geometry matching getSharedCloudGeometry() singleton", async () => {
            await element.updateComplete;

            const expectedGeometry = getSharedCloudGeometry();
            expect(element.geometry).toBe(expectedGeometry);
            expect(element.modelInstance.geometry).toBe(expectedGeometry);
            expect(element.geometry).toBeInstanceOf(ScreenQuadGeometry);
        });

        it("should initialize with material matching getSharedCloudMaterial(params)", async () => {
            await element.updateComplete;

            const expectedMaterial = getSharedCloudMaterial(element.params);
            expect(element.material).toBe(expectedMaterial);
            expect(element.modelInstance.material).toBe(expectedMaterial);
            expect(element.material).toBeInstanceOf(GalacticCloudMaterial);
        });

        it("should initialize visible matching params.cloudEnabled", async () => {
            await element.updateComplete;

            const expectedVisible = element.params.cloudEnabled ?? true;
            expect(element.visible).toBe(expectedVisible);
            expect(element.modelInstance.visible).toBe(expectedVisible);
        });

        it("should initialize parallaxState with default offsets", async () => {
            await element.updateComplete;

            expect(element.parallaxState).toEqual({
                pitchOffset: DEFAULT_PARALLAX_PITCH_OFFSET,
                yawOffset: DEFAULT_PARALLAX_YAW_OFFSET,
            });
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
                horizonColorCenter: [1, 1, 1],
                horizonColorOuter: [0, 0, 1],
                horizonColor: [0, 0, 1],
                cloudColorPrimary: [0.1, 0.2, 0.3],
                cloudColorSecondary: [0.3, 0.2, 0.1],
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

            const material = element.material as GalacticCloudMaterial;
            expect(material).toBeInstanceOf(GalacticCloudMaterial);
            const uniforms = material.getUniforms();
            expect(uniforms.uHorizonIntensity).toBe(targetIntensity);
            expect(uniforms.uHorizonThickness).toBe(targetThickness);
            expect(element.modelInstance.material).toBe(material);
        });
    });

    describe("parallaxState reactivity", () => {
        it("should update parallaxState property", async () => {
            await element.updateComplete;

            const nextState = { pitchOffset: 0.35, yawOffset: -0.15 };
            element.parallaxState = nextState;
            await element.updateComplete;

            expect(element.parallaxState).toEqual(nextState);
        });

        it("should alter effective pitch and yaw offsets computed during frame tick", () => {
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

            const cloudMaterial = element.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const camera = new PerspectiveCamera({ fov: 45, aspect: 16 / 9 });
            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: camera,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            const pitchOffset = 0.5;
            const yawOffset = -0.4;
            element.parallaxState = { pitchOffset, yawOffset };

            const mouseSensitivity = (element.params as GalaxyParameters).mouseSensitivity;
            const parallaxFactor = element.params.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;
            const expectedPitchOffset = pitchOffset * mouseSensitivity * parallaxFactor;
            const expectedYawOffset = yawOffset * mouseSensitivity * parallaxFactor;

            registeredFrameCallback!(frameState);

            expect(updateSpy).toHaveBeenCalledTimes(1);
            expect(updateSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    effectivePitchOffset: expectedPitchOffset,
                    effectiveYawOffset: expectedYawOffset,
                })
            );

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

            const cloudMaterial = element.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const customCamera = new PerspectiveCamera({ fov: 60, aspect: 2.0 });
            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: customCamera,
                timeInfo: { time: 2.5, dt: 0.016, frameCount: 15 },
            };

            const params = element.params as GalaxyParameters;
            const expectedFovRad = params.fov * DEG_TO_RAD;
            const expectedFovScale = Math.tan(expectedFovRad * HALF_FOV_FACTOR);

            frameCallback!(frameState);

            expect(updateSpy).toHaveBeenCalledTimes(1);
            expect(updateSpy).toHaveBeenCalledWith({
                aspect: 2.0,
                fovScale: expectedFovScale,
                pitch: params.pitchAngle,
                yaw: params.yawAngle,
                roll: params.rollAngle,
                effectivePitchOffset: 0,
                effectiveYawOffset: 0,
            });

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

            const cloudMaterial = element.material as GalacticCloudMaterial;
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
                horizonColorCenter: [1, 1, 1],
                horizonColorOuter: [0, 0, 1],
                horizonColor: [0, 0, 1],
                cloudColorPrimary: [0.1, 0.2, 0.3],
                cloudColorSecondary: [0.3, 0.2, 0.1],
            };
            element.params = partialParams;

            const cloudMaterial = element.material as GalacticCloudMaterial;
            const updateSpy = vi.spyOn(cloudMaterial, "updateFrameUniforms");

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: null,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            const defaultFovRad = DEFAULT_GALAXY_PARAMETERS.fov * DEG_TO_RAD;
            const expectedFovScale = Math.tan(defaultFovRad * HALF_FOV_FACTOR);

            frameCallback!(frameState);

            expect(updateSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    fovScale: expectedFovScale,
                    pitch: DEFAULT_CLOUD_PITCH,
                    yaw: DEFAULT_CLOUD_YAW,
                    roll: DEFAULT_CLOUD_ROLL,
                })
            );

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

            element.material = new UnlitMaterial();

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
