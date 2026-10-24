import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { LitElement } from "lit";
import { ContextConsumer } from "@lit/context";
import {
    ModelInstanceElement,
    setupModelInstanceElement,
} from "./model_instance_element";
import {
    TAG_RJ_MODEL_INSTANCE,
    DEFAULT_MODEL_INSTANCE_NAME,
    DEFAULT_MODEL_INSTANCE_HIDDEN,
    DEFAULT_MODEL_INSTANCE_RENDER_ORDER,
    DEFAULT_MODEL_INSTANCE_POSITION,
    DEFAULT_MODEL_INSTANCE_ROTATION,
    DEFAULT_MODEL_INSTANCE_SCALE,
} from "./model_instance_element_constants";
import { ModelInstance } from "../models/model_instance";
import { setupSceneElement } from "./scene_element";
import { TAG_RJ_SCENE } from "./scene_element_constants";
import { parentNodeContext } from "./scene_element_types";
import type { ISceneNode } from "../core/scene_node_types";
import type { Vector3Like } from "../../maths/vector_types";
import { setupNode3DElement } from "./node_3d_element";
import { TAG_RJ_NODE_3D } from "./node_3d_element_constants";
import { QuadGeometry } from "../models/primitives/quad_geometry";
import { UnlitMaterial } from "../materials/unlit_material";

class TestModelChildConsumerElement extends LitElement {
    public parentValue: ISceneNode | undefined;
    public notifyCount = 0;

    public parentConsumer = new ContextConsumer(this, {
        context: parentNodeContext,
        subscribe: true,
        callback: (value) => {
            this.parentValue = value;
            this.notifyCount++;
        },
    });

    public override createRenderRoot(): HTMLElement {
        return this;
    }
}

describe("setupModelInstanceElement()", () => {
    it("should be idempotent and register the custom element tag", () => {
        setupModelInstanceElement();
        expect(customElements.get(TAG_RJ_MODEL_INSTANCE)).toBe(ModelInstanceElement);

        // Multiple invocations must be safe and idempotent
        expect(() => setupModelInstanceElement()).not.toThrow();
    });
});

describe("ModelInstanceElement", () => {
    let element: ModelInstanceElement;

    beforeAll(() => {
        setupModelInstanceElement();
        setupSceneElement();
        setupNode3DElement();
        if (!customElements.get("test-model-child-consumer")) {
            customElements.define("test-model-child-consumer", TestModelChildConsumerElement);
        }
    });

    beforeEach(() => {
        element = document.createElement(TAG_RJ_MODEL_INSTANCE);
        document.body.appendChild(element);
    });

    afterEach(() => {
        element.remove();
        document.body.innerHTML = "";
    });

    describe("createRenderRoot()", () => {
        it("should return the element itself for Light DOM rendering without shadow root", () => {
            expect(element.createRenderRoot()).toBe(element);
            expect(element.shadowRoot).toBeNull();
        });
    });

    describe(".modelInstance and .node", () => {
        it("should return a ModelInstance instance with matching defaults", async () => {
            await element.updateComplete;
            const instance = element.modelInstance;

            expect(instance).toBeInstanceOf(ModelInstance);
            expect(element.node).toBe(instance);
            expect(instance.isRenderable).toBe(true);
            expect(instance.name).toBe(DEFAULT_MODEL_INSTANCE_NAME);
            expect(instance.visible).toBe(true);
            expect(instance.renderOrder).toBe(DEFAULT_MODEL_INSTANCE_RENDER_ORDER);
            expect(instance.geometry).toBeUndefined();
            expect(instance.material).toBeUndefined();
            expect(instance.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            expect(instance.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
        });
    });

    describe("properties", () => {
        describe("name", () => {
            it("should default to DEFAULT_MODEL_INSTANCE_NAME", async () => {
                await element.updateComplete;
                expect(element.name).toBe(DEFAULT_MODEL_INSTANCE_NAME);
                expect(element.modelInstance.name).toBe(DEFAULT_MODEL_INSTANCE_NAME);
            });

            it("should reconcile to modelInstance.name and reflect to attribute on property change", async () => {
                const targetName = "MainCharacterMesh";
                element.name = targetName;
                await element.updateComplete;

                expect(element.name).toBe(targetName);
                expect(element.modelInstance.name).toBe(targetName);
                expect(element.getAttribute("name")).toBe(targetName);
            });

            it("should update property and modelInstance.name on attribute change", async () => {
                const attributeName = "BackgroundMountain";
                element.setAttribute("name", attributeName);
                await element.updateComplete;

                expect(element.name).toBe(attributeName);
                expect(element.modelInstance.name).toBe(attributeName);
            });
        });

        describe("position", () => {
            it("should default to DEFAULT_MODEL_INSTANCE_POSITION and sync with transform", async () => {
                await element.updateComplete;
                expect(element.position).toEqual(DEFAULT_MODEL_INSTANCE_POSITION);
                expect(element.modelInstance.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            });

            it("should reconcile to modelInstance.transform.position and reflect to attribute on property change", async () => {
                const targetPos: Vector3Like = { x: 10, y: 20, z: 30 };
                element.position = targetPos;
                await element.updateComplete;

                expect(element.position).toEqual(targetPos);
                expect(element.modelInstance.transform.getPosition()).toEqual({ x: 10, y: 20, z: 30 });
                expect(element.getAttribute("position")).toBe("10 20 30");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("position", "1.5 2.5 3.5");
                await element.updateComplete;

                expect(element.position).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
                expect(element.modelInstance.transform.getPosition()).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("position", "-5, 12, 100");
                await element.updateComplete;

                expect(element.position).toEqual({ x: -5, y: 12, z: 100 });
                expect(element.modelInstance.transform.getPosition()).toEqual({ x: -5, y: 12, z: 100 });
            });
        });

        describe("rotation", () => {
            it("should default to DEFAULT_MODEL_INSTANCE_ROTATION and sync with transform", async () => {
                await element.updateComplete;
                expect(element.rotation).toEqual(DEFAULT_MODEL_INSTANCE_ROTATION);
                const angles = element.modelInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0);
                expect(angles.yaw).toBeCloseTo(0);
                expect(angles.roll).toBeCloseTo(0);
            });

            it("should reconcile to modelInstance.transform.rotation and reflect to attribute on property change", async () => {
                const targetRot: Vector3Like = { x: 0.25, y: 0.5, z: 0.75 };
                element.rotation = targetRot;
                await element.updateComplete;

                expect(element.rotation).toEqual(targetRot);
                const angles = element.modelInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.25, 4);
                expect(angles.yaw).toBeCloseTo(0.5, 4);
                expect(angles.roll).toBeCloseTo(0.75, 4);
                expect(element.getAttribute("rotation")).toBe("0.25 0.5 0.75");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("rotation", "0.1 0.2 0.3");
                await element.updateComplete;

                expect(element.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
                const angles = element.modelInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.1, 4);
                expect(angles.yaw).toBeCloseTo(0.2, 4);
                expect(angles.roll).toBeCloseTo(0.3, 4);
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("rotation", "0.4, 0.5, 0.6");
                await element.updateComplete;

                expect(element.rotation).toEqual({ x: 0.4, y: 0.5, z: 0.6 });
                const angles = element.modelInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.4, 4);
                expect(angles.yaw).toBeCloseTo(0.5, 4);
                expect(angles.roll).toBeCloseTo(0.6, 4);
            });
        });

        describe("scale", () => {
            it("should default to DEFAULT_MODEL_INSTANCE_SCALE and sync with transform", async () => {
                await element.updateComplete;
                expect(element.scale).toEqual(DEFAULT_MODEL_INSTANCE_SCALE);
                expect(element.modelInstance.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
            });

            it("should reconcile to modelInstance.transform.scale and reflect to attribute on property change", async () => {
                const targetScale: Vector3Like = { x: 2, y: 3, z: 4 };
                element.scale = targetScale;
                await element.updateComplete;

                expect(element.scale).toEqual(targetScale);
                expect(element.modelInstance.transform.getScale()).toEqual({ x: 2, y: 3, z: 4 });
                expect(element.getAttribute("scale")).toBe("2 3 4");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("scale", "0.5 0.5 0.5");
                await element.updateComplete;

                expect(element.scale).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
                expect(element.modelInstance.transform.getScale()).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("scale", "3, 2, 1");
                await element.updateComplete;

                expect(element.scale).toEqual({ x: 3, y: 2, z: 1 });
                expect(element.modelInstance.transform.getScale()).toEqual({ x: 3, y: 2, z: 1 });
            });
        });

        describe("hidden", () => {
            it("should default to DEFAULT_MODEL_INSTANCE_HIDDEN (false) and sync with modelInstance (visible = true)", async () => {
                await element.updateComplete;
                expect(element.hidden).toBe(DEFAULT_MODEL_INSTANCE_HIDDEN);
                expect(element.modelInstance.visible).toBe(true);
                expect(element.hasAttribute("hidden")).toBe(false);
            });

            it("should reconcile to modelInstance.visible and reflect to attribute on property change", async () => {
                element.hidden = true;
                await element.updateComplete;

                expect(element.hidden).toBe(true);
                expect(element.modelInstance.visible).toBe(false);
                expect(element.hasAttribute("hidden")).toBe(true);

                element.hidden = false;
                await element.updateComplete;

                expect(element.hidden).toBe(false);
                expect(element.modelInstance.visible).toBe(true);
                expect(element.hasAttribute("hidden")).toBe(false);
            });

            it("should update when toggled via attribute", async () => {
                element.setAttribute("hidden", "");
                await element.updateComplete;
                expect(element.hidden).toBe(true);
                expect(element.modelInstance.visible).toBe(false);

                element.removeAttribute("hidden");
                await element.updateComplete;
                expect(element.hidden).toBe(false);
                expect(element.modelInstance.visible).toBe(true);
            });
        });

        describe("renderOrder", () => {
            it("should default to DEFAULT_MODEL_INSTANCE_RENDER_ORDER and sync with modelInstance", async () => {
                await element.updateComplete;
                expect(element.renderOrder).toBe(DEFAULT_MODEL_INSTANCE_RENDER_ORDER);
                expect(element.modelInstance.renderOrder).toBe(DEFAULT_MODEL_INSTANCE_RENDER_ORDER);
            });

            it("should reconcile to modelInstance.renderOrder without reflecting to attribute on property change", async () => {
                element.renderOrder = 5;
                await element.updateComplete;

                expect(element.renderOrder).toBe(5);
                expect(element.modelInstance.renderOrder).toBe(5);
                expect(element.hasAttribute("render-order")).toBe(false);
            });

            it("should update property and modelInstance.renderOrder on attribute change", async () => {
                element.setAttribute("render-order", "12");
                await element.updateComplete;

                expect(element.renderOrder).toBe(12);
                expect(element.modelInstance.renderOrder).toBe(12);
            });
        });

        describe("geometry", () => {
            it("should default to undefined", async () => {
                await element.updateComplete;
                expect(element.geometry).toBeUndefined();
                expect(element.modelInstance.geometry).toBeUndefined();
            });

            it("should reconcile to modelInstance.geometry when property is assigned a QuadGeometry", async () => {
                const quad = new QuadGeometry({ width: 2, height: 3 });
                element.geometry = quad;
                await element.updateComplete;

                expect(element.geometry).toBe(quad);
                expect(element.modelInstance.geometry).toBe(quad);

                // Reconcile clearing geometry back to undefined
                element.geometry = undefined;
                await element.updateComplete;

                expect(element.geometry).toBeUndefined();
                expect(element.modelInstance.geometry).toBeUndefined();
            });
        });

        describe("material", () => {
            it("should default to undefined", async () => {
                await element.updateComplete;
                expect(element.material).toBeUndefined();
                expect(element.modelInstance.material).toBeUndefined();
            });

            it("should reconcile to modelInstance.material when property is assigned an UnlitMaterial", async () => {
                const material = new UnlitMaterial();
                element.material = material;
                await element.updateComplete;

                expect(element.material).toBe(material);
                expect(element.modelInstance.material).toBe(material);

                // Reconcile clearing material back to undefined
                element.material = undefined;
                await element.updateComplete;

                expect(element.material).toBeUndefined();
                expect(element.modelInstance.material).toBeUndefined();
            });
        });
    });

    describe("parentNodeContext integration", () => {
        it("should consume parent node from enclosing SceneElement and add modelInstance to parent", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            const addChildSpy = vi.spyOn(sceneElement.scene, "addChild");
            sceneElement.appendChild(element);

            expect(addChildSpy).toHaveBeenCalledWith(element.modelInstance);
            expect(sceneElement.scene.children).toContain(element.modelInstance);
            expect(element.modelInstance.parent).toBe(sceneElement.scene);

            sceneElement.remove();
        });

        it("should remove modelInstance from parent on disconnectedCallback", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
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

        it("should re-provide parentNodeContext so child consumer element receives modelInstance as its parent node", () => {
            const childConsumer = document.createElement(
                "test-model-child-consumer"
            ) as TestModelChildConsumerElement;

            element.appendChild(childConsumer);

            expect(childConsumer.parentValue).toBe(element.modelInstance);

            childConsumer.remove();
        });

        it("should support hierarchical scene graph nesting when nested inside a Node3DElement", () => {
            const parentElement = document.createElement(TAG_RJ_NODE_3D);
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
            const parent1 = document.createElement(TAG_RJ_NODE_3D);
            const parent2 = document.createElement(TAG_RJ_NODE_3D);
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

        it("should ignore redundant parent updates when same parent is re-emitted", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            const addChildSpy = vi.spyOn(sceneElement.scene, "addChild");
            sceneElement.appendChild(element);

            expect(addChildSpy).toHaveBeenCalledTimes(1);

            // Triggering update on sceneElement should not re-add
            sceneElement.requestUpdate();

            expect(addChildSpy).toHaveBeenCalledTimes(1);
            expect(sceneElement.scene.children).toContain(element.modelInstance);

            sceneElement.remove();
        });
    });

    describe("lifecycle", () => {
        it("should refresh context provider value upon reconnection to DOM", () => {
            element.remove();

            const childConsumer = document.createElement(
                "test-model-child-consumer"
            ) as TestModelChildConsumerElement;
            element.appendChild(childConsumer);

            document.body.appendChild(element);

            expect(childConsumer.parentValue).toBe(element.modelInstance);

            childConsumer.remove();
        });

        it("should handle disconnection cleanly without throwing when not attached to scene or parent", () => {
            expect(() => {
                element.remove();
            }).not.toThrow();
        });
    });
});
