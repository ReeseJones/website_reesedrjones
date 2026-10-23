import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import {
    GalaxyStarsElement,
    setupGalaxyStarsElement,
} from "./galaxy_stars_element";
import {
    DEFAULT_GALAXY_STARS_NAME,
    TAG_RJ_GALAXY_STARS,
} from "./galaxy_stars_element_constants";
import {
    getSharedGalaxyGeometry,
    getSharedGalaxyMaterial,
    disposeSharedGalaxyResources,
} from "../resources/galaxy_resources";
import { DEFAULT_GALAXY_PARAMETERS } from "../parameters/index";
import { GalaxyGeometry } from "../../scene/models/galaxy_geometry";
import { GalaxyMaterial } from "../../scene/materials/galaxy_material";
import { ModelInstance } from "../../scene/models/model_instance";
import { setupSceneElement, SceneElement } from "../../scene/elements/scene_element";
import { TAG_RJ_SCENE } from "../../scene/elements/scene_element_constants";
import { setupNode3DElement, Node3DElement } from "../../scene/elements/node_3d_element";
import { TAG_RJ_NODE_3D } from "../../scene/elements/node_3d_element_constants";
import type { SceneFrameCallback, SceneFrameState } from "../../scene/core/scene_types";

describe("setupGalaxyStarsElement()", () => {
    it("should be idempotent and register the custom element tag", () => {
        setupGalaxyStarsElement();
        expect(customElements.get(TAG_RJ_GALAXY_STARS)).toBe(GalaxyStarsElement);

        expect(() => setupGalaxyStarsElement()).not.toThrow();
        expect(customElements.get(TAG_RJ_GALAXY_STARS)).toBe(GalaxyStarsElement);
    });
});

describe("GalaxyStarsElement", () => {
    let element: GalaxyStarsElement;

    beforeAll(() => {
        setupGalaxyStarsElement();
        setupSceneElement();
        setupNode3DElement();
    });

    beforeEach(() => {
        disposeSharedGalaxyResources();
        element = document.createElement(TAG_RJ_GALAXY_STARS) as GalaxyStarsElement;
        document.body.appendChild(element);
    });

    afterEach(() => {
        element.remove();
        document.body.innerHTML = "";
        disposeSharedGalaxyResources();
        vi.restoreAllMocks();
    });

    describe("shadow DOM rendering", () => {
        it("should render a Shadow DOM containing a slot element", async () => {
            await element.updateComplete;
            expect(element.shadowRoot).not.toBeNull();
            const slot = element.shadowRoot?.querySelector("slot");
            expect(slot).toBeInstanceOf(HTMLSlotElement);
        });
    });

    describe(".modelInstance and .node getters", () => {
        it("should return the underlying ModelInstance initialized with default resources", () => {
            const instance = element.modelInstance;
            expect(instance).toBeInstanceOf(ModelInstance);
            expect(instance.name).toBe(DEFAULT_GALAXY_STARS_NAME);
            expect(instance.geometry).toBe(getSharedGalaxyGeometry(element.params));
            expect(instance.geometry).toBeInstanceOf(GalaxyGeometry);
            expect(instance.material).toBe(getSharedGalaxyMaterial(element.params));
            expect(instance.material).toBeInstanceOf(GalaxyMaterial);
        });

        it("should expose .node returning the exact same ModelInstance", () => {
            expect(element.node).toBe(element.modelInstance);
        });
    });

    describe(".currentRotation getter", () => {
        it("should initialize currentRotation with zero Euler angles", () => {
            expect(element.currentRotation).toEqual({ x: 0, y: 0, z: 0 });
        });
    });

    describe("params property and reactivity", () => {
        it("should initialize default parameters", () => {
            const freshElement = document.createElement(TAG_RJ_GALAXY_STARS) as GalaxyStarsElement;
            expect(freshElement.params).toBe(DEFAULT_GALAXY_PARAMETERS);
        });

        it("should update geometry on morphology params update", async () => {
            await element.updateComplete;
            const initialGeometry = element.modelInstance.geometry;
            const updatedStarCount = 500;

            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                starCount: updatedStarCount,
            };
            await element.updateComplete;

            expect(element.modelInstance.geometry).toBe(initialGeometry);
            expect(element.modelInstance.geometry).toBeInstanceOf(GalaxyGeometry);
            const galaxyGeo = element.modelInstance.geometry as GalaxyGeometry;
            expect(galaxyGeo.vertexCount).toBe(updatedStarCount);
            expect(element.modelInstance.geometry).toBe(getSharedGalaxyGeometry(element.params));
        });

        it("should update material on simulation params update", async () => {
            await element.updateComplete;
            const targetRotationSpeed = 0.75;
            const targetPointScale = 8.0;

            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                rotationSpeed: targetRotationSpeed,
                pointScale: targetPointScale,
            };
            await element.updateComplete;

            const material = element.modelInstance.material as GalaxyMaterial;
            expect(material).toBeInstanceOf(GalaxyMaterial);
            expect(material.galaxyParams.rotationSpeed).toBe(targetRotationSpeed);
            expect(material.galaxyParams.pointScale).toBe(targetPointScale);
            expect(material.getUniforms()["u_rotationSpeed"]).toBeUndefined();
            expect(material.getUniforms()["u_pointScale"]).toBe(targetPointScale);
            expect(element.modelInstance.material).toBe(material);
            expect(element.modelInstance.material).toBe(getSharedGalaxyMaterial(element.params));
        });

        it("should preserve geometry reference across non-morphology updates", async () => {
            await element.updateComplete;
            const geometryBefore = element.modelInstance.geometry;

            element.params = {
                ...element.params,
                rotationSpeed: -0.12,
            };
            await element.updateComplete;

            expect(element.modelInstance.geometry).toBe(geometryBefore);
        });
    });

    describe("parentNodeContext consumption (attaching to parent)", () => {
        it("should consume parent node from enclosing SceneElement and add modelInstance to scene", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            const addChildSpy = vi.spyOn(sceneElement.scene, "addChild");
            sceneElement.appendChild(element);
            await element.updateComplete;

            const instance = element.modelInstance;
            expect(addChildSpy).toHaveBeenCalledWith(instance);
            expect(sceneElement.scene.children).toContain(instance);
            expect(instance.parent).toBe(sceneElement.scene);

            sceneElement.remove();
        });

        it("should remove modelInstance from parent on disconnection", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            sceneElement.appendChild(element);
            await element.updateComplete;

            const instance = element.modelInstance;
            expect(sceneElement.scene.children).toContain(instance);

            const removeChildSpy = vi.spyOn(sceneElement.scene, "removeChild");
            element.remove();

            expect(removeChildSpy).toHaveBeenCalledWith(instance);
            expect(sceneElement.scene.children).not.toContain(instance);
            expect(instance.parent).toBeNull();

            sceneElement.remove();
        });

        it("should support nesting inside Node3DElement", async () => {
            const parentElement = document.createElement(TAG_RJ_NODE_3D) as Node3DElement;
            document.body.appendChild(parentElement);
            await parentElement.updateComplete;

            parentElement.appendChild(element);
            await element.updateComplete;

            const instance = element.modelInstance;
            expect(parentElement.node.children).toContain(instance);
            expect(instance.parent).toBe(parentElement.node);

            element.remove();
            expect(parentElement.node.children).not.toContain(instance);
            expect(instance.parent).toBeNull();

            parentElement.remove();
        });

        it("should update parent-child relations when reparented between two Node3DElements", async () => {
            const parent1 = document.createElement(TAG_RJ_NODE_3D) as Node3DElement;
            const parent2 = document.createElement(TAG_RJ_NODE_3D) as Node3DElement;
            document.body.appendChild(parent1);
            document.body.appendChild(parent2);
            await parent1.updateComplete;
            await parent2.updateComplete;

            parent1.appendChild(element);
            await element.updateComplete;

            const instance = element.modelInstance;
            expect(parent1.node.children).toContain(instance);
            expect(instance.parent).toBe(parent1.node);

            parent2.appendChild(element);
            await element.updateComplete;

            expect(parent1.node.children).not.toContain(instance);
            expect(parent2.node.children).toContain(instance);
            expect(instance.parent).toBe(parent2.node);

            parent1.remove();
            parent2.remove();
        });

        it("should handle disconnection cleanly without throwing when unattached", () => {
            expect(() => {
                element.remove();
            }).not.toThrow();
        });
    });

    describe("parentNodeContext provision (slotted children)", () => {
        it("should provide modelInstance to slotted child elements consuming parentNodeContext", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            sceneElement.appendChild(element);
            await element.updateComplete;

            const childNode = document.createElement(TAG_RJ_NODE_3D) as Node3DElement;
            element.appendChild(childNode);
            await childNode.updateComplete;

            expect(childNode.node.parent).toBe(element.modelInstance);
            expect(element.modelInstance.children).toContain(childNode.node);

            sceneElement.remove();
        });

        it("should detach slotted child from modelInstance when child element is removed", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            sceneElement.appendChild(element);
            await element.updateComplete;

            const childNode = document.createElement(TAG_RJ_NODE_3D) as Node3DElement;
            element.appendChild(childNode);
            await childNode.updateComplete;

            expect(element.modelInstance.children).toContain(childNode.node);

            childNode.remove();
            expect(element.modelInstance.children).not.toContain(childNode.node);
            expect(childNode.node.parent).toBeNull();

            sceneElement.remove();
        });

        it("should re-provide modelInstance when element is reconnected to DOM", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            sceneElement.appendChild(element);
            await element.updateComplete;

            const childNode = document.createElement(TAG_RJ_NODE_3D) as Node3DElement;
            element.appendChild(childNode);
            await childNode.updateComplete;

            element.remove();
            expect(element.modelInstance.parent).toBeNull();

            sceneElement.appendChild(element);
            await element.updateComplete;
            await childNode.updateComplete;

            expect(childNode.node.parent).toBe(element.modelInstance);
            expect(element.modelInstance.children).toContain(childNode.node);

            sceneElement.remove();
        });
    });

    describe("sceneContext frame subscription and Euler Y rotation", () => {
        it("should subscribe to frame loop when connected inside SceneElement", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            const subscribeSpy = vi.spyOn(sceneElement, "subscribeFrame");
            sceneElement.appendChild(element);
            await element.updateComplete;

            expect(subscribeSpy).toHaveBeenCalledTimes(1);
            sceneElement.remove();
        });

        it("should update Euler Y rotation on frame ticks based on time * rotationSpeed", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            const testRotationSpeed = 0.5;
            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                rotationSpeed: testRotationSpeed,
            };

            sceneElement.appendChild(element);
            await element.updateComplete;

            expect(frameCallback).toBeDefined();

            const mockFrameState: SceneFrameState = {
                timeInfo: {
                    time: 2.0,
                    dt: 0.016,
                    frameCount: 120,
                },
                scene: sceneElement.scene,
                activeCamera: null,
            };

            frameCallback!(mockFrameState);

            const expectedAngle = 2.0 * testRotationSpeed; // 1.0 rad
            expect(element.currentRotation).toEqual({ x: 0, y: expectedAngle, z: 0 });

            const euler = element.modelInstance.transform.getEulerAngles();
            expect(euler.pitch).toBeCloseTo(0, 4);
            expect(euler.yaw).toBeCloseTo(expectedAngle, 4);
            expect(euler.roll).toBeCloseTo(0, 4);

            sceneElement.remove();
        });

        it("should remove frame subscription when disconnected from DOM", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            const unsubscribeSpy = vi.fn();
            vi.spyOn(sceneElement, "subscribeFrame").mockReturnValue(unsubscribeSpy);

            sceneElement.appendChild(element);
            await element.updateComplete;
            expect(unsubscribeSpy).not.toHaveBeenCalled();

            element.remove();
            expect(unsubscribeSpy).toHaveBeenCalledTimes(1);

            sceneElement.remove();
        });

        it("should re-subscribe to frame loop when reconnected with existing sceneContext", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            const subscribeSpy = vi.spyOn(sceneElement, "subscribeFrame");
            sceneElement.appendChild(element);
            await element.updateComplete;
            expect(subscribeSpy).toHaveBeenCalledTimes(1);

            element.remove();

            sceneElement.appendChild(element);
            await element.updateComplete;
            expect(subscribeSpy).toHaveBeenCalledTimes(2);

            sceneElement.remove();
        });

        it("should fall back to DEFAULT_GALAXY_PARAMETERS.rotationSpeed if rotationSpeed is not specified", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                rotationSpeed: undefined as unknown as number,
            };

            sceneElement.appendChild(element);
            await element.updateComplete;

            const mockFrameState: SceneFrameState = {
                timeInfo: {
                    time: 10.0,
                    dt: 0.016,
                    frameCount: 600,
                },
                scene: sceneElement.scene,
                activeCamera: null,
            };

            frameCallback!(mockFrameState);

            const expectedAngle = 10.0 * DEFAULT_GALAXY_PARAMETERS.rotationSpeed;
            expect(element.currentRotation.y).toBeCloseTo(expectedAngle, 4);

            const euler = element.modelInstance.transform.getEulerAngles();
            expect(euler.pitch).toBeCloseTo(0, 4);
            expect(euler.yaw).toBeCloseTo(expectedAngle, 4);
            expect(euler.roll).toBeCloseTo(0, 4);

            sceneElement.remove();
        });
    });
});
