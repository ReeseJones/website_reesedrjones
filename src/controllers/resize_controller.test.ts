// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ReactiveControllerHost } from "lit";
import { ResizeController } from "./resize_controller";
import type { ViewportDimensions, ResizeControllerOptions } from "./resize_controller_types";
import {
    DEFAULT_ASPECT_RATIO,
    DEFAULT_DEVICE_PIXEL_RATIO,
    DEFAULT_FALLBACK_DIMENSION,
    MIN_VIEWPORT_DIMENSION,
} from "./resize_controller_constants";

class MockHost implements ReactiveControllerHost {
    public updateComplete = Promise.resolve(true);
    public readonly controllers: unknown[] = [];
    public requestUpdate = vi.fn();

    public addController(controller: unknown): void {
        this.controllers.push(controller);
    }

    public removeController(controller: unknown): void {
        const index = this.controllers.indexOf(controller);
        if (index !== -1) {
            this.controllers.splice(index, 1);
        }
    }
}

class MockElementHost extends HTMLElement implements ReactiveControllerHost {
    public updateComplete = Promise.resolve(true);
    public readonly controllers: unknown[] = [];
    public requestUpdate = vi.fn();

    public addController(controller: unknown): void {
        this.controllers.push(controller);
    }

    public removeController(controller: unknown): void {
        const index = this.controllers.indexOf(controller);
        if (index !== -1) {
            this.controllers.splice(index, 1);
        }
    }
}

describe("ResizeController", () => {
    let host: MockHost;
    let targetElement: HTMLDivElement;
    let originalResizeObserver: typeof ResizeObserver | undefined;
    let originalDevicePixelRatio: number | undefined;

    let observerInstances: Array<{
        callback: ResizeObserverCallback;
        observe: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
        unobserve: ReturnType<typeof vi.fn>;
    }> = [];

    beforeEach(() => {
        host = new MockHost();
        targetElement = document.createElement("div");
        document.body.appendChild(targetElement);

        observerInstances = [];
        originalResizeObserver = globalThis.ResizeObserver;
        originalDevicePixelRatio = window.devicePixelRatio;

        // Custom ResizeObserver fake that captures callbacks
        class FakeResizeObserver implements ResizeObserver {
            public callback: ResizeObserverCallback;
            public observe = vi.fn();
            public disconnect = vi.fn();
            public unobserve = vi.fn();

            public constructor(cb: ResizeObserverCallback) {
                this.callback = cb;
                observerInstances.push(this);
            }
        }

        globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
        targetElement.remove();
        document.body.innerHTML = "";
        globalThis.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
        if (originalDevicePixelRatio !== undefined) {
            Object.defineProperty(window, "devicePixelRatio", {
                value: originalDevicePixelRatio,
                writable: true,
                configurable: true,
            });
        }
        vi.restoreAllMocks();
    });

    describe("constructor", () => {
        it("should register controller with host via host.addController()", () => {
            const controller = new ResizeController(host);
            expect(host.controllers).toContain(controller);
        });

        it("should initialize default fallback dimensions", () => {
            const controller = new ResizeController(host);
            expect(controller.dimensions).toEqual({
                width: DEFAULT_FALLBACK_DIMENSION,
                height: DEFAULT_FALLBACK_DIMENSION,
                cssWidth: DEFAULT_FALLBACK_DIMENSION,
                cssHeight: DEFAULT_FALLBACK_DIMENSION,
                devicePixelRatio: DEFAULT_DEVICE_PIXEL_RATIO,
                aspect: DEFAULT_ASPECT_RATIO,
            });
        });
    });

    describe("hostConnected() and hostDisconnected()", () => {
        it("should attach ResizeObserver and observe target element upon connection", () => {
            const controller = new ResizeController(host, { target: targetElement });
            controller.hostConnected();

            expect(observerInstances).toHaveLength(1);
            expect(observerInstances[0].observe).toHaveBeenCalledWith(targetElement);
        });

        it("should measure immediate dimensions upon connection", () => {
            vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
                width: 800,
                height: 600,
                top: 0,
                left: 0,
                bottom: 600,
                right: 800,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });

            const onResize = vi.fn();
            const controller = new ResizeController(host, { target: targetElement, onResize });
            controller.hostConnected();

            expect(onResize).toHaveBeenCalledTimes(1);
            expect(controller.dimensions.cssWidth).toBe(800);
            expect(controller.dimensions.cssHeight).toBe(600);
            expect(host.requestUpdate).toHaveBeenCalledTimes(1);
        });

        it("should disconnect and nullify ResizeObserver upon disconnection", () => {
            const controller = new ResizeController(host, { target: targetElement });
            controller.hostConnected();

            const observerInstance = observerInstances[0];
            expect(observerInstance).toBeDefined();

            controller.hostDisconnected();
            expect(observerInstance.disconnect).toHaveBeenCalledTimes(1);

            // Reconnecting should establish a fresh observer
            controller.hostConnected();
            expect(observerInstances).toHaveLength(2);
        });

        it("should re-measure and notify on re-connection even if dimensions are identical", () => {
            vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
                width: 400,
                height: 300,
                top: 0,
                left: 0,
                bottom: 300,
                right: 400,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });

            const onResize = vi.fn();
            const controller = new ResizeController(host, { target: targetElement, onResize });

            controller.hostConnected();
            expect(onResize).toHaveBeenCalledTimes(1);

            controller.hostDisconnected();
            controller.hostConnected();
            // hasMeasured reset allows re-notification upon re-attaching
            expect(onResize).toHaveBeenCalledTimes(2);
        });
    });

    describe("measureImmediate()", () => {
        it("should return existing dimensions without change when no target is resolvable", () => {
            const controller = new ResizeController(host); // host is MockHost (no getBoundingClientRect)
            const initialDims = controller.dimensions;

            const returned = controller.measureImmediate();
            expect(returned).toBe(initialDims);
            expect(host.requestUpdate).not.toHaveBeenCalled();
        });

        it("should fallback to host element when options.target is omitted and host is HTMLElement", () => {
            if (!customElements.get("mock-element-host")) {
                customElements.define("mock-element-host", MockElementHost);
            }
            const elHost = document.createElement("mock-element-host") as MockElementHost;
            document.body.appendChild(elHost);

            vi.spyOn(elHost, "getBoundingClientRect").mockReturnValue({
                width: 500,
                height: 250,
                top: 0,
                left: 0,
                bottom: 250,
                right: 500,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });

            const controller = new ResizeController(elHost);
            const dims = controller.measureImmediate();

            expect(dims.cssWidth).toBe(500);
            expect(dims.cssHeight).toBe(250);
            expect(dims.aspect).toBe(2);

            elHost.remove();
        });

        it("should calculate backing-store width, height, and aspect with devicePixelRatio", () => {
            Object.defineProperty(window, "devicePixelRatio", {
                value: 2,
                writable: true,
                configurable: true,
            });

            vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
                width: 640,
                height: 360,
                top: 0,
                left: 0,
                bottom: 360,
                right: 640,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });

            const controller = new ResizeController(host, { target: targetElement });
            const dims = controller.measureImmediate();

            expect(dims.cssWidth).toBe(640);
            expect(dims.cssHeight).toBe(360);
            expect(dims.devicePixelRatio).toBe(2);
            expect(dims.width).toBe(1280);
            expect(dims.height).toBe(720);
            expect(dims.aspect).toBeCloseTo(1280 / 720, 4);
        });

        it("should cap devicePixelRatio when dprCap is lower than raw DPR", () => {
            Object.defineProperty(window, "devicePixelRatio", {
                value: 3,
                writable: true,
                configurable: true,
            });

            vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
                width: 1000,
                height: 500,
                top: 0,
                left: 0,
                bottom: 500,
                right: 1000,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });

            const controller = new ResizeController(host, {
                target: targetElement,
                dprCap: 1.5,
            });
            const dims = controller.measureImmediate();

            expect(dims.devicePixelRatio).toBe(1.5);
            expect(dims.width).toBe(1500);
            expect(dims.height).toBe(750);
        });

        it("should ignore dprCap when dprCap is higher than raw DPR", () => {
            Object.defineProperty(window, "devicePixelRatio", {
                value: 1.25,
                writable: true,
                configurable: true,
            });

            vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
                width: 400,
                height: 200,
                top: 0,
                left: 0,
                bottom: 200,
                right: 400,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });

            const controller = new ResizeController(host, {
                target: targetElement,
                dprCap: 2.0,
            });
            const dims = controller.measureImmediate();

            expect(dims.devicePixelRatio).toBe(1.25);
            expect(dims.width).toBe(500);
            expect(dims.height).toBe(250);
        });

        it("should ignore invalid dprCap values (zero, negative, or NaN)", () => {
            Object.defineProperty(window, "devicePixelRatio", {
                value: 2,
                writable: true,
                configurable: true,
            });

            vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
                width: 300,
                height: 200,
                top: 0,
                left: 0,
                bottom: 200,
                right: 300,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });

            const controller = new ResizeController(host, {
                target: targetElement,
                dprCap: -1,
            });
            const dims = controller.measureImmediate();

            expect(dims.devicePixelRatio).toBe(2);
            expect(dims.width).toBe(600);
        });

        it("should clamp zero or negative dimensions to MIN_VIEWPORT_DIMENSION", () => {
            vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
                width: 0,
                height: 0,
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });

            const controller = new ResizeController(host, { target: targetElement });
            const dims = controller.measureImmediate();

            expect(dims.cssWidth).toBe(0);
            expect(dims.cssHeight).toBe(0);
            expect(dims.width).toBe(MIN_VIEWPORT_DIMENSION);
            expect(dims.height).toBe(MIN_VIEWPORT_DIMENSION);
            expect(dims.aspect).toBe(1);
        });

        it("should not invoke onResize or requestUpdate if measured dimensions did not change", () => {
            vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
                width: 500,
                height: 500,
                top: 0,
                left: 0,
                bottom: 500,
                right: 500,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });

            const onResize = vi.fn();
            const controller = new ResizeController(host, { target: targetElement, onResize });

            controller.measureImmediate();
            expect(onResize).toHaveBeenCalledTimes(1);
            expect(host.requestUpdate).toHaveBeenCalledTimes(1);

            // Second measure with identical dimensions
            controller.measureImmediate();
            expect(onResize).toHaveBeenCalledTimes(1);
            expect(host.requestUpdate).toHaveBeenCalledTimes(1);
        });
    });

    describe("ResizeObserver integration", () => {
        it("should trigger measureImmediate when ResizeObserver callback fires", () => {
            let width = 300;
            let height = 200;

            vi.spyOn(targetElement, "getBoundingClientRect").mockImplementation(() => ({
                width,
                height,
                top: 0,
                left: 0,
                bottom: height,
                right: width,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            }));

            const onResize = vi.fn();
            const controller = new ResizeController(host, { target: targetElement, onResize });
            controller.hostConnected();

            expect(onResize).toHaveBeenCalledTimes(1);
            expect(controller.dimensions.width).toBe(300);

            // Resize the element and trigger observer callback
            width = 600;
            height = 400;

            const observer = observerInstances[0];
            observer.callback([], observer as unknown as ResizeObserver);

            expect(onResize).toHaveBeenCalledTimes(2);
            expect(controller.dimensions.width).toBe(600);
            expect(controller.dimensions.height).toBe(400);
        });
    });
});
