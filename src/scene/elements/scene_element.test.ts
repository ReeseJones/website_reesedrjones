import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { LitElement } from "lit";
import { ContextConsumer } from "@lit/context";
import { SceneElement, setupSceneElement } from "./scene_element";
import {
    sceneContext,
    parentNodeContext,
    type ISceneContext,
} from "./scene_element_types";
import { SceneCameraChangedEvent } from "./scene_element_events";
import {
    TAG_RJ_SCENE,
    DEFAULT_SCENE_PASS_PRIORITY,
    DEFAULT_SCENE_CLEAR_DEPTH,
    ATTR_PRIORITY,
    ATTR_CLEAR_DEPTH,
    DEFAULT_SCENE_ROOT_NAME,
} from "./scene_element_constants";
import { PerspectiveCamera } from "../camera/perspective_camera";
import type { ISceneNode } from "../core/scene_node_types";
import { Scene } from "../core/scene";

class TestChildConsumerElement extends LitElement {
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

describe("setupSceneElement()", () => {
    it("should be idempotent and register the custom element tag", () => {
        setupSceneElement();
        expect(customElements.get(TAG_RJ_SCENE)).toBe(SceneElement);

        // Calling multiple times should not throw
        expect(() => setupSceneElement()).not.toThrow();
    });
});

describe("SceneElement", () => {
    let element: SceneElement;

    beforeAll(() => {
        setupSceneElement();
        if (!customElements.get("test-scene-child-consumer")) {
            customElements.define("test-scene-child-consumer", TestChildConsumerElement);
        }
    });

    beforeEach(() => {
        element = document.createElement(TAG_RJ_SCENE);
        document.body.appendChild(element);
    });

    afterEach(() => {
        element.remove();
        document.body.innerHTML = "";
    });

    describe("properties", () => {
        describe("priority", () => {
            it("should default to DEFAULT_SCENE_PASS_PRIORITY", () => {
                expect(element.priority).toBe(DEFAULT_SCENE_PASS_PRIORITY);
            });

            it("should update when set via property", async () => {
                const targetPriority = 25;
                element.priority = targetPriority;
                await element.updateComplete;

                expect(element.priority).toBe(targetPriority);
            });

            it("should update when set via attribute", async () => {
                const attributePriority = 50;
                element.setAttribute(ATTR_PRIORITY, String(attributePriority));
                await element.updateComplete;

                expect(element.priority).toBe(attributePriority);
            });
        });

        describe("clearDepth", () => {
            it("should default to DEFAULT_SCENE_CLEAR_DEPTH", () => {
                expect(element.clearDepth).toBe(DEFAULT_SCENE_CLEAR_DEPTH);
            });

            it("should update when set via property", async () => {
                element.clearDepth = false;
                await element.updateComplete;

                expect(element.clearDepth).toBe(false);
            });

            it("should update when toggled via attribute", async () => {
                element.setAttribute(ATTR_CLEAR_DEPTH, "");
                await element.updateComplete;
                expect(element.clearDepth).toBe(true);

                element.removeAttribute(ATTR_CLEAR_DEPTH);
                await element.updateComplete;
                expect(element.clearDepth).toBe(false);
            });
        });
    });

    describe("createRenderRoot()", () => {
        it("should return the element itself for Light DOM rendering without shadow root", () => {
            expect(element.createRenderRoot()).toBe(element);
            expect(element.shadowRoot).toBeNull();
        });
    });

    describe(".scene", () => {
        it("should return an IScene instance matching Scene class and default name", () => {
            const sceneInstance = element.scene;

            expect(sceneInstance).toBeInstanceOf(Scene);
            expect(sceneInstance.name).toBe(DEFAULT_SCENE_ROOT_NAME);
        });
    });

    describe(".activeCamera", () => {
        it("should default to null before cameras are registered", () => {
            expect(element.activeCamera).toBeNull();
        });

        it("should reflect the underlying scene activeCamera when set or registered", () => {
            const camera = new PerspectiveCamera();
            element.setActiveCamera(camera);

            expect(element.activeCamera).toBe(camera);
        });
    });

    describe(".registerCamera()", () => {
        it("should appoint the first registered camera as activeCamera and return unregister function", () => {
            const camera = new PerspectiveCamera();
            const unregister = element.registerCamera(camera);

            expect(typeof unregister).toBe("function");
            expect(element.activeCamera).toBe(camera);
        });

        it("should dispatch SceneCameraChangedEvent when active camera is appointed", () => {
            const camera = new PerspectiveCamera();
            const eventSpy = vi.fn();
            element.addEventListener(SceneCameraChangedEvent.TYPE, (event) => {
                expect(event).toBeInstanceOf(SceneCameraChangedEvent);
                eventSpy(event.camera);
            });

            element.registerCamera(camera);

            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(eventSpy).toHaveBeenCalledWith(camera);
        });

        it("should not appoint a second camera when makeDefault is false and activeCamera exists", () => {
            const camera1 = new PerspectiveCamera();
            const camera2 = new PerspectiveCamera();

            element.registerCamera(camera1);
            expect(element.activeCamera).toBe(camera1);

            const eventSpy = vi.fn();
            element.addEventListener(SceneCameraChangedEvent.TYPE, eventSpy);

            const unregister2 = element.registerCamera(camera2, false);

            expect(typeof unregister2).toBe("function");
            expect(element.activeCamera).toBe(camera1);
            expect(eventSpy).not.toHaveBeenCalled();
        });

        it("should appoint a second camera when makeDefault is true and dispatch event", () => {
            const camera1 = new PerspectiveCamera();
            const camera2 = new PerspectiveCamera();

            element.registerCamera(camera1);
            expect(element.activeCamera).toBe(camera1);

            const eventSpy = vi.fn();
            element.addEventListener(SceneCameraChangedEvent.TYPE, (event) => {
                expect(event).toBeInstanceOf(SceneCameraChangedEvent);
                eventSpy(event.camera);
            });

            const unregister2 = element.registerCamera(camera2, true);

            expect(typeof unregister2).toBe("function");
            expect(element.activeCamera).toBe(camera2);
            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(eventSpy).toHaveBeenCalledWith(camera2);
        });

        it("should restore previous camera and dispatch event when active camera unregisters", () => {
            const camera1 = new PerspectiveCamera();
            const camera2 = new PerspectiveCamera();

            element.registerCamera(camera1);
            const unregister2 = element.registerCamera(camera2, true);
            expect(element.activeCamera).toBe(camera2);

            const eventSpy = vi.fn();
            element.addEventListener(SceneCameraChangedEvent.TYPE, (event) => {
                expect(event).toBeInstanceOf(SceneCameraChangedEvent);
                eventSpy(event.camera);
            });

            unregister2();

            expect(element.activeCamera).toBe(camera1);
            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(eventSpy).toHaveBeenCalledWith(camera1);
        });

        it("should reset activeCamera to null and dispatch event when only camera unregisters", () => {
            const camera = new PerspectiveCamera();
            const unregister = element.registerCamera(camera);
            expect(element.activeCamera).toBe(camera);

            const eventSpy = vi.fn();
            element.addEventListener(SceneCameraChangedEvent.TYPE, (event) => {
                expect(event).toBeInstanceOf(SceneCameraChangedEvent);
                eventSpy(event.camera);
            });

            unregister();

            expect(element.activeCamera).toBeNull();
            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(eventSpy).toHaveBeenCalledWith(null);
        });

        it("should be idempotent when calling unregister multiple times", () => {
            const camera = new PerspectiveCamera();
            const unregister = element.registerCamera(camera);

            unregister();
            expect(element.activeCamera).toBeNull();

            const eventSpy = vi.fn();
            element.addEventListener(SceneCameraChangedEvent.TYPE, eventSpy);

            // Second unregister call should not throw or fire new events
            expect(() => unregister()).not.toThrow();
            expect(eventSpy).not.toHaveBeenCalled();
        });
    });

    describe(".setActiveCamera()", () => {
        it("should set activeCamera and dispatch SceneCameraChangedEvent", () => {
            const camera = new PerspectiveCamera();
            const eventSpy = vi.fn();
            element.addEventListener(SceneCameraChangedEvent.TYPE, (event) => {
                expect(event).toBeInstanceOf(SceneCameraChangedEvent);
                eventSpy(event.camera);
            });

            element.setActiveCamera(camera);

            expect(element.activeCamera).toBe(camera);
            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(eventSpy).toHaveBeenCalledWith(camera);
        });

        it("should clear activeCamera to null and dispatch event", () => {
            const camera = new PerspectiveCamera();
            element.setActiveCamera(camera);

            const eventSpy = vi.fn();
            element.addEventListener(SceneCameraChangedEvent.TYPE, (event) => {
                expect(event).toBeInstanceOf(SceneCameraChangedEvent);
                eventSpy(event.camera);
            });

            element.setActiveCamera(null);

            expect(element.activeCamera).toBeNull();
            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(eventSpy).toHaveBeenCalledWith(null);
        });

        it("should not dispatch SceneCameraChangedEvent when setting the same camera", () => {
            const camera = new PerspectiveCamera();
            element.setActiveCamera(camera);

            const eventSpy = vi.fn();
            element.addEventListener(SceneCameraChangedEvent.TYPE, eventSpy);

            element.setActiveCamera(camera);

            expect(eventSpy).not.toHaveBeenCalled();
        });
    });

    describe(".subscribeFrame()", () => {
        it("should delegate to underlying scene and return an unsubscribe function", () => {
            const frameCallback = vi.fn();
            const subscribeSpy = vi.spyOn(element.scene, "subscribeFrame");

            const priority = 5;
            const unsubscribe = element.subscribeFrame(frameCallback, priority);

            expect(typeof unsubscribe).toBe("function");
            expect(subscribeSpy).toHaveBeenCalledWith(frameCallback, priority);

            expect(() => unsubscribe()).not.toThrow();
        });
    });

    describe(".destroy()", () => {
        it("should call destroy on the underlying scene", () => {
            const destroySpy = vi.spyOn(element.scene, "destroy");

            element.destroy();

            expect(destroySpy).toHaveBeenCalledTimes(1);
            expect(element.activeCamera).toBeNull();
        });
    });

    describe("context provision", () => {
        it("should provide sceneContext pointing to SceneElement and parentNodeContext pointing to Scene", () => {
            const childConsumer = document.createElement(
                "test-scene-child-consumer"
            ) as TestChildConsumerElement;

            element.appendChild(childConsumer);

            expect(childConsumer.sceneValue).toBe(element);
            expect(childConsumer.parentValue).toBe(element.scene);
        });

        it("should notify sceneContext subscribers when activeCamera changes", () => {
            const childConsumer = document.createElement(
                "test-scene-child-consumer"
            ) as TestChildConsumerElement;

            element.appendChild(childConsumer);
            const initialNotifyCount = childConsumer.sceneNotifyCount;
            expect(initialNotifyCount).toBeGreaterThanOrEqual(1);

            const camera = new PerspectiveCamera();
            element.setActiveCamera(camera);

            expect(childConsumer.sceneNotifyCount).toBe(initialNotifyCount + 1);
            expect(childConsumer.sceneValue?.activeCamera).toBe(camera);
        });
    });

    describe("lifecycle", () => {
        it("should refresh context provider values upon reconnection to DOM", () => {
            element.remove();

            const childConsumer = document.createElement(
                "test-scene-child-consumer"
            ) as TestChildConsumerElement;
            element.appendChild(childConsumer);

            document.body.appendChild(element);

            expect(childConsumer.sceneValue).toBe(element);
            expect(childConsumer.parentValue).toBe(element.scene);
        });

        it("should handle disconnection cleanly without throwing", () => {
            expect(() => {
                element.remove();
            }).not.toThrow();
        });
    });
});
