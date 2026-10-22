import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import {
    GalaxyStarsElement,
    setupGalaxyStarsElement,
} from "./galaxy_stars_element";
import { TAG_RJ_GALAXY_STARS } from "./galaxy_stars_element_constants";
import {
    ModelInstanceElement,
} from "../../scene/elements/model_instance_element";
import { TAG_RJ_MODEL_INSTANCE } from "../../scene/elements/model_instance_element_constants";
import type { Vector3Like } from "../../maths/vector_types";
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

describe("setupGalaxyStarsElement()", () => {
    it("should be idempotent and register the custom element tag", () => {
        setupGalaxyStarsElement();
        expect(customElements.get(TAG_RJ_GALAXY_STARS)).toBe(GalaxyStarsElement);

        expect(() => setupGalaxyStarsElement()).not.toThrow();
        expect(customElements.get(TAG_RJ_GALAXY_STARS)).toBe(GalaxyStarsElement);
    });

    it("should ensure the underlying rj-model-instance custom element is also registered", () => {
        setupGalaxyStarsElement();
        expect(customElements.get(TAG_RJ_MODEL_INSTANCE)).toBe(ModelInstanceElement);
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

    describe("createRenderRoot()", () => {
        it("should return the element itself for Light DOM rendering without shadow root", () => {
            expect(element.createRenderRoot()).toBe(element);
            expect(element.shadowRoot).toBeNull();
        });
    });

    describe("defaults", () => {
        it("should initialize default parameters", () => {
            const freshElement = document.createElement(TAG_RJ_GALAXY_STARS) as GalaxyStarsElement;
            expect(freshElement.params).toBe(DEFAULT_GALAXY_PARAMETERS);
        });

        it("should render child ModelInstanceElement with shared geometry and material after updateComplete", async () => {
            await element.updateComplete;
            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            expect(instanceEl).toBeInstanceOf(ModelInstanceElement);
            await instanceEl?.updateComplete;

            const instance = instanceEl?.modelInstance;
            expect(instance).toBeInstanceOf(ModelInstance);
            expect(instance?.geometry).toBe(getSharedGalaxyGeometry(element.params));
            expect(instance?.geometry).toBeInstanceOf(GalaxyGeometry);
            expect(instance?.material).toBe(getSharedGalaxyMaterial(element.params));
            expect(instance?.material).toBeInstanceOf(GalaxyMaterial);
        });
    });

    describe("params reactivity", () => {
        it("should update geometry on morphology params update", async () => {
            await element.updateComplete;
            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            await instanceEl?.updateComplete;

            const initialGeometry = instanceEl?.modelInstance.geometry;
            const updatedStarCount = 500;

            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                starCount: updatedStarCount,
            };
            await element.updateComplete;
            await instanceEl?.updateComplete;

            expect(instanceEl?.modelInstance.geometry).toBe(initialGeometry);
            expect(instanceEl?.modelInstance.geometry).toBeInstanceOf(GalaxyGeometry);
            const galaxyGeo = instanceEl?.modelInstance.geometry as GalaxyGeometry;
            expect(galaxyGeo.vertexCount).toBe(updatedStarCount);
            expect(instanceEl?.modelInstance.geometry).toBe(getSharedGalaxyGeometry(element.params));
        });

        it("should update material on simulation params update", async () => {
            await element.updateComplete;
            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            await instanceEl?.updateComplete;

            const targetRotationSpeed = 0.75;
            const targetPointScale = 8.0;

            element.params = {
                ...DEFAULT_GALAXY_PARAMETERS,
                rotationSpeed: targetRotationSpeed,
                pointScale: targetPointScale,
            };
            await element.updateComplete;
            await instanceEl?.updateComplete;

            const material = instanceEl?.modelInstance.material as GalaxyMaterial;
            expect(material).toBeInstanceOf(GalaxyMaterial);
            expect(material.galaxyParams.rotationSpeed).toBe(targetRotationSpeed);
            expect(material.galaxyParams.pointScale).toBe(targetPointScale);
            expect(material.getUniforms()["u_rotationSpeed"]).toBe(targetRotationSpeed);
            expect(material.getUniforms()["u_pointScale"]).toBe(targetPointScale);
            expect(instanceEl?.modelInstance.material).toBe(material);
            expect(instanceEl?.modelInstance.material).toBe(getSharedGalaxyMaterial(element.params));
        });

        it("should preserve geometry reference across non-morphology updates", async () => {
            await element.updateComplete;
            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            await instanceEl?.updateComplete;

            const geometryBefore = instanceEl?.modelInstance.geometry;

            element.params = {
                ...element.params,
                rotationSpeed: -0.12,
            };
            await element.updateComplete;
            await instanceEl?.updateComplete;

            expect(instanceEl?.modelInstance.geometry).toBe(geometryBefore);
        });
    });

    describe("parentNodeContext integration", () => {
        it("should consume parent node from enclosing SceneElement and add modelInstance to scene", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            const addChildSpy = vi.spyOn(sceneElement.scene, "addChild");
            sceneElement.appendChild(element);
            await element.updateComplete;

            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            await instanceEl?.updateComplete;

            expect(instanceEl?.modelInstance).not.toBeNull();
            if (instanceEl?.modelInstance) {
                expect(addChildSpy).toHaveBeenCalledWith(instanceEl.modelInstance);
                expect(sceneElement.scene.children).toContain(instanceEl.modelInstance);
                expect(instanceEl.modelInstance.parent).toBe(sceneElement.scene);
            }

            sceneElement.remove();
        });

        it("should remove modelInstance from parent on disconnection", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);
            await sceneElement.updateComplete;

            sceneElement.appendChild(element);
            await element.updateComplete;

            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            await instanceEl?.updateComplete;

            const instance = instanceEl?.modelInstance;
            expect(instance).not.toBeNull();
            if (!instance) return;

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

            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            await instanceEl?.updateComplete;

            const instance = instanceEl?.modelInstance;
            expect(instance).not.toBeNull();
            if (!instance) return;

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

            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            await instanceEl?.updateComplete;

            const instance = instanceEl?.modelInstance;
            expect(instance).not.toBeNull();
            if (!instance) return;

            expect(parent1.node.children).toContain(instance);
            expect(instance.parent).toBe(parent1.node);

            parent2.appendChild(element);
            await element.updateComplete;
            await instanceEl?.updateComplete;

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

    describe("rendered child rj-model-instance transform", () => {
        it("should update underlying modelInstance transform when position attribute is changed on rendered rj-model-instance", async () => {
            await element.updateComplete;
            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            expect(instanceEl).toBeInstanceOf(ModelInstanceElement);
            if (!instanceEl) return;

            await instanceEl.updateComplete;
            expect(instanceEl.modelInstance.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });

            instanceEl.setAttribute("position", "10 20 30");
            await instanceEl.updateComplete;

            expect(instanceEl.position).toEqual({ x: 10, y: 20, z: 30 });
            expect(instanceEl.modelInstance.transform.getPosition()).toEqual({ x: 10, y: 20, z: 30 });
        });

        it("should update underlying modelInstance transform when position property is assigned on rendered rj-model-instance", async () => {
            await element.updateComplete;
            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            expect(instanceEl).toBeInstanceOf(ModelInstanceElement);
            if (!instanceEl) return;

            await instanceEl.updateComplete;
            const targetPosition: Vector3Like = { x: 10, y: 20, z: 30 };
            instanceEl.position = targetPosition;
            await instanceEl.updateComplete;

            expect(instanceEl.modelInstance.transform.getPosition()).toEqual({ x: 10, y: 20, z: 30 });
            expect(instanceEl.getAttribute("position")).toBe("10 20 30");
        });

        it("should update underlying modelInstance transform when rotation attribute is changed on rendered rj-model-instance", async () => {
            await element.updateComplete;
            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            expect(instanceEl).toBeInstanceOf(ModelInstanceElement);
            if (!instanceEl) return;

            await instanceEl.updateComplete;
            instanceEl.setAttribute("rotation", "0 1.57 0");
            await instanceEl.updateComplete;

            expect(instanceEl.rotation).toEqual({ x: 0, y: 1.57, z: 0 });
            const angles = instanceEl.modelInstance.transform.getEulerAngles();
            expect(angles.pitch).toBeCloseTo(0, 4);
            expect(angles.yaw).toBeCloseTo(1.57, 4);
            expect(angles.roll).toBeCloseTo(0, 4);
        });

        it("should update underlying modelInstance transform when rotation property is assigned on rendered rj-model-instance", async () => {
            await element.updateComplete;
            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            expect(instanceEl).toBeInstanceOf(ModelInstanceElement);
            if (!instanceEl) return;

            await instanceEl.updateComplete;
            const targetRotation: Vector3Like = { x: 0, y: 1.57, z: 0 };
            instanceEl.rotation = targetRotation;
            await instanceEl.updateComplete;

            const angles = instanceEl.modelInstance.transform.getEulerAngles();
            expect(angles.pitch).toBeCloseTo(0, 4);
            expect(angles.yaw).toBeCloseTo(1.57, 4);
            expect(angles.roll).toBeCloseTo(0, 4);
            expect(instanceEl.getAttribute("rotation")).toBe("0 1.57 0");
        });

        it("should update underlying modelInstance transform when scale attribute is changed on rendered rj-model-instance", async () => {
            await element.updateComplete;
            const instanceEl = element.querySelector<ModelInstanceElement>(TAG_RJ_MODEL_INSTANCE);
            expect(instanceEl).toBeInstanceOf(ModelInstanceElement);
            if (!instanceEl) return;

            await instanceEl.updateComplete;
            instanceEl.setAttribute("scale", "2 3 4");
            await instanceEl.updateComplete;

            expect(instanceEl.scale).toEqual({ x: 2, y: 3, z: 4 });
            expect(instanceEl.modelInstance.transform.getScale()).toEqual({ x: 2, y: 3, z: 4 });
        });
    });
});
