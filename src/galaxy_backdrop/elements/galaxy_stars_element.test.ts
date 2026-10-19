import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import {
    GalaxyStarsElement,
    setupGalaxyStarsElement,
} from "./galaxy_stars_element";
import {
    TAG_RJ_GALAXY_STARS,
    DEFAULT_GALAXY_STARS_NAME,
} from "./galaxy_stars_element_constants";
import {
    getSharedGalaxyGeometry,
    getSharedGalaxyMaterial,
    disposeSharedGalaxyResources,
} from "../resources/galaxy_resources";
import { DEFAULT_GALAXY_PARAMETERS } from "../parameters/index";
import { GalaxyGeometry } from "../../scene/models/galaxy_geometry";
import { GalaxyMaterial } from "../../scene/materials/galaxy_material";
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
        element = document.createElement(TAG_RJ_GALAXY_STARS);
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
        it("should initialize internal model instance name matching DEFAULT_GALAXY_STARS_NAME", async () => {
            await element.updateComplete;

            expect(element.node.name).toBe(DEFAULT_GALAXY_STARS_NAME);
            expect(element.modelInstance.name).toBe(DEFAULT_GALAXY_STARS_NAME);
            expect(element.node).toBe(element.modelInstance);
        });

        it("should initialize with geometry matching getSharedGalaxyGeometry(params) singleton", async () => {
            await element.updateComplete;

            const expectedGeometry = getSharedGalaxyGeometry(element.params);
            expect(element.modelInstance.geometry).toBe(expectedGeometry);
            expect(element.modelInstance.geometry).toBeInstanceOf(GalaxyGeometry);
        });

        it("should initialize with material matching getSharedGalaxyMaterial(params) singleton", async () => {
            await element.updateComplete;

            const expectedMaterial = getSharedGalaxyMaterial(element.params);
            expect(element.modelInstance.material).toBe(expectedMaterial);
            expect(element.modelInstance.material).toBeInstanceOf(GalaxyMaterial);
        });

        it("should initialize params with DEFAULT_GALAXY_PARAMETERS", async () => {
            await element.updateComplete;

            expect(element.params).toBe(DEFAULT_GALAXY_PARAMETERS);
        });
    });

    describe("params reactivity", () => {
        it("should synchronize geometry when morphology parameters are updated", async () => {
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

        it("should synchronize material when simulation parameters are updated", async () => {
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
            expect(material.getUniforms()["u_rotationSpeed"]).toBe(targetRotationSpeed);
            expect(material.getUniforms()["u_pointScale"]).toBe(targetPointScale);
            expect(element.modelInstance.material).toBe(material);
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

    describe("parentNodeContext integration", () => {
        it("should consume parent node from enclosing SceneElement and add modelInstance to parent via addChild", () => {
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

        it("should update parent-child relations when reparented to a different parent node", () => {
            const parent1 = document.createElement(TAG_RJ_NODE_3D) as Node3DElement;
            const parent2 = document.createElement(TAG_RJ_NODE_3D) as Node3DElement;
            document.body.appendChild(parent1);
            document.body.appendChild(parent2);

            parent1.appendChild(element);
            expect(parent1.node.children).toContain(element.modelInstance);
            expect(element.modelInstance.parent).toBe(parent1.node);

            parent2.appendChild(element);
            expect(parent1.node.children).not.toContain(element.modelInstance);
            expect(parent2.node.children).toContain(element.modelInstance);
            expect(element.modelInstance.parent).toBe(parent2.node);

            parent1.remove();
            parent2.remove();
        });

        it("should handle disconnection cleanly without throwing when not attached to a parent", () => {
            expect(() => {
                element.remove();
            }).not.toThrow();
        });
    });
});
