import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { formatFpsText, FpsCounter } from "./fps_counter";
import {
    INITIAL_FPS_TEXT,
    DEFAULT_UPDATE_INTERVAL_MS,
    FPS_COUNTER_PRIORITY,
    type FpsCounterPosition,
} from "./fps_counter_types";
import { WebGLCanvasContext } from "./webgl_context";
import type { WebGLCanvasContextValue } from "./webgl_canvas_types";
import type { CanvasDimensions } from "../../webgl/canvas/canvas_types";
import type { WebGLSubscriber } from "../../webgl/canvas/subscriber_types";
import { createMockContextManager } from "../../testing/mocks/mock_context_manager";

/**
 * Creates a spy-wrapped WebGLCanvasContextValue fixture for component testing.
 */
function createMockCanvasContext() {
    let currentSubscriber: WebGLSubscriber | null = null;
    const unsubscribeSpy = vi.fn();
    const subscribeSpy = vi.fn((subscriber: WebGLSubscriber) => {
        currentSubscriber = subscriber;
        return unsubscribeSpy;
    });

    const mockGl = {} as WebGL2RenderingContext;
    const mockContextManager = createMockContextManager();
    const mockDims: CanvasDimensions = {
        width: 800,
        height: 600,
        cssWidth: 800,
        cssHeight: 600,
        dpr: 1,
        aspect: 800 / 600,
    };

    const contextValue: WebGLCanvasContextValue = {
        gl: mockGl,
        contextManager: mockContextManager,
        isSupported: true,
        isContextLost: false,
        dimensions: mockDims,
        subscribe: subscribeSpy,
        requestRender: vi.fn(),
    };

    return {
        contextValue,
        mockGl,
        mockDims,
        subscribeSpy,
        unsubscribeSpy,
        getSubscriber: () => currentSubscriber,
        simulateFrames: (count: number, dtPerFrame: number) => {
            if (!currentSubscriber?.render) {
                throw new Error("No subscriber registered in WebGLCanvasContext");
            }
            for (let i = 0; i < count; i++) {
                currentSubscriber.render(
                    mockGl,
                    { time: (i + 1) * dtPerFrame, dt: dtPerFrame, frameCount: i + 1 },
                    mockDims
                );
            }
        },
    };
}

describe("formatFpsText()", () => {
    describe("nominal inputs", () => {
        it("formats standard 60 FPS and 16.7 ms frame times with 1 decimal place", () => {
            const formatted = formatFpsText(60, 16.6666);
            expect(formatted).toBe("60 FPS (16.7 ms)");
        });

        it("rounds fractional FPS to the nearest integer", () => {
            expect(formatFpsText(59.4, 16.83)).toBe("59 FPS (16.8 ms)");
            expect(formatFpsText(59.5, 16.75)).toBe("60 FPS (16.8 ms)");
            expect(formatFpsText(119.8, 8.36)).toBe("120 FPS (8.4 ms)");
        });

        it("formats high refresh rate values (120 FPS)", () => {
            const formatted = formatFpsText(120.2, 8.333);
            expect(formatted).toBe("120 FPS (8.3 ms)");
        });

        it("formats low and zero FPS values cleanly", () => {
            expect(formatFpsText(0, 0)).toBe("0 FPS (0.0 ms)");
            expect(formatFpsText(14.8, 67.56)).toBe("15 FPS (67.6 ms)");
        });
    });

    describe("non-finite and NaN inputs", () => {
        it("returns INITIAL_FPS_TEXT fallback when fps is NaN", () => {
            expect(formatFpsText(NaN, 16.7)).toBe(INITIAL_FPS_TEXT);
        });

        it("returns INITIAL_FPS_TEXT fallback when frameTimeMs is NaN", () => {
            expect(formatFpsText(60, NaN)).toBe(INITIAL_FPS_TEXT);
        });

        it("returns INITIAL_FPS_TEXT fallback when both parameters are NaN", () => {
            expect(formatFpsText(NaN, NaN)).toBe(INITIAL_FPS_TEXT);
        });

        it("returns INITIAL_FPS_TEXT fallback when fps is positive or negative Infinity", () => {
            expect(formatFpsText(Infinity, 16.7)).toBe(INITIAL_FPS_TEXT);
            expect(formatFpsText(-Infinity, 16.7)).toBe(INITIAL_FPS_TEXT);
        });

        it("returns INITIAL_FPS_TEXT fallback when frameTimeMs is positive or negative Infinity", () => {
            expect(formatFpsText(60, Infinity)).toBe(INITIAL_FPS_TEXT);
            expect(formatFpsText(60, -Infinity)).toBe(INITIAL_FPS_TEXT);
        });
    });
});

describe("<FpsCounter />", () => {
    describe("context requirement", () => {
        it("throws an error when rendered outside of WebGLCanvasContext", () => {
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            expect(() => {
                render(<FpsCounter />);
            }).toThrowError("useWebGLContext must be used within a <WebGLCanvas> component.");
            consoleSpy.mockRestore();
        });
    });

    describe("default render & accessibility", () => {
        it("renders status container with initial text and default classes", () => {
            const { contextValue, subscribeSpy } = createMockCanvasContext();
            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <FpsCounter />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByRole("status");
            expect(statusElement).toBeInTheDocument();
            expect(statusElement).toHaveAttribute("aria-label", "Frame rate");
            expect(statusElement).toHaveAttribute("aria-live", "off");
            expect(statusElement).toHaveClass("fps-counter", "fps-counter--top-left", "top-left");
            expect(statusElement).toHaveTextContent(INITIAL_FPS_TEXT);

            expect(subscribeSpy).toHaveBeenCalledTimes(1);
            expect(subscribeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    priority: FPS_COUNTER_PRIORITY,
                    render: expect.any(Function),
                })
            );
        });
    });

    describe("position variants", () => {
        const positions: FpsCounterPosition[] = [
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
        ];

        positions.forEach((pos) => {
            it(`applies position modifier classes for "${pos}"`, () => {
                const { contextValue } = createMockCanvasContext();
                render(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <FpsCounter position={pos} />
                    </WebGLCanvasContext.Provider>
                );

                const statusElement = screen.getByRole("status");
                expect(statusElement).toHaveClass("fps-counter", `fps-counter--${pos}`, pos);
            });
        });
    });

    describe("custom props & attributes", () => {
        it("merges custom className with default classes", () => {
            const { contextValue } = createMockCanvasContext();
            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <FpsCounter className="custom-telemetry-badge" />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByRole("status");
            expect(statusElement).toHaveClass(
                "fps-counter",
                "fps-counter--top-left",
                "custom-telemetry-badge"
            );
        });

        it("applies inline style prop to the container", () => {
            const { contextValue } = createMockCanvasContext();
            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <FpsCounter style={{ opacity: 0.75, pointerEvents: "none" }} />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByRole("status");
            expect(statusElement).toHaveStyle({ opacity: "0.75", pointerEvents: "none" });
        });

        it("passes through additional HTML attributes to container element", () => {
            const { contextValue } = createMockCanvasContext();
            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <FpsCounter id="perf-fps-widget" data-testid="telemetry-counter" />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByTestId("telemetry-counter");
            expect(statusElement).toHaveAttribute("id", "perf-fps-widget");
        });

        it("registers subscriber with custom priority", () => {
            const { contextValue, subscribeSpy } = createMockCanvasContext();
            const customPriority = 250;
            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <FpsCounter priority={customPriority} />
                </WebGLCanvasContext.Provider>
            );

            expect(subscribeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    priority: customPriority,
                })
            );
        });
    });

    describe("direct ref prop forwarding", () => {
        it("forwards React 19 ref directly to the outer container DOM element", () => {
            const { contextValue } = createMockCanvasContext();
            const ref = createRef<HTMLDivElement>();

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <FpsCounter ref={ref} />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByRole("status");
            expect(ref.current).toBeInstanceOf(HTMLDivElement);
            expect(ref.current).toBe(statusElement);
        });
    });

    describe("frame tick telemetry & DOM updates", () => {
        it("does not update display text when accumulated time is below updateIntervalMs", () => {
            const mock = createMockCanvasContext();
            render(
                <WebGLCanvasContext.Provider value={mock.contextValue}>
                    <FpsCounter updateIntervalMs={DEFAULT_UPDATE_INTERVAL_MS} />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByRole("status");
            expect(statusElement).toHaveTextContent(INITIAL_FPS_TEXT);

            // 5 frames at 16ms = 80ms (less than 250ms threshold)
            mock.simulateFrames(5, 0.016);
            expect(statusElement).toHaveTextContent(INITIAL_FPS_TEXT);
        });

        it("updates inner span textContent directly upon meeting updateIntervalMs without React re-render", () => {
            const mock = createMockCanvasContext();
            render(
                <WebGLCanvasContext.Provider value={mock.contextValue}>
                    <FpsCounter updateIntervalMs={250} />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByRole("status");
            const spanElement = statusElement.querySelector("span.value");
            expect(spanElement).not.toBeNull();
            expect(spanElement?.textContent).toBe(INITIAL_FPS_TEXT);

            // 15 frames at ~16.6667ms each = 0.2500005s (> 0.250s interval)
            // 15 frames / 0.2500005s ~= 59.9998 FPS -> 60 FPS
            // 0.2500005s * 1000 / 15 ~= 16.6667 ms -> 16.7 ms
            mock.simulateFrames(15, 0.2500005 / 15);

            expect(spanElement?.textContent).toBe("60 FPS (16.7 ms)");
            // Confirm the same DOM element instance was mutated directly
            expect(statusElement.querySelector("span.value")).toBe(spanElement);
        });

        it("resets interval accumulators and correctly computes subsequent intervals", () => {
            const mock = createMockCanvasContext();
            render(
                <WebGLCanvasContext.Provider value={mock.contextValue}>
                    <FpsCounter updateIntervalMs={250} />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByRole("status");
            const spanElement = statusElement.querySelector("span.value");

            // Interval 1: 10 frames of 0.0251s = 0.251s (> 0.250s interval threshold)
            // 10 / 0.251 = 39.84 FPS -> 40 FPS, 0.251 * 1000 / 10 = 25.1 ms
            mock.simulateFrames(10, 0.0251);
            expect(spanElement?.textContent).toBe("40 FPS (25.1 ms)");

            // Sub-interval ticks (not yet enough time: 2 frames * 0.013s = 0.026s < 0.250s)
            mock.simulateFrames(2, 0.013);
            expect(spanElement?.textContent).toBe("40 FPS (25.1 ms)");

            // Interval 2 completion: 18 more frames of 0.013s (total 20 frames * 0.013s = 0.260s > 0.250s)
            // 20 / 0.260 = 76.92 FPS -> 77 FPS, 0.260 * 1000 / 20 = 13.0 ms
            mock.simulateFrames(18, 0.013);
            expect(spanElement?.textContent).toBe("77 FPS (13.0 ms)");
        });

        it("respects custom updateIntervalMs thresholds", () => {
            const mock = createMockCanvasContext();
            render(
                <WebGLCanvasContext.Provider value={mock.contextValue}>
                    <FpsCounter updateIntervalMs={500} />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByRole("status");
            const spanElement = statusElement.querySelector("span.value");

            // 10 frames * 0.03s = 0.3s (less than 0.5s threshold)
            mock.simulateFrames(10, 0.03);
            expect(spanElement?.textContent).toBe(INITIAL_FPS_TEXT);

            // Another 10 frames * 0.03s = 0.3s (accumulated 0.6s >= 0.5s, 20 frames)
            // 20 / 0.6s = 33.33 FPS -> 33 FPS, 0.6 * 1000 / 20 = 30.0 ms
            mock.simulateFrames(10, 0.03);
            expect(spanElement?.textContent).toBe("33 FPS (30.0 ms)");
        });

        it("clamps zero or negative updateIntervalMs to safe minimum of 1ms", () => {
            const mock = createMockCanvasContext();
            render(
                <WebGLCanvasContext.Provider value={mock.contextValue}>
                    <FpsCounter updateIntervalMs={0} />
                </WebGLCanvasContext.Provider>
            );

            const statusElement = screen.getByRole("status");
            const spanElement = statusElement.querySelector("span.value");

            // 1 frame of 2ms (0.002s > 0.001s threshold)
            mock.simulateFrames(1, 0.002);
            expect(spanElement?.textContent).toBe("500 FPS (2.0 ms)");
        });
    });

    describe("unmount cleanup", () => {
        it("unsubscribes from WebGL frame loop upon unmount", () => {
            const { contextValue, unsubscribeSpy } = createMockCanvasContext();
            const { unmount } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <FpsCounter />
                </WebGLCanvasContext.Provider>
            );

            expect(unsubscribeSpy).not.toHaveBeenCalled();

            unmount();
            expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
        });
    });
});
