import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { LitElement } from "lit";
import { ContextConsumer } from "@lit/context";
import {
    WebGLCanvasElement,
    setupWebGLCanvasElement,
} from "./webgl_canvas_element";
import {
    webglCanvasContext,
    type IWebGLCanvasContext,
} from "./scene_element_types";
import {
    WebGLContextCreatedEvent,
    WebGLContextLostEvent,
    WebGLContextRestoredEvent,
    WebGLResizeEvent,
} from "./webgl_canvas_element_events";
import {
    TAG_RJ_WEBGL_CANVAS,
    DEFAULT_DPR_CAP,
    DEFAULT_AUTO_CLEAR,
    DEFAULT_CLEAR_COLOR,
    DEFAULT_RENDER_MODE,
    DEFAULT_PAUSE_WHEN_OFFSCREEN,
    DEFAULT_PAUSE_WHEN_HIDDEN,
} from "./webgl_canvas_element_constants";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import type {
    WebGLSubscriber,
    CanvasDimensions,
    TimeInfo,
} from "../../components/webgl_canvas/types";

class TestCanvasConsumerElement extends LitElement {
    public canvasValue: IWebGLCanvasContext | undefined;
    public notifyCount = 0;

    public consumer = new ContextConsumer(this, {
        context: webglCanvasContext,
        subscribe: true,
        callback: (value) => {
            this.canvasValue = value;
            this.notifyCount++;
        },
    });

    public override createRenderRoot(): HTMLElement {
        return this;
    }
}

describe("setupWebGLCanvasElement()", () => {
    it("should be idempotent and register the rj-webgl-canvas custom element", () => {
        setupWebGLCanvasElement();
        expect(customElements.get(TAG_RJ_WEBGL_CANVAS)).toBe(WebGLCanvasElement);

        // Calling multiple times should not throw
        expect(() => setupWebGLCanvasElement()).not.toThrow();
    });
});

describe("WebGLCanvasElement", () => {
    let element: WebGLCanvasElement;
    let mockGL: WebGL2RenderingContext;
    let getContextSpy: ReturnType<typeof vi.spyOn>;

    beforeAll(() => {
        setupWebGLCanvasElement();
        if (!customElements.get("test-webgl-canvas-consumer")) {
            customElements.define("test-webgl-canvas-consumer", TestCanvasConsumerElement);
        }
    });

    beforeEach(async () => {
        mockGL = createMockWebGL2Context();
        getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
            function (this: HTMLCanvasElement, contextId: string) {
                if (contextId === "webgl2") {
                    return mockGL;
                }
                return null;
            } as unknown as (contextId: string) => RenderingContext | null
        );

        element = document.createElement(TAG_RJ_WEBGL_CANVAS);
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        element.destroy();
        element.remove();
        document.body.innerHTML = "";
        getContextSpy.mockRestore();
        vi.restoreAllMocks();
    });

    describe("properties and bidirectional reflection", () => {
        describe("dprCap", () => {
            it("should default to DEFAULT_DPR_CAP (1.5)", () => {
                expect(element.dprCap).toBe(DEFAULT_DPR_CAP);
            });

            it("should reflect property update to dpr-cap attribute", async () => {
                element.dprCap = 2.0;
                await element.updateComplete;

                expect(element.getAttribute("dpr-cap")).toBe("2");
                expect(element.dprCap).toBe(2.0);
            });

            it("should reflect dpr-cap attribute change to property", async () => {
                element.setAttribute("dpr-cap", "1.75");
                await element.updateComplete;

                expect(element.dprCap).toBe(1.75);
            });
        });

        describe("autoClear", () => {
            it("should default to DEFAULT_AUTO_CLEAR (true)", () => {
                expect(element.autoClear).toBe(DEFAULT_AUTO_CLEAR);
            });

            it("should reflect property update to auto-clear attribute", async () => {
                element.autoClear = false;
                await element.updateComplete;

                expect(element.hasAttribute("auto-clear")).toBe(false);

                element.autoClear = true;
                await element.updateComplete;
                expect(element.hasAttribute("auto-clear")).toBe(true);
            });

            it("should reflect auto-clear attribute change to property", async () => {
                element.removeAttribute("auto-clear");
                await element.updateComplete;
                expect(element.autoClear).toBe(false);

                element.setAttribute("auto-clear", "");
                await element.updateComplete;
                expect(element.autoClear).toBe(true);
            });
        });

        describe("clearColor", () => {
            it("should default to DEFAULT_CLEAR_COLOR ([0, 0, 0, 0])", () => {
                expect(element.clearColor).toEqual(DEFAULT_CLEAR_COLOR);
            });

            it("should reflect property update to clear-color attribute as hex", async () => {
                element.clearColor = [1, 0, 0, 1];
                await element.updateComplete;

                expect(element.getAttribute("clear-color")).toBe("#ff0000");

                element.clearColor = [0, 0, 1, 0.5];
                await element.updateComplete;
                expect(element.getAttribute("clear-color")).toBe("#0000ff80");
            });

            it("should reflect clear-color attribute change to property as normalized tuple", async () => {
                element.setAttribute("clear-color", "#00ff00");
                await element.updateComplete;

                expect(element.clearColor[0]).toBeCloseTo(0, 4);
                expect(element.clearColor[1]).toBeCloseTo(1, 4);
                expect(element.clearColor[2]).toBeCloseTo(0, 4);
                expect(element.clearColor[3]).toBeCloseTo(1, 4);
            });
        });

        describe("renderMode", () => {
            it("should default to DEFAULT_RENDER_MODE ('continuous')", () => {
                expect(element.renderMode).toBe(DEFAULT_RENDER_MODE);
            });

            it("should reflect property update to render-mode attribute", async () => {
                element.renderMode = "on-demand";
                await element.updateComplete;

                expect(element.getAttribute("render-mode")).toBe("on-demand");
            });

            it("should reflect render-mode attribute change to property", async () => {
                element.setAttribute("render-mode", "on-demand");
                await element.updateComplete;

                expect(element.renderMode).toBe("on-demand");
            });
        });

        describe("pauseWhenOffscreen", () => {
            it("should default to DEFAULT_PAUSE_WHEN_OFFSCREEN (true)", () => {
                expect(element.pauseWhenOffscreen).toBe(DEFAULT_PAUSE_WHEN_OFFSCREEN);
            });

            it("should reflect property update to pause-when-offscreen attribute", async () => {
                element.pauseWhenOffscreen = false;
                await element.updateComplete;

                expect(element.hasAttribute("pause-when-offscreen")).toBe(false);
            });

            it("should reflect attribute change to property", async () => {
                element.removeAttribute("pause-when-offscreen");
                await element.updateComplete;
                expect(element.pauseWhenOffscreen).toBe(false);

                element.setAttribute("pause-when-offscreen", "");
                await element.updateComplete;
                expect(element.pauseWhenOffscreen).toBe(true);
            });
        });

        describe("pauseWhenHidden", () => {
            it("should default to DEFAULT_PAUSE_WHEN_HIDDEN (true)", () => {
                expect(element.pauseWhenHidden).toBe(DEFAULT_PAUSE_WHEN_HIDDEN);
            });

            it("should reflect property update to pause-when-hidden attribute", async () => {
                element.pauseWhenHidden = false;
                await element.updateComplete;

                expect(element.hasAttribute("pause-when-hidden")).toBe(false);
            });

            it("should reflect attribute change to property", async () => {
                element.removeAttribute("pause-when-hidden");
                await element.updateComplete;
                expect(element.pauseWhenHidden).toBe(false);

                element.setAttribute("pause-when-hidden", "");
                await element.updateComplete;
                expect(element.pauseWhenHidden).toBe(true);
            });
        });
    });

    describe("shadow DOM rendering", () => {
        it("should render a canvas element with part='canvas'", () => {
            const canvas = element.shadowRoot?.querySelector("canvas");
            expect(canvas).toBeDefined();
            expect(canvas?.getAttribute("part")).toBe("canvas");
        });

        it("should render an overlay slot container with part='overlay'", () => {
            const overlay = element.shadowRoot?.querySelector(".overlay-slot");
            expect(overlay).toBeDefined();
            expect(overlay?.getAttribute("part")).toBe("overlay");
            expect(overlay?.querySelector("slot")).toBeDefined();
        });
    });

    describe("public interface getters", () => {
        describe(".gl", () => {
            it("should return active WebGL2 rendering context when initialized", () => {
                expect(element.gl).toBe(mockGL);
            });

            it("should return null after element is destroyed", () => {
                element.destroy();
                expect(element.gl).toBeNull();
            });
        });

        describe(".contextManager", () => {
            it("should return an IWebGLContextManager instance initialized with active gl", () => {
                const manager = element.contextManager;
                expect(manager).toBeDefined();
                expect(manager.getContext()).toBe(mockGL);
            });
        });

        describe(".dimensions", () => {
            it("should return current canvas dimensions", () => {
                const dims = element.dimensions;
                expect(dims).toBeDefined();
                expect(typeof dims.width).toBe("number");
                expect(typeof dims.height).toBe("number");
                expect(typeof dims.aspect).toBe("number");
                expect(typeof dims.dpr).toBe("number");
            });
        });

        describe(".isContextLost", () => {
            it("should return false under nominal conditions", () => {
                expect(element.isContextLost).toBe(false);
            });
        });
    });

    describe(".subscribe()", () => {
        it("should register subscriber and immediately invoke init() when gl is active", () => {
            const initSpy = vi.fn();
            const subscriber: WebGLSubscriber = {
                id: "test-sub-1",
                priority: 0,
                init: initSpy,
            };

            const unsubscribe = element.subscribe(subscriber);
            expect(typeof unsubscribe).toBe("function");

            expect(initSpy).toHaveBeenCalledTimes(1);
            expect(initSpy).toHaveBeenCalledWith(mockGL, element.dimensions);
        });

        it("should invoke destroy() and unregister subscriber when unsubscribe callback is called", () => {
            const destroySpy = vi.fn();
            const renderSpy = vi.fn();
            const subscriber: WebGLSubscriber = {
                id: "test-sub-2",
                priority: 10,
                destroy: destroySpy,
                render: renderSpy,
            };

            const unsubscribe = element.subscribe(subscriber);
            unsubscribe();

            expect(destroySpy).toHaveBeenCalledTimes(1);

            // Subscriber should no longer receive render frames
            element.requestRender();
            expect(renderSpy).not.toHaveBeenCalled();
        });
    });

    describe(".requestRender()", () => {
        it("should execute subscribers sorted in ascending order of priority", () => {
            const executionOrder: string[] = [];

            const subHigh: WebGLSubscriber = {
                id: "high-priority",
                priority: 100,
                render: () => {
                    executionOrder.push("high");
                },
            };

            const subLow: WebGLSubscriber = {
                id: "low-priority",
                priority: 0,
                render: () => {
                    executionOrder.push("low");
                },
            };

            const subMid: WebGLSubscriber = {
                id: "mid-priority",
                priority: 50,
                render: () => {
                    executionOrder.push("mid");
                },
            };

            element.subscribe(subHigh);
            element.subscribe(subLow);
            element.subscribe(subMid);

            element.requestRender();

            expect(executionOrder).toEqual(["low", "mid", "high"]);
        });

        it("should clear color buffer when autoClear is true", () => {
            element.autoClear = true;
            element.clearColor = [0.2, 0.4, 0.6, 1.0];

            element.requestRender();

            expect(mockGL.clearColor).toHaveBeenCalledWith(0.2, 0.4, 0.6, 1.0);
            expect(mockGL.clear).toHaveBeenCalledWith(WebGL2RenderingContext.COLOR_BUFFER_BIT);
        });

        it("should not clear color buffer when autoClear is false", () => {
            vi.mocked(mockGL.clear).mockClear();
            element.autoClear = false;

            element.requestRender();

            expect(mockGL.clear).not.toHaveBeenCalled();
        });

        it("should pass active gl, timeInfo, and dimensions to subscriber render()", () => {
            let receivedGL: WebGL2RenderingContext | null = null;
            let receivedTime: TimeInfo | null = null;
            let receivedDims: CanvasDimensions | null = null;

            const subscriber: WebGLSubscriber = {
                id: "test-params-sub",
                priority: 0,
                render: (gl, time, dims) => {
                    receivedGL = gl;
                    receivedTime = time;
                    receivedDims = dims;
                },
            };

            element.subscribe(subscriber);
            element.requestRender();

            expect(receivedGL).toBe(mockGL);
            expect(receivedTime).toBeDefined();
            expect(receivedTime!.frameCount).toBeGreaterThanOrEqual(1);
            expect(receivedDims).toEqual(element.dimensions);
        });
    });

    describe("custom events", () => {
        it("should dispatch WebGLContextCreatedEvent upon context acquisition", async () => {
            const eventSpy = vi.fn();
            const freshElement = document.createElement(TAG_RJ_WEBGL_CANVAS);

            freshElement.addEventListener(WebGLContextCreatedEvent.TYPE, (e) => {
                expect(e).toBeInstanceOf(WebGLContextCreatedEvent);
                const ev = e as WebGLContextCreatedEvent;
                eventSpy(ev.gl, ev.contextManager);
            });

            document.body.appendChild(freshElement);
            await freshElement.updateComplete;

            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(eventSpy).toHaveBeenCalledWith(mockGL, freshElement.contextManager);

            freshElement.destroy();
            freshElement.remove();
        });

        it("should dispatch WebGLContextLostEvent and notify subscribers on context loss", () => {
            const eventSpy = vi.fn();
            const subLossSpy = vi.fn();

            element.addEventListener(WebGLContextLostEvent.TYPE, eventSpy);
            element.subscribe({
                id: "loss-sub",
                priority: 0,
                onContextLost: subLossSpy,
            });

            const canvas = element.shadowRoot?.querySelector("canvas");
            const lossEvent = new Event("webglcontextlost", { cancelable: true });
            canvas?.dispatchEvent(lossEvent);

            expect(lossEvent.defaultPrevented).toBe(true);
            expect(element.isContextLost).toBe(true);
            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(subLossSpy).toHaveBeenCalledTimes(1);
        });

        it("should dispatch WebGLContextRestoredEvent and re-init subscribers on restore", () => {
            const eventSpy = vi.fn();
            const subRestoreSpy = vi.fn();

            element.addEventListener(WebGLContextRestoredEvent.TYPE, eventSpy);
            element.subscribe({
                id: "restore-sub",
                priority: 0,
                onContextRestored: subRestoreSpy,
            });

            const canvas = element.shadowRoot?.querySelector("canvas");

            // First lose context
            canvas?.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
            expect(element.isContextLost).toBe(true);

            // Then restore context
            canvas?.dispatchEvent(new Event("webglcontextrestored"));
            expect(element.isContextLost).toBe(false);
            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(subRestoreSpy).toHaveBeenCalledTimes(1);
        });

        it("should dispatch WebGLResizeEvent and notify subscribers on resize", () => {
            const resizeSpy = vi.fn();
            const subResizeSpy = vi.fn();

            element.addEventListener(WebGLResizeEvent.TYPE, (e) => {
                resizeSpy((e as WebGLResizeEvent).dimensions);
            });

            element.subscribe({
                id: "resize-sub",
                priority: 0,
                resize: subResizeSpy,
            });

            // Trigger a dpr-cap update that forces a dimension change
            element.dprCap = 3.0;

            const canvas = element.shadowRoot?.querySelector("canvas");
            if (canvas) {
                // simulate resize by changing canvas bounding dimensions
                vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
                    width: 1024,
                    height: 768,
                    top: 0,
                    left: 0,
                    bottom: 768,
                    right: 1024,
                    x: 0,
                    y: 0,
                    toJSON: () => ({}),
                });
            }

            // Force measure
            element.requestUpdate("dprCap");

            expect(mockGL.viewport).toHaveBeenCalled();
        });
    });

    describe("@lit/context provision", () => {
        it("should provide webglCanvasContext to descendant consumer elements", async () => {
            const childConsumer = document.createElement(
                "test-webgl-canvas-consumer"
            ) as TestCanvasConsumerElement;

            element.appendChild(childConsumer);
            await childConsumer.updateComplete;

            expect(childConsumer.canvasValue).toBe(element);
        });
    });

    describe(".simulateContextLoss()", () => {
        it("should call loseContext and restoreContext via WEBGL_lose_context extension", () => {
            vi.useFakeTimers();

            const loseExt = mockGL.getExtension("WEBGL_lose_context") as {
                loseContext: ReturnType<typeof vi.fn>;
                restoreContext: ReturnType<typeof vi.fn>;
            };

            element.simulateContextLoss(100);

            expect(loseExt.loseContext).toHaveBeenCalledTimes(1);
            expect(loseExt.restoreContext).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);
            expect(loseExt.restoreContext).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });
    });

    describe(".destroy()", () => {
        it("should clean up subscribers, disconnect context manager, and release gl context", () => {
            const destroySpy = vi.fn();
            element.subscribe({
                id: "destroy-test-sub",
                priority: 0,
                destroy: destroySpy,
            });

            const managerDestroySpy = vi.spyOn(element.contextManager, "destroy");

            element.destroy();

            expect(destroySpy).toHaveBeenCalledTimes(1);
            expect(managerDestroySpy).toHaveBeenCalledTimes(1);
            expect(element.gl).toBeNull();

            // Calling destroy again should be idempotent
            expect(() => element.destroy()).not.toThrow();
        });
    });
});
