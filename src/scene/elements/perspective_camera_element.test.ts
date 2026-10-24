import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { LitElement } from "lit";
import { ContextConsumer } from "@lit/context";
import {
    PerspectiveCameraElement,
    setupPerspectiveCameraElement,
} from "./perspective_camera_element";
import {
    TAG_RJ_PERSPECTIVE_CAMERA,
    DEFAULT_CAMERA_NAME,
    DEFAULT_CAMERA_FOV,
    DEFAULT_CAMERA_NEAR,
    DEFAULT_CAMERA_FAR,
    DEFAULT_CAMERA_ASPECT,
    DEFAULT_CAMERA_MAKE_DEFAULT,
    DEFAULT_CAMERA_HIDDEN,
    DEFAULT_CAMERA_POSITION,
    DEFAULT_CAMERA_ROTATION,
    DEFAULT_CAMERA_SCALE,
} from "./perspective_camera_element_constants";
import { PerspectiveCamera } from "../camera/perspective_camera";
import { SceneElement, setupSceneElement } from "./scene_element";
import { TAG_RJ_SCENE } from "./scene_element_constants";
import {
    sceneContext,
    parentNodeContext,
    type ISceneContext,
} from "./scene_element_types";
import type { ISceneNode } from "../core/scene_node_types";

class TestCameraChildConsumerElement extends LitElement {
    public sceneValue: ISceneContext | undefined;
    public parentValue: ISceneNode | undefined;
    public sceneNotifyCount = 0;

    public sceneConsumer = new ContextConsumer(this, {
        context: sceneContext,
        subscribe: true,
        callback: (value) => {
            this.sceneValue = value;
            this.sceneNotifyCount++;
        },
    });

    public parentConsumer = new ContextConsumer(this, {
        context: parentNodeContext,
        subscribe: true,
        callback: (value) => {
            this.parentValue = value;
        },
    });

    public override createRenderRoot(): HTMLElement {
        return this;
    }
}

describe("setupPerspectiveCameraElement()", () => {
    it("should be idempotent and register the custom element tag", () => {
        setupPerspectiveCameraElement();
        expect(customElements.get(TAG_RJ_PERSPECTIVE_CAMERA)).toBe(PerspectiveCameraElement);

        // Multiple invocations must be safe and idempotent
        expect(() => setupPerspectiveCameraElement()).not.toThrow();
    });
});

describe("PerspectiveCameraElement", () => {
    let element: PerspectiveCameraElement;

    beforeAll(() => {
        setupPerspectiveCameraElement();
        setupSceneElement();
        if (!customElements.get("test-camera-child-consumer")) {
            customElements.define("test-camera-child-consumer", TestCameraChildConsumerElement);
        }
    });

    beforeEach(() => {
        element = document.createElement(TAG_RJ_PERSPECTIVE_CAMERA);
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

    describe(".camera", () => {
        it("should return a PerspectiveCamera instance matching default initial parameters", () => {
            const cam = element.camera;

            expect(cam).toBeInstanceOf(PerspectiveCamera);
            expect(cam.name).toBe(DEFAULT_CAMERA_NAME);
            expect(cam.fov).toBe(DEFAULT_CAMERA_FOV);
            expect(cam.near).toBe(DEFAULT_CAMERA_NEAR);
            expect(cam.far).toBe(DEFAULT_CAMERA_FAR);
            expect(cam.aspect).toBe(DEFAULT_CAMERA_ASPECT);
            expect(cam.visible).toBe(true);
            expect(cam.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            expect(cam.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
        });
    });

    describe("properties", () => {
        describe("name", () => {
            it("should default to DEFAULT_CAMERA_NAME", async () => {
                await element.updateComplete;
                expect(element.name).toBe(DEFAULT_CAMERA_NAME);
                expect(element.camera.name).toBe(DEFAULT_CAMERA_NAME);
            });

            it("should reconcile to camera.name and reflect to attribute on property change", async () => {
                const targetName = "MainFollowCamera";
                element.name = targetName;
                await element.updateComplete;

                expect(element.name).toBe(targetName);
                expect(element.camera.name).toBe(targetName);
                expect(element.getAttribute("name")).toBe(targetName);
            });

            it("should update property and camera.name on attribute change", async () => {
                const attributeName = "CinematicCutsceneCamera";
                element.setAttribute("name", attributeName);
                await element.updateComplete;

                expect(element.name).toBe(attributeName);
                expect(element.camera.name).toBe(attributeName);
            });
        });

        describe("fov", () => {
            it("should default to DEFAULT_CAMERA_FOV", () => {
                expect(element.fov).toBe(DEFAULT_CAMERA_FOV);
                expect(element.camera.fov).toBe(DEFAULT_CAMERA_FOV);
            });

            it("should reconcile to camera.fov without reflecting to attribute on property change", async () => {
                const targetFov = 45;
                element.fov = targetFov;
                await element.updateComplete;

                expect(element.fov).toBe(targetFov);
                expect(element.camera.fov).toBe(targetFov);
                expect(element.hasAttribute("fov")).toBe(false);
            });

            it("should update property and camera.fov on attribute change", async () => {
                const attributeFov = 75;
                element.setAttribute("fov", String(attributeFov));
                await element.updateComplete;

                expect(element.fov).toBe(attributeFov);
                expect(element.camera.fov).toBe(attributeFov);
            });
        });

        describe("near", () => {
            it("should default to DEFAULT_CAMERA_NEAR", () => {
                expect(element.near).toBe(DEFAULT_CAMERA_NEAR);
                expect(element.camera.near).toBe(DEFAULT_CAMERA_NEAR);
            });

            it("should reconcile to camera.near without reflecting to attribute on property change", async () => {
                const targetNear = 0.5;
                element.near = targetNear;
                await element.updateComplete;

                expect(element.near).toBe(targetNear);
                expect(element.camera.near).toBe(targetNear);
                expect(element.hasAttribute("near")).toBe(false);
            });

            it("should update property and camera.near on attribute change", async () => {
                const attributeNear = 1.0;
                element.setAttribute("near", String(attributeNear));
                await element.updateComplete;

                expect(element.near).toBe(attributeNear);
                expect(element.camera.near).toBe(attributeNear);
            });
        });

        describe("far", () => {
            it("should default to DEFAULT_CAMERA_FAR", () => {
                expect(element.far).toBe(DEFAULT_CAMERA_FAR);
                expect(element.camera.far).toBe(DEFAULT_CAMERA_FAR);
            });

            it("should reconcile to camera.far without reflecting to attribute on property change", async () => {
                const targetFar = 2000;
                element.far = targetFar;
                await element.updateComplete;

                expect(element.far).toBe(targetFar);
                expect(element.camera.far).toBe(targetFar);
                expect(element.hasAttribute("far")).toBe(false);
            });

            it("should update property and camera.far on attribute change", async () => {
                const attributeFar = 500;
                element.setAttribute("far", String(attributeFar));
                await element.updateComplete;

                expect(element.far).toBe(attributeFar);
                expect(element.camera.far).toBe(attributeFar);
            });
        });

        describe("aspect", () => {
            it("should default to undefined property while camera.aspect uses DEFAULT_CAMERA_ASPECT", () => {
                expect(element.aspect).toBeUndefined();
                expect(element.camera.aspect).toBe(DEFAULT_CAMERA_ASPECT);
            });

            it("should reconcile to camera.aspect without reflecting to attribute on property change", async () => {
                const targetAspect = 16 / 9;
                element.aspect = targetAspect;
                await element.updateComplete;

                expect(element.aspect).toBeCloseTo(targetAspect);
                expect(element.camera.aspect).toBeCloseTo(targetAspect);
                expect(element.hasAttribute("aspect")).toBe(false);
            });

            it("should update property and camera.aspect on attribute change", async () => {
                const attributeAspect = 2.0;
                element.setAttribute("aspect", String(attributeAspect));
                await element.updateComplete;

                expect(element.aspect).toBe(attributeAspect);
                expect(element.camera.aspect).toBe(attributeAspect);
            });

            it("should fallback to DEFAULT_CAMERA_ASPECT when reset to undefined", async () => {
                element.aspect = 2.0;
                await element.updateComplete;
                expect(element.camera.aspect).toBe(2.0);

                element.aspect = undefined;
                await element.updateComplete;

                expect(element.aspect).toBeUndefined();
                expect(element.camera.aspect).toBe(DEFAULT_CAMERA_ASPECT);
                expect(element.hasAttribute("aspect")).toBe(false);
            });
        });

        describe("makeDefault", () => {
            it("should default to DEFAULT_CAMERA_MAKE_DEFAULT", () => {
                expect(element.makeDefault).toBe(DEFAULT_CAMERA_MAKE_DEFAULT);
                expect(element.hasAttribute("make-default")).toBe(false);
            });

            it("should update and reflect to make-default attribute on property change", async () => {
                element.makeDefault = true;
                await element.updateComplete;

                expect(element.makeDefault).toBe(true);
                expect(element.hasAttribute("make-default")).toBe(true);

                element.makeDefault = false;
                await element.updateComplete;

                expect(element.makeDefault).toBe(false);
                expect(element.hasAttribute("make-default")).toBe(false);
            });

            it("should update when toggled via attribute", async () => {
                element.setAttribute("make-default", "");
                await element.updateComplete;
                expect(element.makeDefault).toBe(true);

                element.removeAttribute("make-default");
                await element.updateComplete;
                expect(element.makeDefault).toBe(false);
            });
        });

        describe("position", () => {
            it("should default to DEFAULT_CAMERA_POSITION and sync with transform", () => {
                expect(element.position).toEqual(DEFAULT_CAMERA_POSITION);
                expect(element.camera.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            });

            it("should reconcile to camera.transform.position and reflect to attribute on property change", async () => {
                element.position = { x: 1, y: 2, z: 3 };
                await element.updateComplete;

                expect(element.position).toEqual({ x: 1, y: 2, z: 3 });
                expect(element.camera.transform.getPosition()).toEqual({ x: 1, y: 2, z: 3 });
                expect(element.getAttribute("position")).toBe("1 2 3");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("position", "4 5 6");
                await element.updateComplete;

                expect(element.position).toEqual({ x: 4, y: 5, z: 6 });
                expect(element.camera.transform.getPosition()).toEqual({ x: 4, y: 5, z: 6 });
            });

            it("should parse comma-delimited string attribute", async () => {
                element.setAttribute("position", "7, 8, 9");
                await element.updateComplete;

                expect(element.position).toEqual({ x: 7, y: 8, z: 9 });
                expect(element.camera.transform.getPosition()).toEqual({ x: 7, y: 8, z: 9 });
            });
        });

        describe("rotation", () => {
            it("should default to DEFAULT_CAMERA_ROTATION and sync with transform", () => {
                expect(element.rotation).toEqual(DEFAULT_CAMERA_ROTATION);
                const angles = element.camera.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0);
                expect(angles.yaw).toBeCloseTo(0);
                expect(angles.roll).toBeCloseTo(0);
            });

            it("should reconcile to camera.transform.rotation and reflect to attribute on property change", async () => {
                element.rotation = { x: 0.1, y: 0.2, z: 0.3 };
                await element.updateComplete;

                expect(element.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
                const angles = element.camera.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.1, 4);
                expect(angles.yaw).toBeCloseTo(0.2, 4);
                expect(angles.roll).toBeCloseTo(0.3, 4);
                expect(element.getAttribute("rotation")).toBe("0.1 0.2 0.3");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("rotation", "0.4 0.5 0.6");
                await element.updateComplete;

                expect(element.rotation).toEqual({ x: 0.4, y: 0.5, z: 0.6 });
                const angles = element.camera.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.4, 4);
                expect(angles.yaw).toBeCloseTo(0.5, 4);
                expect(angles.roll).toBeCloseTo(0.6, 4);
            });
        });

        describe("scale", () => {
            it("should default to DEFAULT_CAMERA_SCALE and sync with transform", () => {
                expect(element.scale).toEqual(DEFAULT_CAMERA_SCALE);
                expect(element.camera.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
            });

            it("should reconcile to camera.transform.scale and reflect to attribute on property change", async () => {
                element.scale = { x: 2, y: 3, z: 4 };
                await element.updateComplete;

                expect(element.scale).toEqual({ x: 2, y: 3, z: 4 });
                expect(element.camera.transform.getScale()).toEqual({ x: 2, y: 3, z: 4 });
                expect(element.getAttribute("scale")).toBe("2 3 4");
            });

            it("should parse space-delimited string attribute", async () => {
                element.setAttribute("scale", "0.5 0.5 0.5");
                await element.updateComplete;

                expect(element.scale).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
                expect(element.camera.transform.getScale()).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
            });
        });

        describe("hidden", () => {
            it("should default to DEFAULT_CAMERA_HIDDEN (false) and sync with camera (visible = true)", () => {
                expect(element.hidden).toBe(DEFAULT_CAMERA_HIDDEN);
                expect(element.camera.visible).toBe(true);
                expect(element.hasAttribute("hidden")).toBe(false);
            });

            it("should reconcile to camera.visible and reflect to attribute on property change", async () => {
                element.hidden = true;
                await element.updateComplete;

                expect(element.hidden).toBe(true);
                expect(element.camera.visible).toBe(false);
                expect(element.hasAttribute("hidden")).toBe(true);

                element.hidden = false;
                await element.updateComplete;

                expect(element.hidden).toBe(false);
                expect(element.camera.visible).toBe(true);
                expect(element.hasAttribute("hidden")).toBe(false);
            });

            it("should update when toggled via attribute", async () => {
                element.setAttribute("hidden", "");
                await element.updateComplete;
                expect(element.hidden).toBe(true);
                expect(element.camera.visible).toBe(false);

                element.removeAttribute("hidden");
                await element.updateComplete;
                expect(element.hidden).toBe(false);
                expect(element.camera.visible).toBe(true);
            });
        });
    });

    describe("sceneContext integration", () => {
        it("should register camera with enclosing scene via registerCamera()", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            const registerSpy = vi.spyOn(sceneElement, "registerCamera");
            sceneElement.appendChild(element);

            expect(registerSpy).toHaveBeenCalledWith(element.camera, false);
            expect(sceneElement.activeCamera).toBe(element.camera);

            sceneElement.remove();
        });

        it("should appoint camera as activeCamera when makeDefault is true on mount", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            const camera1 = document.createElement(TAG_RJ_PERSPECTIVE_CAMERA);
            sceneElement.appendChild(camera1);
            expect(sceneElement.activeCamera).toBe(camera1.camera);

            element.makeDefault = true;
            sceneElement.appendChild(element);

            expect(sceneElement.activeCamera).toBe(element.camera);

            camera1.remove();
            sceneElement.remove();
        });

        it("should appoint camera as activeCamera when makeDefault transitions to true", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            const camera1 = document.createElement(TAG_RJ_PERSPECTIVE_CAMERA);
            sceneElement.appendChild(camera1);
            sceneElement.appendChild(element);

            expect(sceneElement.activeCamera).toBe(camera1.camera);

            element.makeDefault = true;
            await element.updateComplete;

            expect(sceneElement.activeCamera).toBe(element.camera);

            camera1.remove();
            sceneElement.remove();
        });

        it("should unregister from scene on disconnectedCallback", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            sceneElement.appendChild(element);
            expect(sceneElement.activeCamera).toBe(element.camera);

            element.remove();
            expect(sceneElement.activeCamera).toBeNull();

            sceneElement.remove();
        });

        it("should unregister from previous scene and register with new scene when reparented", () => {
            const sceneElement1 = document.createElement(TAG_RJ_SCENE);
            const sceneElement2 = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement1);
            document.body.appendChild(sceneElement2);

            sceneElement1.appendChild(element);
            expect(sceneElement1.activeCamera).toBe(element.camera);
            expect(sceneElement2.activeCamera).toBeNull();

            sceneElement2.appendChild(element);
            expect(sceneElement1.activeCamera).toBeNull();
            expect(sceneElement2.activeCamera).toBe(element.camera);

            sceneElement1.remove();
            sceneElement2.remove();
        });
    });

    describe("parentNodeContext integration", () => {
        it("should consume parent node and add camera to parent", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            sceneElement.appendChild(element);

            expect(sceneElement.scene.children).toContain(element.camera);
            expect(element.camera.parent).toBe(sceneElement.scene);

            sceneElement.remove();
        });

        it("should remove camera from parent on disconnect", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            sceneElement.appendChild(element);
            expect(sceneElement.scene.children).toContain(element.camera);

            element.remove();

            expect(sceneElement.scene.children).not.toContain(element.camera);
            expect(element.camera.parent).toBeNull();

            sceneElement.remove();
        });

        it("should re-provide parentNodeContext so child consumer element receives camera as parent node", () => {
            const childConsumer = document.createElement(
                "test-camera-child-consumer"
            ) as TestCameraChildConsumerElement;

            element.appendChild(childConsumer);

            expect(childConsumer.parentValue).toBe(element.camera);

            childConsumer.remove();
        });

        it("should support hierarchical camera parenting when nested", () => {
            const parentCameraElement = document.createElement(TAG_RJ_PERSPECTIVE_CAMERA);
            document.body.appendChild(parentCameraElement);

            parentCameraElement.appendChild(element);

            expect(parentCameraElement.camera.children).toContain(element.camera);
            expect(element.camera.parent).toBe(parentCameraElement.camera);

            element.remove();
            expect(parentCameraElement.camera.children).not.toContain(element.camera);
            expect(element.camera.parent).toBeNull();

            parentCameraElement.remove();
        });

        it("should update parent-child relations when reparented to a different node", () => {
            const parent1 = document.createElement(TAG_RJ_PERSPECTIVE_CAMERA);
            const parent2 = document.createElement(TAG_RJ_PERSPECTIVE_CAMERA);
            document.body.appendChild(parent1);
            document.body.appendChild(parent2);

            parent1.appendChild(element);
            expect(parent1.camera.children).toContain(element.camera);
            expect(element.camera.parent).toBe(parent1.camera);

            parent2.appendChild(element);
            expect(parent1.camera.children).not.toContain(element.camera);
            expect(parent2.camera.children).toContain(element.camera);
            expect(element.camera.parent).toBe(parent2.camera);

            parent1.remove();
            parent2.remove();
        });
    });

    describe("lifecycle", () => {
        it("should refresh context provider value upon reconnection to DOM", () => {
            element.remove();

            const childConsumer = document.createElement(
                "test-camera-child-consumer"
            ) as TestCameraChildConsumerElement;
            element.appendChild(childConsumer);

            document.body.appendChild(element);

            expect(childConsumer.parentValue).toBe(element.camera);

            childConsumer.remove();
        });

        it("should handle disconnection cleanly without throwing when not attached to scene or parent", () => {
            expect(() => {
                element.remove();
            }).not.toThrow();
        });
    });
});
