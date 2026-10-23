import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { LitElement } from "lit";
import { ContextConsumer } from "@lit/context";
import {
    Node3DElement,
    setupNode3DElement,
} from "./node_3d_element";
import {
    TAG_RJ_NODE_3D,
    DEFAULT_NODE_3D_NAME,
    DEFAULT_NODE_3D_HIDDEN,
    DEFAULT_NODE_3D_POSITION,
    DEFAULT_NODE_3D_ROTATION,
    DEFAULT_NODE_3D_SCALE,
} from "./node_3d_element_constants";
import { SceneNode } from "../core/scene_node";
import { setupSceneElement } from "./scene_element";
import { TAG_RJ_SCENE } from "./scene_element_constants";
import { parentNodeContext } from "./scene_element_types";
import type { ISceneNode } from "../core/scene_node_types";
import type { Vector3Like } from "../../maths/vector_types";

class TestNodeChildConsumerElement extends LitElement {
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

describe("setupNode3DElement()", () => {
    it("should be idempotent and register the custom element tag", () => {
        setupNode3DElement();
        expect(customElements.get(TAG_RJ_NODE_3D)).toBe(Node3DElement);

        // Multiple invocations must be safe and idempotent
        expect(() => setupNode3DElement()).not.toThrow();
    });
});

describe("Node3DElement", () => {
    let element: Node3DElement;

    beforeAll(() => {
        setupNode3DElement();
        setupSceneElement();
        if (!customElements.get("test-node-child-consumer")) {
            customElements.define("test-node-child-consumer", TestNodeChildConsumerElement);
        }
    });

    beforeEach(() => {
        element = document.createElement(TAG_RJ_NODE_3D);
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

    describe(".node", () => {
        it("should return a SceneNode instance with matching defaults", async () => {
            await element.updateComplete;
            const node = element.node;

            expect(node).toBeInstanceOf(SceneNode);
            expect(node.name).toBe(DEFAULT_NODE_3D_NAME);
            expect(node.visible).toBe(true);
            expect(node.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            expect(node.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
        });
    });

    describe("properties", () => {
        describe("name", () => {
            it("should default to DEFAULT_NODE_3D_NAME", async () => {
                await element.updateComplete;
                expect(element.name).toBe(DEFAULT_NODE_3D_NAME);
                expect(element.node.name).toBe(DEFAULT_NODE_3D_NAME);
            });

            it("should reconcile to node.name and reflect to attribute on property change", async () => {
                const targetName = "PlayerCharacter";
                element.name = targetName;
                await element.updateComplete;

                expect(element.name).toBe(targetName);
                expect(element.node.name).toBe(targetName);
                expect(element.getAttribute("name")).toBe(targetName);
            });

            it("should update property and node.name on attribute change", async () => {
                const attributeName = "EnemySpawnPoint";
                element.setAttribute("name", attributeName);
                await element.updateComplete;

                expect(element.name).toBe(attributeName);
                expect(element.node.name).toBe(attributeName);
            });
        });

        describe("position", () => {
            it("should default to DEFAULT_NODE_3D_POSITION and sync with transform", async () => {
                await element.updateComplete;
                expect(element.position).toEqual(DEFAULT_NODE_3D_POSITION);
                expect(element.node.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            });

            it("should reconcile to node.transform.position and reflect to attribute on property change", async () => {
                const targetPos: Vector3Like = { x: 10, y: 20, z: 30 };
                element.position = targetPos;
                await element.updateComplete;

                expect(element.position).toEqual(targetPos);
                expect(element.node.transform.getPosition()).toEqual({ x: 10, y: 20, z: 30 });
                expect(element.getAttribute("position")).toBe("10 20 30");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("position", "1.5 2.5 3.5");
                await element.updateComplete;

                expect(element.position).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
                expect(element.node.transform.getPosition()).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("position", "-5, 12, 100");
                await element.updateComplete;

                expect(element.position).toEqual({ x: -5, y: 12, z: 100 });
                expect(element.node.transform.getPosition()).toEqual({ x: -5, y: 12, z: 100 });
            });
        });

        describe("rotation", () => {
            it("should default to DEFAULT_NODE_3D_ROTATION and sync with transform", async () => {
                await element.updateComplete;
                expect(element.rotation).toEqual(DEFAULT_NODE_3D_ROTATION);
                const angles = element.node.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0);
                expect(angles.yaw).toBeCloseTo(0);
                expect(angles.roll).toBeCloseTo(0);
            });

            it("should reconcile to node.transform.rotation and reflect to attribute on property change", async () => {
                const targetRot: Vector3Like = { x: 0.25, y: 0.5, z: 0.75 };
                element.rotation = targetRot;
                await element.updateComplete;

                expect(element.rotation).toEqual(targetRot);
                const angles = element.node.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.25, 4);
                expect(angles.yaw).toBeCloseTo(0.5, 4);
                expect(angles.roll).toBeCloseTo(0.75, 4);
                expect(element.getAttribute("rotation")).toBe("0.25 0.5 0.75");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("rotation", "0.1 0.2 0.3");
                await element.updateComplete;

                expect(element.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
                const angles = element.node.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.1, 4);
                expect(angles.yaw).toBeCloseTo(0.2, 4);
                expect(angles.roll).toBeCloseTo(0.3, 4);
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("rotation", "0.4, 0.5, 0.6");
                await element.updateComplete;

                expect(element.rotation).toEqual({ x: 0.4, y: 0.5, z: 0.6 });
                const angles = element.node.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.4, 4);
                expect(angles.yaw).toBeCloseTo(0.5, 4);
                expect(angles.roll).toBeCloseTo(0.6, 4);
            });
        });

        describe("scale", () => {
            it("should default to DEFAULT_NODE_3D_SCALE and sync with transform", async () => {
                await element.updateComplete;
                expect(element.scale).toEqual(DEFAULT_NODE_3D_SCALE);
                expect(element.node.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
            });

            it("should reconcile to node.transform.scale and reflect to attribute on property change", async () => {
                const targetScale: Vector3Like = { x: 2, y: 3, z: 4 };
                element.scale = targetScale;
                await element.updateComplete;

                expect(element.scale).toEqual(targetScale);
                expect(element.node.transform.getScale()).toEqual({ x: 2, y: 3, z: 4 });
                expect(element.getAttribute("scale")).toBe("2 3 4");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("scale", "0.5 0.5 0.5");
                await element.updateComplete;

                expect(element.scale).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
                expect(element.node.transform.getScale()).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("scale", "3, 2, 1");
                await element.updateComplete;

                expect(element.scale).toEqual({ x: 3, y: 2, z: 1 });
                expect(element.node.transform.getScale()).toEqual({ x: 3, y: 2, z: 1 });
            });
        });

        describe("hidden", () => {
            it("should default to DEFAULT_NODE_3D_HIDDEN (false) and sync with node (visible = true)", async () => {
                await element.updateComplete;
                expect(element.hidden).toBe(DEFAULT_NODE_3D_HIDDEN);
                expect(element.node.visible).toBe(true);
                expect(element.hasAttribute("hidden")).toBe(false);
            });

            it("should reconcile to node.visible and reflect to attribute on property change", async () => {
                element.hidden = true;
                await element.updateComplete;

                expect(element.hidden).toBe(true);
                expect(element.node.visible).toBe(false);
                expect(element.hasAttribute("hidden")).toBe(true);

                element.hidden = false;
                await element.updateComplete;

                expect(element.hidden).toBe(false);
                expect(element.node.visible).toBe(true);
                expect(element.hasAttribute("hidden")).toBe(false);
            });

            it("should update when toggled via attribute", async () => {
                element.setAttribute("hidden", "");
                await element.updateComplete;
                expect(element.hidden).toBe(true);
                expect(element.node.visible).toBe(false);

                element.removeAttribute("hidden");
                await element.updateComplete;
                expect(element.hidden).toBe(false);
                expect(element.node.visible).toBe(true);
            });
        });
    });

    describe("parentNodeContext integration", () => {
        it("should consume parent node from enclosing SceneElement and add node to parent", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            const addChildSpy = vi.spyOn(sceneElement.scene, "addChild");
            sceneElement.appendChild(element);

            expect(addChildSpy).toHaveBeenCalledWith(element.node);
            expect(sceneElement.scene.children).toContain(element.node);
            expect(element.node.parent).toBe(sceneElement.scene);

            sceneElement.remove();
        });

        it("should remove node from parent on disconnectedCallback", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            sceneElement.appendChild(element);
            expect(sceneElement.scene.children).toContain(element.node);

            const removeChildSpy = vi.spyOn(sceneElement.scene, "removeChild");
            element.remove();

            expect(removeChildSpy).toHaveBeenCalledWith(element.node);
            expect(sceneElement.scene.children).not.toContain(element.node);
            expect(element.node.parent).toBeNull();

            sceneElement.remove();
        });

        it("should re-provide parentNodeContext so child consumer element receives node as its parent node", () => {
            const childConsumer = document.createElement(
                "test-node-child-consumer"
            ) as TestNodeChildConsumerElement;

            element.appendChild(childConsumer);

            expect(childConsumer.parentValue).toBe(element.node);

            childConsumer.remove();
        });

        it("should support hierarchical scene graph nesting when nested inside another Node3DElement", () => {
            const parentElement = document.createElement(TAG_RJ_NODE_3D);
            document.body.appendChild(parentElement);

            parentElement.appendChild(element);

            expect(parentElement.node.children).toContain(element.node);
            expect(element.node.parent).toBe(parentElement.node);

            element.remove();
            expect(parentElement.node.children).not.toContain(element.node);
            expect(element.node.parent).toBeNull();

            parentElement.remove();
        });

        it("should update parent-child relations when reparented to a different parent node", () => {
            const parent1 = document.createElement(TAG_RJ_NODE_3D);
            const parent2 = document.createElement(TAG_RJ_NODE_3D);
            document.body.appendChild(parent1);
            document.body.appendChild(parent2);

            parent1.appendChild(element);
            expect(parent1.node.children).toContain(element.node);
            expect(element.node.parent).toBe(parent1.node);

            parent2.appendChild(element);
            expect(parent1.node.children).not.toContain(element.node);
            expect(parent2.node.children).toContain(element.node);
            expect(element.node.parent).toBe(parent2.node);

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
            expect(sceneElement.scene.children).toContain(element.node);

            sceneElement.remove();
        });
    });

    describe("lifecycle", () => {
        it("should refresh context provider value upon reconnection to DOM", () => {
            element.remove();

            const childConsumer = document.createElement(
                "test-node-child-consumer"
            ) as TestNodeChildConsumerElement;
            element.appendChild(childConsumer);

            document.body.appendChild(element);

            expect(childConsumer.parentValue).toBe(element.node);

            childConsumer.remove();
        });

        it("should handle disconnection cleanly without throwing when not attached to scene or parent", () => {
            expect(() => {
                element.remove();
            }).not.toThrow();
        });
    });
});
