import { describe, it, expect, vi, afterEach } from "vitest";
import { formatFpsMetric, FpsCounterElement, setupFpsCounterElement } from "./fps_counter_element";
import {
    INITIAL_FPS_BOTH_TEXT,
    INITIAL_FPS_TEXT,
    INITIAL_FRAME_TIME_TEXT,
    TAG_RJ_FPS_COUNTER,
} from "./fps_counter_element_constants";
import type { FpsCounterPosition, FpsCounterDisplayMode } from "./fps_counter_element_types";

describe("formatFpsMetric()", () => {
    describe('"both" mode (default)', () => {
        it("should format standard 16.666 ms to '60 FPS (16.7 ms)'", () => {
            expect(formatFpsMetric(16.6666)).toBe("60 FPS (16.7 ms)");
            expect(formatFpsMetric(16.6666, "both")).toBe("60 FPS (16.7 ms)");
        });

        it("should format high refresh 8.333 ms to '120 FPS (8.3 ms)'", () => {
            expect(formatFpsMetric(8.3333, "both")).toBe("120 FPS (8.3 ms)");
        });

        it("should round fractional FPS to nearest integer", () => {
            expect(formatFpsMetric(16.83, "both")).toBe("59 FPS (16.8 ms)");
            expect(formatFpsMetric(16.75, "both")).toBe("60 FPS (16.8 ms)");
            expect(formatFpsMetric(8.36, "both")).toBe("120 FPS (8.4 ms)");
        });

        it("should return INITIAL_FPS_BOTH_TEXT fallback for undefined, <= 0, NaN, and Infinity", () => {
            expect(formatFpsMetric(undefined, "both")).toBe(INITIAL_FPS_BOTH_TEXT);
            expect(formatFpsMetric(0, "both")).toBe(INITIAL_FPS_BOTH_TEXT);
            expect(formatFpsMetric(-10, "both")).toBe(INITIAL_FPS_BOTH_TEXT);
            expect(formatFpsMetric(NaN, "both")).toBe(INITIAL_FPS_BOTH_TEXT);
            expect(formatFpsMetric(Infinity, "both")).toBe(INITIAL_FPS_BOTH_TEXT);
            expect(formatFpsMetric(-Infinity, "both")).toBe(INITIAL_FPS_BOTH_TEXT);
        });
    });

    describe('"fps" mode', () => {
        it("should format 16.666 ms to '60 FPS'", () => {
            expect(formatFpsMetric(16.6666, "fps")).toBe("60 FPS");
            expect(formatFpsMetric(8.3333, "fps")).toBe("120 FPS");
        });

        it("should return INITIAL_FPS_TEXT fallback for undefined, <= 0, NaN, and Infinity", () => {
            expect(formatFpsMetric(undefined, "fps")).toBe(INITIAL_FPS_TEXT);
            expect(formatFpsMetric(0, "fps")).toBe(INITIAL_FPS_TEXT);
            expect(formatFpsMetric(-5, "fps")).toBe(INITIAL_FPS_TEXT);
            expect(formatFpsMetric(NaN, "fps")).toBe(INITIAL_FPS_TEXT);
            expect(formatFpsMetric(Infinity, "fps")).toBe(INITIAL_FPS_TEXT);
            expect(formatFpsMetric(-Infinity, "fps")).toBe(INITIAL_FPS_TEXT);
        });
    });

    describe('"frame-time" mode', () => {
        it("should format 16.666 ms to '16.7 ms'", () => {
            expect(formatFpsMetric(16.6666, "frame-time")).toBe("16.7 ms");
            expect(formatFpsMetric(8.3333, "frame-time")).toBe("8.3 ms");
        });

        it("should return INITIAL_FRAME_TIME_TEXT fallback for undefined, <= 0, NaN, and Infinity", () => {
            expect(formatFpsMetric(undefined, "frame-time")).toBe(INITIAL_FRAME_TIME_TEXT);
            expect(formatFpsMetric(0, "frame-time")).toBe(INITIAL_FRAME_TIME_TEXT);
            expect(formatFpsMetric(-1, "frame-time")).toBe(INITIAL_FRAME_TIME_TEXT);
            expect(formatFpsMetric(NaN, "frame-time")).toBe(INITIAL_FRAME_TIME_TEXT);
            expect(formatFpsMetric(Infinity, "frame-time")).toBe(INITIAL_FRAME_TIME_TEXT);
            expect(formatFpsMetric(-Infinity, "frame-time")).toBe(INITIAL_FRAME_TIME_TEXT);
        });
    });

    describe('"none" mode', () => {
        it("should return empty string for any input", () => {
            expect(formatFpsMetric(16.6666, "none")).toBe("");
            expect(formatFpsMetric(undefined, "none")).toBe("");
            expect(formatFpsMetric(0, "none")).toBe("");
            expect(formatFpsMetric(NaN, "none")).toBe("");
            expect(formatFpsMetric(Infinity, "none")).toBe("");
        });
    });
});

describe("FpsCounterElement", () => {
    setupFpsCounterElement();

    const originalShowPopover = HTMLElement.prototype.showPopover;
    const originalHidePopover = HTMLElement.prototype.hidePopover;

    afterEach(() => {
        document.body.innerHTML = "";

        if (originalShowPopover !== undefined) {
            HTMLElement.prototype.showPopover = originalShowPopover;
        } else {
            delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover;
        }

        if (originalHidePopover !== undefined) {
            HTMLElement.prototype.hidePopover = originalHidePopover;
        } else {
            delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover;
        }
    });

    describe("constructor defaults", () => {
        it("should default frameTimeMs to undefined, mode to 'both', and position to 'top-left'", () => {
            const element = new FpsCounterElement();
            expect(element.frameTimeMs).toBeUndefined();
            expect(element.mode).toBe("both");
            expect(element.position).toBe("top-left");
        });
    });

    describe("reactive property updates & Shadow DOM rendering", () => {
        it("should render updated text in Shadow DOM when frameTimeMs changes", async () => {
            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            element.frameTimeMs = 16.666;
            await element.updateComplete;

            const shadowSpan = element.shadowRoot?.querySelector<HTMLSpanElement>(".badge span.value");
            expect(shadowSpan?.textContent).toBe("60 FPS (16.7 ms)");
        });

        it("should render updated text when mode changes to 'fps'", async () => {
            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            element.frameTimeMs = 16.666;
            document.body.appendChild(element);
            await element.updateComplete;

            element.mode = "fps";
            await element.updateComplete;

            const shadowSpan = element.shadowRoot?.querySelector<HTMLSpanElement>(".badge span.value");
            expect(shadowSpan?.textContent).toBe("60 FPS");
        });

        it("should render updated text when mode changes to 'frame-time'", async () => {
            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            element.frameTimeMs = 16.666;
            document.body.appendChild(element);
            await element.updateComplete;

            element.mode = "frame-time";
            await element.updateComplete;

            const shadowSpan = element.shadowRoot?.querySelector<HTMLSpanElement>(".badge span.value");
            expect(shadowSpan?.textContent).toBe("16.7 ms");
        });

        it("should render nothing when mode is 'none'", async () => {
            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            element.frameTimeMs = 16.666;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector(".badge")).not.toBeNull();

            element.mode = "none";
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector(".badge")).toBeNull();
        });

        it("should reflect position property changes to host attribute", async () => {
            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            const positions: FpsCounterPosition[] = [
                "top-right",
                "bottom-left",
                "bottom-right",
                "top-left",
            ];

            for (const pos of positions) {
                element.position = pos;
                await element.updateComplete;
                expect(element.getAttribute("position")).toBe(pos);
            }
        });

        it("should reflect mode property changes to host attribute", async () => {
            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            const modes: FpsCounterDisplayMode[] = ["fps", "frame-time", "none", "both"];

            for (const mode of modes) {
                element.mode = mode;
                await element.updateComplete;
                expect(element.getAttribute("mode")).toBe(mode);
            }
        });

        it("should parse observed 'frame-time-ms' attribute into frameTimeMs property", async () => {
            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            element.setAttribute("frame-time-ms", "16.7");
            await element.updateComplete;

            expect(element.frameTimeMs).toBe(16.7);
            const shadowSpan = element.shadowRoot?.querySelector<HTMLSpanElement>(".badge span.value");
            expect(shadowSpan?.textContent).toBe("60 FPS (16.7 ms)");
        });
    });

    describe("popover lifecycle", () => {
        it("should invoke showPopover() on inner .badge element on firstUpdated()", async () => {
            const showSpy = vi.fn();
            HTMLElement.prototype.showPopover = showSpy;

            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            const badge = element.shadowRoot?.querySelector<HTMLElement>(".badge");
            expect(showSpy).toHaveBeenCalledTimes(1);
            expect(showSpy.mock.instances[0]).toBe(badge);
            expect(showSpy.mock.instances[0]).not.toBe(element);
        });

        it("should invoke showPopover() on inner .badge element when reconnected after initial update", async () => {
            const showSpy = vi.fn();
            HTMLElement.prototype.showPopover = showSpy;

            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(showSpy).toHaveBeenCalledTimes(1);

            element.remove();
            document.body.appendChild(element);

            expect(showSpy).toHaveBeenCalledTimes(2);
            const badge = element.shadowRoot?.querySelector<HTMLElement>(".badge");
            expect(showSpy.mock.instances[1]).toBe(badge);
        });

        it("should invoke showPopover() when mode transitions from 'none' to active mode", async () => {
            const showSpy = vi.fn();
            HTMLElement.prototype.showPopover = showSpy;

            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            element.mode = "none";
            document.body.appendChild(element);
            await element.updateComplete;

            expect(showSpy).not.toHaveBeenCalled();

            element.mode = "both";
            await element.updateComplete;

            expect(showSpy).toHaveBeenCalledTimes(1);
            const badge = element.shadowRoot?.querySelector<HTMLElement>(".badge");
            expect(showSpy.mock.instances[0]).toBe(badge);
        });

        it("should not throw when showPopover is undefined on inner .badge element", async () => {
            delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover;

            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);

            await expect(element.updateComplete).resolves.toBe(true);

            expect(() => {
                element.connectedCallback();
            }).not.toThrow();
        });

        it("should catch and suppress error when showPopover throws an exception", async () => {
            const showSpy = vi.fn().mockImplementation(() => {
                throw new DOMException("InvalidStateError", "InvalidStateError");
            });
            HTMLElement.prototype.showPopover = showSpy;

            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);

            await expect(element.updateComplete).resolves.toBe(true);
            expect(showSpy).toHaveBeenCalledTimes(1);

            expect(() => {
                element.connectedCallback();
            }).not.toThrow();
        });

        it("should invoke hidePopover() on inner .badge element when disconnected from DOM", async () => {
            const hideSpy = vi.fn();
            HTMLElement.prototype.hidePopover = hideSpy;

            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(hideSpy).not.toHaveBeenCalled();

            element.remove();

            const badge = element.shadowRoot?.querySelector<HTMLElement>(".badge");
            expect(hideSpy).toHaveBeenCalledTimes(1);
            expect(hideSpy.mock.instances[0]).toBe(badge);
            expect(hideSpy.mock.instances[0]).not.toBe(element);
        });

        it("should not throw when hidePopover is undefined on inner .badge element during disconnect", async () => {
            delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover;

            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(() => {
                element.remove();
            }).not.toThrow();
        });

        it("should catch and suppress error when hidePopover throws an exception during disconnect", async () => {
            const hideSpy = vi.fn().mockImplementation(() => {
                throw new DOMException("InvalidStateError", "InvalidStateError");
            });
            HTMLElement.prototype.hidePopover = hideSpy;

            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(() => {
                element.remove();
            }).not.toThrow();

            expect(hideSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("accessibility and Shadow DOM template", () => {
        it("should not set popover attribute on host <rj-fps-counter> element", async () => {
            HTMLElement.prototype.showPopover = vi.fn();
            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element.hasAttribute("popover")).toBe(false);
            expect(element.getAttribute("popover")).toBeNull();
        });

        it("should render inner badge with popover='manual' and part='badge', value with part='value'", async () => {
            const element = document.createElement(TAG_RJ_FPS_COUNTER) as FpsCounterElement;
            document.body.appendChild(element);
            await element.updateComplete;

            const badge = element.shadowRoot?.querySelector<HTMLElement>(".badge");
            expect(badge).not.toBeNull();
            expect(badge?.getAttribute("popover")).toBe("manual");
            expect(badge?.getAttribute("part")).toBe("badge");

            const valueSpan = badge?.querySelector<HTMLSpanElement>("span.value");
            expect(valueSpan).not.toBeNull();
            expect(valueSpan?.getAttribute("part")).toBe("value");
            expect(valueSpan?.textContent).toBe(INITIAL_FPS_BOTH_TEXT);
        });

        it("should not inject default role, aria-label, or aria-live attributes on host element in connectedCallback()", () => {
            const element = new FpsCounterElement();
            element.connectedCallback();

            expect(element.hasAttribute("role")).toBe(false);
            expect(element.hasAttribute("aria-label")).toBe(false);
            expect(element.hasAttribute("aria-live")).toBe(false);
        });

        it("should preserve consumer-provided accessibility attributes on host element", () => {
            const element = new FpsCounterElement();
            element.setAttribute("role", "status");
            element.setAttribute("aria-label", "Custom FPS");
            element.setAttribute("aria-live", "polite");

            element.connectedCallback();

            expect(element.getAttribute("role")).toBe("status");
            expect(element.getAttribute("aria-label")).toBe("Custom FPS");
            expect(element.getAttribute("aria-live")).toBe("polite");
        });
    });

    describe("setupFpsCounterElement()", () => {
        it("should register custom element idempotently without throwing", () => {
            expect(() => {
                setupFpsCounterElement();
                setupFpsCounterElement();
            }).not.toThrow();

            expect(customElements.get(TAG_RJ_FPS_COUNTER)).toBe(FpsCounterElement);
        });
    });
});
