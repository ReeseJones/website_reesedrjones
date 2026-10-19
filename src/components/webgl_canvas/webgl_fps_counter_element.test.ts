import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { LitElement } from "lit";
import { ContextProvider } from "@lit/context";
import {
    webglCanvasContext,
    type IWebGLCanvasContext,
    type WebGLCanvasMetrics,
} from "../../scene/elements/webgl_canvas_element_types";
import { createMockContextManager } from "../../testing/mocks/mock_context_manager";
import {
    WebGLFpsCounterElement,
    setupWebGLFpsCounterElement,
} from "./webgl_fps_counter_element";
import {
    TAG_RJ_WEBGL_FPS_COUNTER,
    DEFAULT_UPDATE_INTERVAL_MS,
} from "./webgl_fps_counter_element_constants";
import { FpsCounterElement, setupFpsCounterElement } from "./fps_counter_element";
import { TAG_RJ_FPS_COUNTER } from "./fps_counter_element_constants";
import type { FpsCounterPosition, FpsCounterDisplayMode } from "./fps_counter_element_types";

class TestCanvasHostElement extends LitElement {
    public canvasProvider = new ContextProvider(this, {
        context: webglCanvasContext,
    });

    public override createRenderRoot(): HTMLElement {
        return this;
    }
}

if (!customElements.get("test-canvas-host")) {
    customElements.define("test-canvas-host", TestCanvasHostElement);
}

interface MockCanvasContextFixture {
    readonly context: IWebGLCanvasContext;
    setMetrics: (metrics: WebGLCanvasMetrics) => void;
}

function createMockCanvasContextFixture(
    initialMetrics: WebGLCanvasMetrics = { fps: 60, frameTimeMs: 16.666 }
): MockCanvasContextFixture {
    const context: IWebGLCanvasContext = {
        gl: null,
        contextManager: createMockContextManager(),
        dimensions: {
            width: 800,
            height: 600,
            cssWidth: 800,
            cssHeight: 600,
            dpr: 1,
            aspect: 800 / 600,
        },
        isContextLost: false,
        metrics: { ...initialMetrics },
        subscribe: vi.fn(() => () => {}),
        requestRender: vi.fn(),
    };

    return {
        context,
        setMetrics: (newMetrics: WebGLCanvasMetrics) => {
            (context as { metrics: WebGLCanvasMetrics }).metrics = { ...newMetrics };
        },
    };
}

describe("WebGLFpsCounterElement", () => {
    beforeEach(() => {
        setupWebGLFpsCounterElement();
        setupFpsCounterElement();
    });

    afterEach(() => {
        document.body.innerHTML = "";
        vi.restoreAllMocks();
    });

    describe("setupWebGLFpsCounterElement()", () => {
        it("should register custom element and child element idempotently without throwing", () => {
            expect(() => {
                setupWebGLFpsCounterElement();
                setupWebGLFpsCounterElement();
            }).not.toThrow();

            expect(customElements.get(TAG_RJ_WEBGL_FPS_COUNTER)).toBe(WebGLFpsCounterElement);
            expect(customElements.get(TAG_RJ_FPS_COUNTER)).toBe(FpsCounterElement);
        });
    });

    describe("constructor defaults", () => {
        it("should initialize default properties correctly", () => {
            const counter = new WebGLFpsCounterElement();
            expect(counter.position).toBe("top-left");
            expect(counter.mode).toBe("both");
            expect(counter.updateIntervalMs).toBe(DEFAULT_UPDATE_INTERVAL_MS);
        });
    });

    describe("Light DOM rendering", () => {
        it("should render into Light DOM and create child <rj-fps-counter>", async () => {
            const counter = document.createElement(TAG_RJ_WEBGL_FPS_COUNTER) as WebGLFpsCounterElement;
            document.body.appendChild(counter);
            await counter.updateComplete;

            expect(counter.shadowRoot).toBeNull();
            const child = counter.querySelector<FpsCounterElement>(TAG_RJ_FPS_COUNTER);
            expect(child).not.toBeNull();
            expect(child).toBeInstanceOf(FpsCounterElement);
        });
    });

    describe("context integration & property forwarding", () => {
        it("should forward initial frameTimeMs, mode, and position to child <rj-fps-counter>", async () => {
            const fixture = createMockCanvasContextFixture({ fps: 60, frameTimeMs: 16.666 });
            const host = document.createElement("test-canvas-host") as TestCanvasHostElement;
            host.canvasProvider.setValue(fixture.context);
            document.body.appendChild(host);

            const counter = document.createElement(TAG_RJ_WEBGL_FPS_COUNTER) as WebGLFpsCounterElement;
            counter.position = "bottom-right";
            counter.mode = "fps";
            host.appendChild(counter);

            await counter.updateComplete;

            const child = counter.querySelector<FpsCounterElement>(TAG_RJ_FPS_COUNTER)!;
            expect(child).not.toBeNull();
            expect(child.frameTimeMs).toBe(16.666);
            expect(child.mode).toBe("fps");
            expect(child.position).toBe("bottom-right");

            await child.updateComplete;
            expect(child.shadowRoot?.querySelector(".badge span.value")?.textContent).toBe("60 FPS");
        });

        it("should reflect updated mode and position properties on child <rj-fps-counter>", async () => {
            const fixture = createMockCanvasContextFixture({ fps: 60, frameTimeMs: 16.666 });
            const host = document.createElement("test-canvas-host") as TestCanvasHostElement;
            host.canvasProvider.setValue(fixture.context);
            document.body.appendChild(host);

            const counter = document.createElement(TAG_RJ_WEBGL_FPS_COUNTER) as WebGLFpsCounterElement;
            host.appendChild(counter);
            await counter.updateComplete;

            const child = counter.querySelector<FpsCounterElement>(TAG_RJ_FPS_COUNTER)!;

            const positions: FpsCounterPosition[] = [
                "top-right",
                "bottom-left",
                "bottom-right",
                "top-left",
            ];
            for (const pos of positions) {
                counter.position = pos;
                await counter.updateComplete;
                expect(child.position).toBe(pos);
            }

            const modes: FpsCounterDisplayMode[] = ["frame-time", "none", "both", "fps"];
            for (const mode of modes) {
                counter.mode = mode;
                await counter.updateComplete;
                expect(child.mode).toBe(mode);
            }
        });

        it("should handle absence of context provider gracefully without throwing", async () => {
            const counter = document.createElement(TAG_RJ_WEBGL_FPS_COUNTER) as WebGLFpsCounterElement;
            document.body.appendChild(counter);
            await counter.updateComplete;

            const child = counter.querySelector<FpsCounterElement>(TAG_RJ_FPS_COUNTER)!;
            expect(child).not.toBeNull();
            expect(child.frameTimeMs).toBeUndefined();

            await child.updateComplete;
            expect(child.shadowRoot?.querySelector(".badge span.value")?.textContent).toBe(
                "-- FPS (-- ms)"
            );
        });
    });

    describe("periodic polling via timer", () => {
        it("should update child frameTimeMs when canvas metrics change on timer tick", async () => {
            vi.useFakeTimers();
            try {
                const fixture = createMockCanvasContextFixture({ fps: 60, frameTimeMs: 16.666 });
                const host = document.createElement("test-canvas-host") as TestCanvasHostElement;
                host.canvasProvider.setValue(fixture.context);
                document.body.appendChild(host);

                const counter = document.createElement(TAG_RJ_WEBGL_FPS_COUNTER) as WebGLFpsCounterElement;
                host.appendChild(counter);
                await counter.updateComplete;

                const child = counter.querySelector<FpsCounterElement>(TAG_RJ_FPS_COUNTER)!;
                expect(child.frameTimeMs).toBe(16.666);

                // Update metrics before timer fires
                fixture.setMetrics({ fps: 120, frameTimeMs: 8.333 });

                // Before timer fires, child frameTimeMs hasn't changed yet
                expect(child.frameTimeMs).toBe(16.666);

                // Advance by full interval (250ms)
                vi.advanceTimersByTime(DEFAULT_UPDATE_INTERVAL_MS);
                await counter.updateComplete;

                expect(child.frameTimeMs).toBe(8.333);

                await child.updateComplete;
                expect(child.shadowRoot?.querySelector(".badge span.value")?.textContent).toBe(
                    "120 FPS (8.3 ms)"
                );
            } finally {
                vi.useRealTimers();
            }
        });

        it("should restart timer when updateIntervalMs property changes", async () => {
            vi.useFakeTimers();
            try {
                const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
                const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

                const fixture = createMockCanvasContextFixture({ fps: 60, frameTimeMs: 16.666 });
                const host = document.createElement("test-canvas-host") as TestCanvasHostElement;
                host.canvasProvider.setValue(fixture.context);
                document.body.appendChild(host);

                const counter = document.createElement(TAG_RJ_WEBGL_FPS_COUNTER) as WebGLFpsCounterElement;
                host.appendChild(counter);
                await counter.updateComplete;

                expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), DEFAULT_UPDATE_INTERVAL_MS);

                // Change update interval
                counter.updateIntervalMs = 500;
                await counter.updateComplete;

                expect(clearIntervalSpy).toHaveBeenCalled();
                expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 500);

                const child = counter.querySelector<FpsCounterElement>(TAG_RJ_FPS_COUNTER)!;
                fixture.setMetrics({ fps: 30, frameTimeMs: 33.333 });

                // Advancing by 250ms should NOT trigger update under 500ms interval
                vi.advanceTimersByTime(250);
                expect(child.frameTimeMs).toBe(16.666);

                // Advancing the remaining 250ms (total 500ms) triggers update
                vi.advanceTimersByTime(250);
                await counter.updateComplete;
                expect(child.frameTimeMs).toBe(33.333);
            } finally {
                vi.useRealTimers();
            }
        });

        it("should clamp zero or negative updateIntervalMs to safe minimum of 1ms", async () => {
            vi.useFakeTimers();
            try {
                const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

                const counter = document.createElement(TAG_RJ_WEBGL_FPS_COUNTER) as WebGLFpsCounterElement;
                counter.updateIntervalMs = 0;
                document.body.appendChild(counter);
                await counter.updateComplete;

                expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 1);
            } finally {
                vi.useRealTimers();
            }
        });
    });

    describe("disconnection & cleanup", () => {
        it("should clear timer interval when disconnected from DOM", async () => {
            vi.useFakeTimers();
            try {
                const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

                const counter = document.createElement(TAG_RJ_WEBGL_FPS_COUNTER) as WebGLFpsCounterElement;
                document.body.appendChild(counter);
                await counter.updateComplete;

                expect(clearIntervalSpy).not.toHaveBeenCalled();

                counter.remove();

                expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
            } finally {
                vi.useRealTimers();
            }
        });

        it("should resume timer interval cleanly when reconnected to DOM", async () => {
            vi.useFakeTimers();
            try {
                const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
                const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

                const fixture = createMockCanvasContextFixture({ fps: 60, frameTimeMs: 16.666 });
                const host = document.createElement("test-canvas-host") as TestCanvasHostElement;
                host.canvasProvider.setValue(fixture.context);
                document.body.appendChild(host);

                const counter = document.createElement(TAG_RJ_WEBGL_FPS_COUNTER) as WebGLFpsCounterElement;
                host.appendChild(counter);
                await counter.updateComplete;

                expect(setIntervalSpy).toHaveBeenCalledTimes(1);

                counter.remove();
                expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

                host.appendChild(counter);
                await counter.updateComplete;

                expect(setIntervalSpy).toHaveBeenCalledTimes(2);
            } finally {
                vi.useRealTimers();
            }
        });
    });
});
