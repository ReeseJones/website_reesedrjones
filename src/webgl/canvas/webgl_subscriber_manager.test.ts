import { describe, it, expect, beforeEach, vi } from "vitest";
import { WebGLSubscriberManager } from "./webgl_subscriber_manager";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import type { CanvasDimensions, TimeInfo } from "./canvas_types";
import type { WebGLSubscriber } from "./subscriber_types";

describe("WebGLSubscriberManager", () => {
    let manager: WebGLSubscriberManager;
    let mockGl: WebGL2RenderingContext;
    let dummyDims: CanvasDimensions;
    let dummyTime: TimeInfo;

    beforeEach(() => {
        manager = new WebGLSubscriberManager();
        mockGl = createMockWebGL2Context();
        dummyDims = {
            width: 800,
            height: 600,
            cssWidth: 400,
            cssHeight: 300,
            dpr: 2,
            aspect: 800 / 600,
        };
        dummyTime = {
            time: 1.5,
            dt: 0.016,
            frameCount: 100,
        };
    });

    describe(".subscriberCount", () => {
        it("should return 0 initially", () => {
            expect(manager.subscriberCount).toBe(0);
        });

        it("should track the number of active subscribers", () => {
            const unsub1 = manager.subscribe({ priority: 0 });
            const unsub2 = manager.subscribe({ priority: 1 });
            expect(manager.subscriberCount).toBe(2);

            unsub1();
            expect(manager.subscriberCount).toBe(1);

            unsub2();
            expect(manager.subscriberCount).toBe(0);
        });
    });

    describe(".subscribe()", () => {
        it("should register a subscriber and return an idempotent unregister cleanup callback", () => {
            const destroySpy = vi.fn();
            const subscriber: WebGLSubscriber = {
                priority: 0,
                destroy: destroySpy,
            };

            const unregister = manager.subscribe(subscriber);
            expect(manager.subscriberCount).toBe(1);

            // First unregister call invokes destroy and removes subscriber
            unregister();
            expect(manager.subscriberCount).toBe(0);
            expect(destroySpy).toHaveBeenCalledTimes(1);

            // Second unregister call is idempotent
            unregister();
            expect(manager.subscriberCount).toBe(0);
            expect(destroySpy).toHaveBeenCalledTimes(1);
        });

        it("should throw an error when attempting to double-subscribe the exact same subscriber reference", () => {
            const subscriber: WebGLSubscriber = {
                priority: 0,
            };

            manager.subscribe(subscriber);

            expect(() => manager.subscribe(subscriber)).toThrow(
                "Cannot subscribe: WebGLSubscriber is already subscribed."
            );
        });

        it("should allow re-subscribing a subscriber after it has been unregistered", () => {
            const subscriber: WebGLSubscriber = { priority: 0 };
            const unregister = manager.subscribe(subscriber);
            expect(manager.subscriberCount).toBe(1);

            unregister();
            expect(manager.subscriberCount).toBe(0);

            expect(() => manager.subscribe(subscriber)).not.toThrow();
            expect(manager.subscriberCount).toBe(1);
        });

        it("should allow subscribing two distinct object instances with identical priorities", () => {
            const subA: WebGLSubscriber = { priority: 0 };
            const subB: WebGLSubscriber = { priority: 0 };

            expect(() => {
                manager.subscribe(subA);
                manager.subscribe(subB);
            }).not.toThrow();

            expect(manager.subscriberCount).toBe(2);
        });

        it("should not call init immediately if notifyInit has not yet been invoked", () => {
            const initSpy = vi.fn();
            manager.subscribe({
                priority: 0,
                init: initSpy,
            });

            expect(initSpy).not.toHaveBeenCalled();
        });

        it("should eagerly invoke init(gl, dims) immediately when subscribed after notifyInit was already called", () => {
            manager.notifyInit(mockGl, dummyDims);

            const initSpy = vi.fn();
            const eagerSub: WebGLSubscriber = {
                priority: 0,
                init: initSpy,
            };

            manager.subscribe(eagerSub);

            expect(initSpy).toHaveBeenCalledTimes(1);
            expect(initSpy).toHaveBeenCalledWith(mockGl, dummyDims);
        });

        it("should safely handle subscribers without destroy callback during unregister", () => {
            const subscriber: WebGLSubscriber = {
                priority: 0,
            };

            const unregister = manager.subscribe(subscriber);
            expect(() => unregister()).not.toThrow();
            expect(manager.subscriberCount).toBe(0);
        });
    });

    describe(".notifyInit()", () => {
        it("should invoke init on all registered subscribers in ascending priority order", () => {
            const order: string[] = [];

            const subHigh: WebGLSubscriber = {
                priority: 100,
                init: () => order.push("high"),
            };
            const subLow: WebGLSubscriber = {
                priority: -10,
                init: () => order.push("low"),
            };
            const subMid: WebGLSubscriber = {
                priority: 5,
                init: () => order.push("mid"),
            };

            manager.subscribe(subHigh);
            manager.subscribe(subLow);
            manager.subscribe(subMid);

            manager.notifyInit(mockGl, dummyDims);

            expect(order).toEqual(["low", "mid", "high"]);
        });

        it("should safely handle subscribers without an init callback", () => {
            manager.subscribe({ priority: 0 });
            expect(() => manager.notifyInit(mockGl, dummyDims)).not.toThrow();
        });
    });

    describe(".notifyRender()", () => {
        it("should invoke render on all subscribers in ascending priority order with gl, timeInfo, and dims", () => {
            const order: string[] = [];
            const renderCalls: Array<{ gl: WebGL2RenderingContext; time: TimeInfo; dims: CanvasDimensions }> = [];

            const sub1: WebGLSubscriber = {
                priority: 1,
                render: (gl, time, dims) => {
                    order.push("render-1");
                    renderCalls.push({ gl, time, dims });
                },
            };
            const sub0: WebGLSubscriber = {
                priority: 0,
                render: (gl, time, dims) => {
                    order.push("render-0");
                    renderCalls.push({ gl, time, dims });
                },
            };

            manager.subscribe(sub1);
            manager.subscribe(sub0);

            manager.notifyRender(mockGl, dummyTime, dummyDims);

            expect(order).toEqual(["render-0", "render-1"]);
            expect(renderCalls).toHaveLength(2);
            expect(renderCalls[0]).toEqual({
                gl: mockGl,
                time: dummyTime,
                dims: dummyDims,
            });
        });

        it("should safely handle subscribers without a render callback", () => {
            manager.subscribe({ priority: 0 });
            expect(() => manager.notifyRender(mockGl, dummyTime, dummyDims)).not.toThrow();
        });
    });

    describe(".notifyResize()", () => {
        it("should invoke resize on all subscribers in ascending priority order with gl and dimensions", () => {
            const order: string[] = [];
            const resizeCalls: Array<{ gl: WebGL2RenderingContext; dims: CanvasDimensions }> = [];

            const newDims: CanvasDimensions = {
                width: 1920,
                height: 1080,
                cssWidth: 960,
                cssHeight: 540,
                dpr: 2,
                aspect: 1920 / 1080,
            };

            const subB: WebGLSubscriber = {
                priority: 10,
                resize: (gl, dims) => {
                    order.push("b");
                    resizeCalls.push({ gl, dims });
                },
            };
            const subA: WebGLSubscriber = {
                priority: 2,
                resize: (gl, dims) => {
                    order.push("a");
                    resizeCalls.push({ gl, dims });
                },
            };

            manager.subscribe(subB);
            manager.subscribe(subA);

            manager.notifyResize(mockGl, newDims);

            expect(order).toEqual(["a", "b"]);
            expect(resizeCalls).toHaveLength(2);
            expect(resizeCalls[0].dims).toEqual(newDims);
            expect(resizeCalls[0].gl).toBe(mockGl);
        });

        it("should safely handle subscribers without a resize callback", () => {
            manager.subscribe({ priority: 0 });
            expect(() => manager.notifyResize(mockGl, dummyDims)).not.toThrow();
        });
    });

    describe(".notifyContextLost()", () => {
        it("should invoke onContextLost on all subscribers in ascending priority order", () => {
            const order: string[] = [];
            const dummyEvent = { type: "webglcontextlost" } as unknown as WebGLContextEvent;

            const sub2: WebGLSubscriber = {
                priority: 20,
                onContextLost: () => order.push("sub2"),
            };
            const sub1: WebGLSubscriber = {
                priority: 10,
                onContextLost: () => order.push("sub1"),
            };

            manager.subscribe(sub2);
            manager.subscribe(sub1);

            manager.notifyContextLost(dummyEvent);

            expect(order).toEqual(["sub1", "sub2"]);
        });

        it("should clear internal gl context reference so subsequent subscriptions do not eagerly init", () => {
            manager.notifyInit(mockGl, dummyDims);

            const dummyEvent = { type: "webglcontextlost" } as unknown as WebGLContextEvent;
            manager.notifyContextLost(dummyEvent);

            const postLossInitSpy = vi.fn();
            manager.subscribe({
                priority: 0,
                init: postLossInitSpy,
            });

            expect(postLossInitSpy).not.toHaveBeenCalled();
        });

        it("should safely handle subscribers without an onContextLost callback", () => {
            manager.subscribe({ priority: 0 });
            const dummyEvent = { type: "webglcontextlost" } as unknown as WebGLContextEvent;
            expect(() => manager.notifyContextLost(dummyEvent)).not.toThrow();
        });
    });

    describe(".notifyContextRestored()", () => {
        it("should invoke onContextRestored on all subscribers in ascending priority order with gl and dims", () => {
            const order: string[] = [];
            const restoreCalls: Array<{ gl: WebGL2RenderingContext; dims: CanvasDimensions }> = [];

            const subHigh: WebGLSubscriber = {
                priority: 50,
                onContextRestored: (gl, dims) => {
                    order.push("high");
                    restoreCalls.push({ gl, dims });
                },
            };
            const subLow: WebGLSubscriber = {
                priority: 5,
                onContextRestored: (gl, dims) => {
                    order.push("low");
                    restoreCalls.push({ gl, dims });
                },
            };

            manager.subscribe(subHigh);
            manager.subscribe(subLow);

            manager.notifyContextRestored(mockGl, dummyDims);

            expect(order).toEqual(["low", "high"]);
            expect(restoreCalls).toHaveLength(2);
            expect(restoreCalls[0].gl).toBe(mockGl);
            expect(restoreCalls[0].dims).toEqual(dummyDims);
        });

        it("should re-enable eager init on subsequent subscribe calls", () => {
            const dummyEvent = { type: "webglcontextlost" } as unknown as WebGLContextEvent;
            manager.notifyContextLost(dummyEvent);

            manager.notifyContextRestored(mockGl, dummyDims);

            const postRestoreInitSpy = vi.fn();
            manager.subscribe({
                priority: 0,
                init: postRestoreInitSpy,
            });

            expect(postRestoreInitSpy).toHaveBeenCalledTimes(1);
            expect(postRestoreInitSpy).toHaveBeenCalledWith(mockGl, dummyDims);
        });

        it("should safely handle subscribers without an onContextRestored callback", () => {
            manager.subscribe({ priority: 0 });
            expect(() => manager.notifyContextRestored(mockGl, dummyDims)).not.toThrow();
        });
    });

    describe(".destroy()", () => {
        it("should invoke destroy on all subscribers in priority order and clear the registry", () => {
            const order: string[] = [];

            const sub2: WebGLSubscriber = {
                priority: 2,
                destroy: () => order.push("sub2"),
            };
            const sub1: WebGLSubscriber = {
                priority: 1,
                destroy: () => order.push("sub1"),
            };

            manager.subscribe(sub2);
            manager.subscribe(sub1);
            expect(manager.subscriberCount).toBe(2);

            manager.destroy();

            expect(order).toEqual(["sub1", "sub2"]);
            expect(manager.subscriberCount).toBe(0);
        });

        it("should reset context and dimensions so subsequent subscriptions do not eagerly init", () => {
            manager.notifyInit(mockGl, dummyDims);
            manager.destroy();

            const initSpy = vi.fn();
            manager.subscribe({
                priority: 0,
                init: initSpy,
            });

            expect(initSpy).not.toHaveBeenCalled();
        });

        it("should be idempotent when called multiple times", () => {
            manager.subscribe({ priority: 0 });
            expect(() => {
                manager.destroy();
                manager.destroy();
            }).not.toThrow();
            expect(manager.subscriberCount).toBe(0);
        });
    });
});
