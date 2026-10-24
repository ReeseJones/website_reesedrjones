import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { LitElement } from "lit";
import { ContextConsumer } from "@lit/context";
import {
    SpriteInstanceElement,
    setupSpriteInstanceElement,
} from "./sprite_instance_element";
import {
    TAG_RJ_SPRITE_INSTANCE,
    DEFAULT_SPRITE_INSTANCE_NAME,
    DEFAULT_SPRITE_INSTANCE_HIDDEN,
    DEFAULT_SPRITE_INSTANCE_RENDER_ORDER,
    DEFAULT_SPRITE_INSTANCE_POSITION,
    DEFAULT_SPRITE_INSTANCE_ROTATION,
    DEFAULT_SPRITE_INSTANCE_SCALE,
    DEFAULT_SPRITE_INSTANCE_ANCHOR,
    DEFAULT_SPRITE_INSTANCE_SIZE,
    DEFAULT_SPRITE_INSTANCE_SIZE_MODE,
    DEFAULT_SPRITE_INSTANCE_BILLBOARD_MODE,
} from "./sprite_instance_element_constants";
import { SpriteInstance } from "../sprites/sprite_instance";
import { SpritePinMaterial } from "../sprites/sprite_pin_material";
import { SpriteTextureMaterial } from "../sprites/sprite_texture_material";
import {
    BillboardMode,
    SpriteSizeMode,
    type SpriteSizeClamping,
} from "../sprites/sprite_instance_types";
import { setupSceneElement } from "./scene_element";
import { TAG_RJ_SCENE } from "./scene_element_constants";
import { parentNodeContext } from "./scene_element_types";
import type { ISceneNode } from "../core/scene_node_types";
import type { Vector2Like, Vector3Like } from "../../maths/vector_types";
import { setupNode3DElement } from "./node_3d_element";
import { TAG_RJ_NODE_3D } from "./node_3d_element_constants";

class TestSpriteChildConsumerElement extends LitElement {
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

describe("setupSpriteInstanceElement()", () => {
    it("should be idempotent and register the custom element tag", () => {
        setupSpriteInstanceElement();
        expect(customElements.get(TAG_RJ_SPRITE_INSTANCE)).toBe(SpriteInstanceElement);

        // Multiple invocations must be safe and idempotent
        expect(() => setupSpriteInstanceElement()).not.toThrow();
    });
});

describe("SpriteInstanceElement", () => {
    let element: SpriteInstanceElement;

    beforeAll(() => {
        setupSpriteInstanceElement();
        setupSceneElement();
        setupNode3DElement();
        if (!customElements.get("test-sprite-child-consumer")) {
            customElements.define("test-sprite-child-consumer", TestSpriteChildConsumerElement);
        }
    });

    beforeEach(() => {
        element = document.createElement(TAG_RJ_SPRITE_INSTANCE);
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

    describe(".spriteInstance and .node", () => {
        it("should return a SpriteInstance instance with matching defaults", async () => {
            await element.updateComplete;
            const instance = element.spriteInstance;

            expect(instance).toBeInstanceOf(SpriteInstance);
            expect(element.node).toBe(instance);
            expect(instance.isRenderable).toBe(true);
            expect(instance.name).toBe(DEFAULT_SPRITE_INSTANCE_NAME);
            expect(instance.visible).toBe(true);
            expect(instance.renderOrder).toBe(DEFAULT_SPRITE_INSTANCE_RENDER_ORDER);
            expect(instance.getAnchor()).toEqual(DEFAULT_SPRITE_INSTANCE_ANCHOR);
            expect(instance.getSize()).toEqual(DEFAULT_SPRITE_INSTANCE_SIZE);
            expect(instance.sizeMode).toBe(DEFAULT_SPRITE_INSTANCE_SIZE_MODE);
            expect(instance.sizeClamping).toBeUndefined();
            expect(instance.billboardMode).toBe(DEFAULT_SPRITE_INSTANCE_BILLBOARD_MODE);
            expect(instance.material).toBeInstanceOf(SpritePinMaterial);
            expect(instance.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            expect(instance.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
        });
    });

    describe("properties", () => {
        describe("name", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_NAME", async () => {
                await element.updateComplete;
                expect(element.name).toBe(DEFAULT_SPRITE_INSTANCE_NAME);
                expect(element.spriteInstance.name).toBe(DEFAULT_SPRITE_INSTANCE_NAME);
            });

            it("should reconcile to spriteInstance.name and reflect to attribute on property change", async () => {
                const targetName = "TargetWaypointPin";
                element.name = targetName;
                await element.updateComplete;

                expect(element.name).toBe(targetName);
                expect(element.spriteInstance.name).toBe(targetName);
                expect(element.getAttribute("name")).toBe(targetName);
            });

            it("should update property and spriteInstance.name on attribute change", async () => {
                const attributeName = "DestinationPin";
                element.setAttribute("name", attributeName);
                await element.updateComplete;

                expect(element.name).toBe(attributeName);
                expect(element.spriteInstance.name).toBe(attributeName);
            });
        });

        describe("position", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_POSITION and sync with transform", async () => {
                await element.updateComplete;
                expect(element.position).toEqual(DEFAULT_SPRITE_INSTANCE_POSITION);
                expect(element.spriteInstance.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            });

            it("should reconcile to spriteInstance.transform.position and reflect to attribute on property change", async () => {
                const targetPos: Vector3Like = { x: 10, y: 20, z: 30 };
                element.position = targetPos;
                await element.updateComplete;

                expect(element.position).toEqual(targetPos);
                expect(element.spriteInstance.transform.getPosition()).toEqual({ x: 10, y: 20, z: 30 });
                expect(element.getAttribute("position")).toBe("10 20 30");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("position", "1.5 2.5 3.5");
                await element.updateComplete;

                expect(element.position).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
                expect(element.spriteInstance.transform.getPosition()).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("position", "-5, 12, 100");
                await element.updateComplete;

                expect(element.position).toEqual({ x: -5, y: 12, z: 100 });
                expect(element.spriteInstance.transform.getPosition()).toEqual({ x: -5, y: 12, z: 100 });
            });
        });

        describe("rotation", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_ROTATION and sync with transform", async () => {
                await element.updateComplete;
                expect(element.rotation).toEqual(DEFAULT_SPRITE_INSTANCE_ROTATION);
                const angles = element.spriteInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0);
                expect(angles.yaw).toBeCloseTo(0);
                expect(angles.roll).toBeCloseTo(0);
            });

            it("should reconcile to spriteInstance.transform.rotation and reflect to attribute on property change", async () => {
                const targetRot: Vector3Like = { x: 0.25, y: 0.5, z: 0.75 };
                element.rotation = targetRot;
                await element.updateComplete;

                expect(element.rotation).toEqual(targetRot);
                const angles = element.spriteInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.25, 4);
                expect(angles.yaw).toBeCloseTo(0.5, 4);
                expect(angles.roll).toBeCloseTo(0.75, 4);
                expect(element.getAttribute("rotation")).toBe("0.25 0.5 0.75");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("rotation", "0.1 0.2 0.3");
                await element.updateComplete;

                expect(element.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
                const angles = element.spriteInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.1, 4);
                expect(angles.yaw).toBeCloseTo(0.2, 4);
                expect(angles.roll).toBeCloseTo(0.3, 4);
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("rotation", "0.4, 0.5, 0.6");
                await element.updateComplete;

                expect(element.rotation).toEqual({ x: 0.4, y: 0.5, z: 0.6 });
                const angles = element.spriteInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.4, 4);
                expect(angles.yaw).toBeCloseTo(0.5, 4);
                expect(angles.roll).toBeCloseTo(0.6, 4);
            });
        });

        describe("scale", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_SCALE and sync with transform", async () => {
                await element.updateComplete;
                expect(element.scale).toEqual(DEFAULT_SPRITE_INSTANCE_SCALE);
                expect(element.spriteInstance.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
            });

            it("should reconcile to spriteInstance.transform.scale and reflect to attribute on property change", async () => {
                const targetScale: Vector3Like = { x: 2, y: 3, z: 4 };
                element.scale = targetScale;
                await element.updateComplete;

                expect(element.scale).toEqual(targetScale);
                expect(element.spriteInstance.transform.getScale()).toEqual({ x: 2, y: 3, z: 4 });
                expect(element.getAttribute("scale")).toBe("2 3 4");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("scale", "0.5 0.5 0.5");
                await element.updateComplete;

                expect(element.scale).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
                expect(element.spriteInstance.transform.getScale()).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("scale", "3, 2, 1");
                await element.updateComplete;

                expect(element.scale).toEqual({ x: 3, y: 2, z: 1 });
                expect(element.spriteInstance.transform.getScale()).toEqual({ x: 3, y: 2, z: 1 });
            });
        });

        describe("hidden", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_HIDDEN (false) and sync with spriteInstance (visible = true)", async () => {
                await element.updateComplete;
                expect(element.hidden).toBe(DEFAULT_SPRITE_INSTANCE_HIDDEN);
                expect(element.spriteInstance.visible).toBe(true);
                expect(element.hasAttribute("hidden")).toBe(false);
            });

            it("should reconcile to spriteInstance.visible and reflect to attribute on property change", async () => {
                element.hidden = true;
                await element.updateComplete;

                expect(element.hidden).toBe(true);
                expect(element.spriteInstance.visible).toBe(false);
                expect(element.hasAttribute("hidden")).toBe(true);

                element.hidden = false;
                await element.updateComplete;

                expect(element.hidden).toBe(false);
                expect(element.spriteInstance.visible).toBe(true);
                expect(element.hasAttribute("hidden")).toBe(false);
            });

            it("should update when toggled via attribute", async () => {
                element.setAttribute("hidden", "");
                await element.updateComplete;
                expect(element.hidden).toBe(true);
                expect(element.spriteInstance.visible).toBe(false);

                element.removeAttribute("hidden");
                await element.updateComplete;
                expect(element.hidden).toBe(false);
                expect(element.spriteInstance.visible).toBe(true);
            });
        });

        describe("renderOrder", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_RENDER_ORDER and sync with spriteInstance", async () => {
                await element.updateComplete;
                expect(element.renderOrder).toBe(DEFAULT_SPRITE_INSTANCE_RENDER_ORDER);
                expect(element.spriteInstance.renderOrder).toBe(DEFAULT_SPRITE_INSTANCE_RENDER_ORDER);
            });

            it("should reconcile to spriteInstance.renderOrder without reflecting to attribute on property change", async () => {
                element.renderOrder = 2500;
                await element.updateComplete;

                expect(element.renderOrder).toBe(2500);
                expect(element.spriteInstance.renderOrder).toBe(2500);
                expect(element.hasAttribute("render-order")).toBe(false);
            });

            it("should update property and spriteInstance.renderOrder on attribute change", async () => {
                element.setAttribute("render-order", "5000");
                await element.updateComplete;

                expect(element.renderOrder).toBe(5000);
                expect(element.spriteInstance.renderOrder).toBe(5000);
            });
        });

        describe("anchor", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_ANCHOR and sync with spriteInstance", async () => {
                await element.updateComplete;
                expect(element.anchor).toEqual(DEFAULT_SPRITE_INSTANCE_ANCHOR);
                expect(element.spriteInstance.getAnchor()).toEqual(DEFAULT_SPRITE_INSTANCE_ANCHOR);
            });

            it("should reconcile to spriteInstance.setAnchor without reflecting to attribute on property change", async () => {
                const targetAnchor: Vector2Like = { x: 0.5, y: 0.5 };
                element.anchor = targetAnchor;
                await element.updateComplete;

                expect(element.anchor).toEqual(targetAnchor);
                expect(element.spriteInstance.getAnchor()).toEqual(targetAnchor);
                expect(element.hasAttribute("anchor")).toBe(false);
            });

            it("should support tuple assignment without reflecting to attribute", async () => {
                element.anchor = [0.25, 0.75];
                await element.updateComplete;

                expect(element.spriteInstance.getAnchor()).toEqual({ x: 0.25, y: 0.75 });
                expect(element.hasAttribute("anchor")).toBe(false);
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("anchor", "0.5 1.0");
                await element.updateComplete;

                expect(element.anchor).toEqual({ x: 0.5, y: 1 });
                expect(element.spriteInstance.getAnchor()).toEqual({ x: 0.5, y: 1 });
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("anchor", "0.25, 0.75");
                await element.updateComplete;

                expect(element.anchor).toEqual({ x: 0.25, y: 0.75 });
                expect(element.spriteInstance.getAnchor()).toEqual({ x: 0.25, y: 0.75 });
            });
        });

        describe("size", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_SIZE and sync with spriteInstance", async () => {
                await element.updateComplete;
                expect(element.size).toEqual(DEFAULT_SPRITE_INSTANCE_SIZE);
                expect(element.spriteInstance.getSize()).toEqual(DEFAULT_SPRITE_INSTANCE_SIZE);
            });

            it("should reconcile to spriteInstance.setSize without reflecting to attribute on property change", async () => {
                const targetSize: Vector2Like = { x: 64, y: 48 };
                element.size = targetSize;
                await element.updateComplete;

                expect(element.size).toEqual(targetSize);
                expect(element.spriteInstance.getSize()).toEqual(targetSize);
                expect(element.hasAttribute("size")).toBe(false);
            });

            it("should support tuple assignment without reflecting to attribute", async () => {
                element.size = [40, 50];
                await element.updateComplete;

                expect(element.spriteInstance.getSize()).toEqual({ x: 40, y: 50 });
                expect(element.hasAttribute("size")).toBe(false);
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("size", "64 96");
                await element.updateComplete;

                expect(element.size).toEqual({ x: 64, y: 96 });
                expect(element.spriteInstance.getSize()).toEqual({ x: 64, y: 96 });
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("size", "128, 256");
                await element.updateComplete;

                expect(element.size).toEqual({ x: 128, y: 256 });
                expect(element.spriteInstance.getSize()).toEqual({ x: 128, y: 256 });
            });
        });

        describe("sizeMode", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_SIZE_MODE and sync with spriteInstance", async () => {
                await element.updateComplete;
                expect(element.sizeMode).toBe(DEFAULT_SPRITE_INSTANCE_SIZE_MODE);
                expect(element.spriteInstance.sizeMode).toBe(DEFAULT_SPRITE_INSTANCE_SIZE_MODE);
            });

            it("should reconcile to spriteInstance.sizeMode without reflecting to size-mode attribute on property change", async () => {
                element.sizeMode = SpriteSizeMode.WorldSpace;
                await element.updateComplete;

                expect(element.sizeMode).toBe(SpriteSizeMode.WorldSpace);
                expect(element.spriteInstance.sizeMode).toBe(SpriteSizeMode.WorldSpace);
                expect(element.hasAttribute("size-mode")).toBe(false);

                element.sizeMode = SpriteSizeMode.ClampedScreenSpace;
                await element.updateComplete;

                expect(element.sizeMode).toBe(SpriteSizeMode.ClampedScreenSpace);
                expect(element.spriteInstance.sizeMode).toBe(SpriteSizeMode.ClampedScreenSpace);
                expect(element.hasAttribute("size-mode")).toBe(false);
            });

            it("should update property and spriteInstance.sizeMode on attribute change", async () => {
                element.setAttribute("size-mode", "world-space");
                await element.updateComplete;

                expect(element.sizeMode).toBe(SpriteSizeMode.WorldSpace);
                expect(element.spriteInstance.sizeMode).toBe(SpriteSizeMode.WorldSpace);

                element.setAttribute("size-mode", "clamped-screen-space");
                await element.updateComplete;

                expect(element.sizeMode).toBe(SpriteSizeMode.ClampedScreenSpace);
                expect(element.spriteInstance.sizeMode).toBe(SpriteSizeMode.ClampedScreenSpace);
            });

            it("should fallback to default size mode on invalid attribute value", async () => {
                element.setAttribute("size-mode", "invalid-mode");
                await element.updateComplete;

                expect(element.sizeMode).toBe(SpriteSizeMode.ScreenSpace);
                expect(element.spriteInstance.sizeMode).toBe(SpriteSizeMode.ScreenSpace);
            });
        });

        describe("sizeClamping", () => {
            it("should default to undefined", async () => {
                await element.updateComplete;
                expect(element.sizeClamping).toBeUndefined();
                expect(element.spriteInstance.sizeClamping).toBeUndefined();
            });

            it("should reconcile to spriteInstance.sizeClamping on property change without reflecting to attribute", async () => {
                const targetClamping: SpriteSizeClamping = { minPixels: 16, maxPixels: 128 };
                element.sizeClamping = targetClamping;
                await element.updateComplete;

                expect(element.sizeClamping).toEqual(targetClamping);
                expect(element.spriteInstance.sizeClamping).toEqual(targetClamping);
                expect(element.hasAttribute("sizeClamping")).toBe(false);

                // Clear back to undefined
                element.sizeClamping = undefined;
                await element.updateComplete;

                expect(element.sizeClamping).toBeUndefined();
                expect(element.spriteInstance.sizeClamping).toBeUndefined();
            });
        });

        describe("billboardMode", () => {
            it("should default to DEFAULT_SPRITE_INSTANCE_BILLBOARD_MODE and sync with spriteInstance", async () => {
                await element.updateComplete;
                expect(element.billboardMode).toBe(DEFAULT_SPRITE_INSTANCE_BILLBOARD_MODE);
                expect(element.spriteInstance.billboardMode).toBe(DEFAULT_SPRITE_INSTANCE_BILLBOARD_MODE);
            });

            it("should reconcile to spriteInstance.billboardMode without reflecting to billboard-mode attribute on property change", async () => {
                element.billboardMode = BillboardMode.Cylindrical;
                await element.updateComplete;

                expect(element.billboardMode).toBe(BillboardMode.Cylindrical);
                expect(element.spriteInstance.billboardMode).toBe(BillboardMode.Cylindrical);
                expect(element.hasAttribute("billboard-mode")).toBe(false);
            });

            it("should update property and spriteInstance.billboardMode on attribute change", async () => {
                element.setAttribute("billboard-mode", "cylindrical");
                await element.updateComplete;

                expect(element.billboardMode).toBe(BillboardMode.Cylindrical);
                expect(element.spriteInstance.billboardMode).toBe(BillboardMode.Cylindrical);

                element.setAttribute("billboard-mode", "spherical");
                await element.updateComplete;

                expect(element.billboardMode).toBe(BillboardMode.Spherical);
                expect(element.spriteInstance.billboardMode).toBe(BillboardMode.Spherical);
            });

            it("should fallback unknown mode like axial-y to defaultValue", async () => {
                element.setAttribute("billboard-mode", "axial-y");
                await element.updateComplete;

                expect(element.billboardMode).toBe(BillboardMode.Spherical);
                expect(element.spriteInstance.billboardMode).toBe(BillboardMode.Spherical);
            });
        });

        describe("material", () => {
            it("should default to SpritePinMaterial instance and sync with spriteInstance", async () => {
                await element.updateComplete;
                expect(element.material).toBeInstanceOf(SpritePinMaterial);
                expect(element.spriteInstance.material).toBe(element.material);
            });

            it("should reconcile to spriteInstance.material when property is assigned a SpriteTextureMaterial", async () => {
                const textureMaterial = new SpriteTextureMaterial();
                element.material = textureMaterial;
                await element.updateComplete;

                expect(element.material).toBe(textureMaterial);
                expect(element.spriteInstance.material).toBe(textureMaterial);
                expect(element.hasAttribute("material")).toBe(false);

                // Reassign a new SpritePinMaterial
                const newPinMaterial = new SpritePinMaterial();
                element.material = newPinMaterial;
                await element.updateComplete;

                expect(element.material).toBe(newPinMaterial);
                expect(element.spriteInstance.material).toBe(newPinMaterial);
            });
        });
    });

    describe("parentNodeContext integration", () => {
        it("should consume parent node from enclosing SceneElement and add spriteInstance to parent", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            const addChildSpy = vi.spyOn(sceneElement.scene, "addChild");
            sceneElement.appendChild(element);

            expect(addChildSpy).toHaveBeenCalledWith(element.spriteInstance);
            expect(sceneElement.scene.children).toContain(element.spriteInstance);
            expect(element.spriteInstance.parent).toBe(sceneElement.scene);

            sceneElement.remove();
        });

        it("should remove spriteInstance from parent on disconnectedCallback", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            sceneElement.appendChild(element);
            expect(sceneElement.scene.children).toContain(element.spriteInstance);

            const removeChildSpy = vi.spyOn(sceneElement.scene, "removeChild");
            element.remove();

            expect(removeChildSpy).toHaveBeenCalledWith(element.spriteInstance);
            expect(sceneElement.scene.children).not.toContain(element.spriteInstance);
            expect(element.spriteInstance.parent).toBeNull();

            sceneElement.remove();
        });

        it("should re-provide parentNodeContext so child consumer element receives spriteInstance as its parent node", () => {
            const childConsumer = document.createElement(
                "test-sprite-child-consumer"
            ) as TestSpriteChildConsumerElement;

            element.appendChild(childConsumer);

            expect(childConsumer.parentValue).toBe(element.spriteInstance);

            childConsumer.remove();
        });

        it("should support hierarchical scene graph nesting when nested inside a Node3DElement", () => {
            const parentElement = document.createElement(TAG_RJ_NODE_3D);
            document.body.appendChild(parentElement);

            parentElement.appendChild(element);

            expect(parentElement.node.children).toContain(element.spriteInstance);
            expect(element.spriteInstance.parent).toBe(parentElement.node);

            element.remove();
            expect(parentElement.node.children).not.toContain(element.spriteInstance);
            expect(element.spriteInstance.parent).toBeNull();

            parentElement.remove();
        });

        it("should update parent-child relations when reparented to a different parent node", () => {
            const parent1 = document.createElement(TAG_RJ_NODE_3D);
            const parent2 = document.createElement(TAG_RJ_NODE_3D);
            document.body.appendChild(parent1);
            document.body.appendChild(parent2);

            parent1.appendChild(element);
            expect(parent1.node.children).toContain(element.spriteInstance);
            expect(element.spriteInstance.parent).toBe(parent1.node);

            parent2.appendChild(element);
            expect(parent1.node.children).not.toContain(element.spriteInstance);
            expect(parent2.node.children).toContain(element.spriteInstance);
            expect(element.spriteInstance.parent).toBe(parent2.node);

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
            expect(sceneElement.scene.children).toContain(element.spriteInstance);

            sceneElement.remove();
        });
    });

    describe("lifecycle", () => {
        it("should refresh context provider value upon reconnection to DOM", () => {
            element.remove();

            const childConsumer = document.createElement(
                "test-sprite-child-consumer"
            ) as TestSpriteChildConsumerElement;
            element.appendChild(childConsumer);

            document.body.appendChild(element);

            expect(childConsumer.parentValue).toBe(element.spriteInstance);

            childConsumer.remove();
        });

        it("should handle disconnection cleanly without throwing when not attached to scene or parent", () => {
            expect(() => {
                element.remove();
            }).not.toThrow();
        });
    });
});
