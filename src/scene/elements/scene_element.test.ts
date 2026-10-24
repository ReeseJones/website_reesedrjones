import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { LitElement } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { SceneElement, setupSceneElement } from "./scene_element";
import {
    sceneContext,
    parentNodeContext,
    type ISceneContext,
} from "./scene_element_types";
import {
    webglCanvasContext,
    type IWebGLCanvasContext,
} from "./webgl_canvas_element_types";
import { SceneRenderer } from "../renderer/scene_renderer";
import type { WebGLSubscriber } from "../../webgl/canvas/subscriber_types";
import type { CanvasDimensions, TimeInfo } from "../../webgl/canvas/canvas_types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import { createMockContextManager } from "../../testing/mocks/mock_context_manager";
import { SceneCameraChangedEvent } from "./scene_element_events";
import {
    TAG_RJ_SCENE,
    DEFAULT_SCENE_PASS_PRIORITY,
    DEFAULT_SCENE_CLEAR_DEPTH,
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

class TestCanvasHostElement extends LitElement {
    public canvasProvider = new ContextProvider(this, {
        context: webglCanvasContext,
    });

    public override createRenderRoot(): HTMLElement {
        return this;
    }
}

interface MockCanvasContextSetup {
    readonly context: IWebGLCanvasContext;
    readonly contextManager: IWebGLContextManager;
    readonly lastSubscriber: WebGLSubscriber | null;
    readonly unsubscribeSpy: ReturnType<typeof vi.fn>;
    readonly subscribeSpy: ReturnType<typeof vi.fn>;
}

function createMockCanvasContext(customCm?: IWebGLContextManager): MockCanvasContextSetup {
    const contextManager = customCm ?? createMockContextManager();
    const unsubscribeSpy = vi.fn();
    let currentSubscriber: WebGLSubscriber | null = null;
    const subscribeSpy = vi.fn((subscriber: WebGLSubscriber) => {
        currentSubscriber = subscriber;
        return unsubscribeSpy;
    });

    const context: IWebGLCanvasContext = {
        gl: null,
        contextManager,
        dimensions: {
            width: 800,
            height: 600,
            cssWidth: 800,
            cssHeight: 600,
            dpr: 1,
            aspect: 800 / 600,
        },
        isContextLost: false,
        metrics: {
            fps: 0,
            frameTimeMs: 0,
        },
        subscribe: subscribeSpy,
        requestRender: vi.fn(),
    };

    return {
        context,
        contextManager,
        get lastSubscriber(): WebGLSubscriber | null {
            return currentSubscriber;
        },
        unsubscribeSpy,
        subscribeSpy,
    };
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
        if (!customElements.get("test-canvas-host")) {
            customElements.define("test-canvas-host", TestCanvasHostElement);
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

            it("should update without reflecting to attribute when set via property", async () => {
                const targetPriority = 25;
                element.priority = targetPriority;
                await element.updateComplete;

                expect(element.priority).toBe(targetPriority);
                expect(element.hasAttribute("priority")).toBe(false);
            });

            it("should update when set via attribute", async () => {
                const attributePriority = 50;
                element.setAttribute("priority", String(attributePriority));
                await element.updateComplete;

                expect(element.priority).toBe(attributePriority);
            });
        });

        describe("clearDepth", () => {
            it("should default to DEFAULT_SCENE_CLEAR_DEPTH", () => {
                expect(element.clearDepth).toBe(DEFAULT_SCENE_CLEAR_DEPTH);
            });

            it("should update without reflecting to attribute when set via property", async () => {
                element.clearDepth = false;
                await element.updateComplete;

                expect(element.clearDepth).toBe(false);
                expect(element.hasAttribute("clear-depth")).toBe(false);

                element.clearDepth = true;
                await element.updateComplete;
                expect(element.clearDepth).toBe(true);
                expect(element.hasAttribute("clear-depth")).toBe(true);
            });

            it("should update when toggled via attribute", async () => {
                element.setAttribute("clear-depth", "");
                await element.updateComplete;
                expect(element.clearDepth).toBe(true);

                element.removeAttribute("clear-depth");
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

    describe("webglCanvasContext and render pipeline integration", () => {
        let host: TestCanvasHostElement;
        let mockCanvas: MockCanvasContextSetup;

        beforeEach(() => {
            host = document.createElement("test-canvas-host") as TestCanvasHostElement;
            document.body.appendChild(host);
            mockCanvas = createMockCanvasContext();
        });

        afterEach(() => {
            host.remove();
        });

        describe(".renderer", () => {
            it("should return persistent SceneRenderer instance even when not attached to canvas", () => {
                expect(element.renderer).toBeInstanceOf(SceneRenderer);
            });
        });

        describe("canvas context attachment", () => {
            it("should subscribe to canvas when mounted in host with webglCanvasContext", () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                expect(element.renderer).toBeInstanceOf(SceneRenderer);
                expect(mockCanvas.subscribeSpy).toHaveBeenCalledTimes(1);
                expect(mockCanvas.lastSubscriber).not.toBeNull();
                expect(mockCanvas.lastSubscriber?.priority).toBe(element.priority);
            });
        });

        describe("frame rendering behavior", () => {
            it("should not throw or call renderer.render when activeCamera is null", () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                expect(element.activeCamera).toBeNull();
                const renderSpy = vi.spyOn(element.renderer, "render");

                const mockGl = {} as WebGL2RenderingContext;
                const timeInfo: TimeInfo = { time: 1.0, dt: 0.016, frameCount: 1 };
                const dims: CanvasDimensions = {
                    width: 800,
                    height: 600,
                    cssWidth: 800,
                    cssHeight: 600,
                    dpr: 1,
                    aspect: 800 / 600,
                };

                expect(() => {
                    mockCanvas.lastSubscriber?.render?.(mockGl, timeInfo, dims);
                }).not.toThrow();
                expect(renderSpy).not.toHaveBeenCalled();
            });

            it("should dispatch renderer.render with scene, activeCamera, and clearDepth true when camera is present", () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                const camera = new PerspectiveCamera();
                element.registerCamera(camera);
                expect(element.activeCamera).toBe(camera);

                const renderSpy = vi.spyOn(element.renderer, "render");

                const mockGl = {} as WebGL2RenderingContext;
                const timeInfo: TimeInfo = { time: 2.5, dt: 0.016, frameCount: 15 };
                const dims: CanvasDimensions = {
                    width: 1920,
                    height: 1080,
                    cssWidth: 960,
                    cssHeight: 540,
                    dpr: 2,
                    aspect: 1920 / 1080,
                };

                mockCanvas.lastSubscriber?.render?.(mockGl, timeInfo, dims);

                expect(renderSpy).toHaveBeenCalledTimes(1);
                expect(renderSpy).toHaveBeenCalledWith({
                    contextManager: mockCanvas.contextManager,
                    scene: element.scene,
                    camera,
                    dimensions: dims,
                    timeInfo,
                    clearDepth: true,
                });
            });

            it("should pass clearDepth false to renderer.render when element.clearDepth is false", async () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                const camera = new PerspectiveCamera();
                element.registerCamera(camera);

                element.clearDepth = false;
                await element.updateComplete;

                const renderSpy = vi.spyOn(element.renderer, "render");

                const mockGl = {} as WebGL2RenderingContext;
                const timeInfo: TimeInfo = { time: 3.0, dt: 0.016, frameCount: 20 };
                const dims: CanvasDimensions = {
                    width: 800,
                    height: 600,
                    cssWidth: 800,
                    cssHeight: 600,
                    dpr: 1,
                    aspect: 800 / 600,
                };

                mockCanvas.lastSubscriber?.render?.(mockGl, timeInfo, dims);

                expect(renderSpy).toHaveBeenCalledTimes(1);
                expect(renderSpy).toHaveBeenCalledWith({
                    contextManager: mockCanvas.contextManager,
                    scene: element.scene,
                    camera,
                    dimensions: dims,
                    timeInfo,
                    clearDepth: false,
                });
            });
        });

        describe("canvas subscriber destroy", () => {
            it("should invoke renderer.reset when subscriber.destroy is called", () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                const resetSpy = vi.spyOn(element.renderer, "reset");

                mockCanvas.lastSubscriber?.destroy?.();

                expect(resetSpy).toHaveBeenCalledTimes(1);
            });
        });

        describe("priority change re-subscription", () => {
            it("should re-subscribe with updated priority and unsubscribe previous subscription when element.priority changes", async () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                expect(mockCanvas.subscribeSpy).toHaveBeenCalledTimes(1);
                expect(mockCanvas.unsubscribeSpy).not.toHaveBeenCalled();

                const newPriority = 42;
                element.priority = newPriority;
                await element.updateComplete;

                expect(mockCanvas.unsubscribeSpy).toHaveBeenCalledTimes(1);
                expect(mockCanvas.subscribeSpy).toHaveBeenCalledTimes(2);
                expect(mockCanvas.lastSubscriber?.priority).toBe(newPriority);
            });
        });

        describe("disconnection cleanup", () => {
            it("should invoke unsubscribe, call renderer.reset, and retain renderer upon DOM removal", () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                const camera = new PerspectiveCamera();
                element.registerCamera(camera);

                const currentRenderer = element.renderer;
                expect(currentRenderer).not.toBeNull();
                const resetSpy = vi.spyOn(currentRenderer, "reset");
                const currentUnsubscribe = mockCanvas.unsubscribeSpy;

                element.remove();

                expect(currentUnsubscribe).toHaveBeenCalledTimes(1);
                expect(resetSpy).toHaveBeenCalledTimes(1);
                expect(element.renderer).toBe(currentRenderer);
            });
        });

        describe("destroy() cleanup", () => {
            it("should unregister canvas subscriber, reset renderer, and destroy scene", () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                const currentRenderer = element.renderer;
                expect(currentRenderer).not.toBeNull();
                const resetSpy = vi.spyOn(currentRenderer, "reset");
                const sceneDestroySpy = vi.spyOn(element.scene, "destroy");
                const currentUnsubscribe = mockCanvas.unsubscribeSpy;

                element.destroy();

                expect(currentUnsubscribe).toHaveBeenCalledTimes(1);
                expect(resetSpy).toHaveBeenCalledTimes(1);
                expect(element.renderer).toBe(currentRenderer);
                expect(sceneDestroySpy).toHaveBeenCalledTimes(1);
            });
        });

        describe("context detachment / null context", () => {
            it("should clean up previous subscription and reset renderer when canvas context is cleared", () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                expect(element.renderer).toBeInstanceOf(SceneRenderer);
                const currentRenderer = element.renderer;
                const resetSpy = vi.spyOn(currentRenderer, "reset");
                const currentUnsubscribe = mockCanvas.unsubscribeSpy;

                host.canvasProvider.setValue(undefined as unknown as IWebGLCanvasContext);

                expect(currentUnsubscribe).toHaveBeenCalledTimes(1);
                expect(resetSpy).toHaveBeenCalledTimes(1);
                expect(element.renderer).toBe(currentRenderer);
            });

            it("should unsubscribe previous subscription and pass updated contextManager when canvas context changes", () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                const camera = new PerspectiveCamera();
                element.registerCamera(camera);

                const mockCanvas2 = createMockCanvasContext();
                const unsubscribe1 = mockCanvas.unsubscribeSpy;

                host.canvasProvider.setValue(mockCanvas2.context);

                expect(unsubscribe1).toHaveBeenCalledTimes(1);
                expect(mockCanvas2.subscribeSpy).toHaveBeenCalledTimes(1);

                const renderSpy = vi.spyOn(element.renderer, "render");
                const mockGl = {} as WebGL2RenderingContext;
                const timeInfo: TimeInfo = { time: 1.0, dt: 0.016, frameCount: 1 };
                const dims: CanvasDimensions = {
                    width: 800,
                    height: 600,
                    cssWidth: 800,
                    cssHeight: 600,
                    dpr: 1,
                    aspect: 800 / 600,
                };

                mockCanvas2.lastSubscriber?.render?.(mockGl, timeInfo, dims);

                expect(renderSpy).toHaveBeenCalledWith({
                    contextManager: mockCanvas2.contextManager,
                    scene: element.scene,
                    camera,
                    dimensions: dims,
                    timeInfo,
                    clearDepth: true,
                });
            });

            it("should not re-subscribe if the same canvas context instance is emitted", () => {
                host.canvasProvider.setValue(mockCanvas.context);
                host.appendChild(element);

                expect(mockCanvas.subscribeSpy).toHaveBeenCalledTimes(1);

                host.canvasProvider.setValue(mockCanvas.context);

                expect(mockCanvas.subscribeSpy).toHaveBeenCalledTimes(1);
                expect(mockCanvas.unsubscribeSpy).not.toHaveBeenCalled();
            });
        });
    });
});
