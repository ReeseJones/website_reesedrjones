import { LitElement, html, type PropertyValues } from "lit";
import { ContextConsumer } from "@lit/context";
import { webglCanvasContext } from "../../scene/elements/webgl_canvas_element_types";
import { setupFpsCounterElement } from "./fps_counter_element";
import {
    DEFAULT_FPS_COUNTER_MODE,
    DEFAULT_FPS_COUNTER_POSITION,
} from "./fps_counter_element_constants";
import type { FpsCounterDisplayMode, FpsCounterPosition } from "./fps_counter_element_types";
import {
    DEFAULT_UPDATE_INTERVAL_MS,
    TAG_RJ_WEBGL_FPS_COUNTER,
} from "./webgl_fps_counter_element_constants";

/**
 * Lit Web Component (<rj-webgl-fps-counter>) that consumes WebGL canvas telemetry metrics
 * via @lit/context and renders <rj-fps-counter> inside the Light DOM.
 */
export class WebGLFpsCounterElement extends LitElement {
    public static override properties = {
        position: { type: String, reflect: true },
        mode: { type: String, reflect: true },
        updateIntervalMs: { type: Number, attribute: "update-interval-ms" },
        _frameTimeMs: { state: true },
    };

    public declare position: FpsCounterPosition;
    public declare mode: FpsCounterDisplayMode;
    public declare updateIntervalMs: number;
    private declare _frameTimeMs: number | undefined;

    private readonly _canvasConsumer: ContextConsumer<typeof webglCanvasContext, this>;
    private _timerId: ReturnType<typeof setInterval> | null = null;
    private _currentIntervalMs: number = DEFAULT_UPDATE_INTERVAL_MS;

    public constructor() {
        super();
        this.position = DEFAULT_FPS_COUNTER_POSITION;
        this.mode = DEFAULT_FPS_COUNTER_MODE;
        this.updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS;
        this._frameTimeMs = undefined;

        this._canvasConsumer = new ContextConsumer(this, {
            context: webglCanvasContext,
            subscribe: true,
        });
    }

    /**
     * Renders into the Light DOM rather than creating a Shadow Root,
     * so it renders <rj-fps-counter> without extra shadow DOM nesting.
     */
    public override createRenderRoot(): HTMLElement {
        return this;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._startTimer();
    }

    public override disconnectedCallback(): void {
        this._stopTimer();
        super.disconnectedCallback();
    }

    protected override updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);
        if (changedProperties.has("updateIntervalMs") && this.isConnected) {
            const rawInterval =
                typeof this.updateIntervalMs === "number" && !Number.isNaN(this.updateIntervalMs)
                    ? this.updateIntervalMs
                    : DEFAULT_UPDATE_INTERVAL_MS;
            const nextIntervalMs = Math.max(rawInterval, 1);
            if (nextIntervalMs !== this._currentIntervalMs) {
                this._startTimer();
            }
        }
    }

    public override render() {
        return html`
            <rj-fps-counter
                .frameTimeMs=${this._frameTimeMs}
                .mode=${this.mode}
                .position=${this.position}
            ></rj-fps-counter>
        `;
    }

    private _startTimer(): void {
        this._stopTimer();
        const rawInterval =
            typeof this.updateIntervalMs === "number" && !Number.isNaN(this.updateIntervalMs)
                ? this.updateIntervalMs
                : DEFAULT_UPDATE_INTERVAL_MS;
        const intervalMs = Math.max(rawInterval, 1);
        this._currentIntervalMs = intervalMs;
        this._updateMetrics();
        this._timerId = setInterval(() => {
            this._updateMetrics();
        }, intervalMs);
    }

    private _stopTimer(): void {
        if (this._timerId !== null) {
            clearInterval(this._timerId);
            this._timerId = null;
        }
    }

    private _updateMetrics(): void {
        const frameTimeMs = this._canvasConsumer.value?.metrics.frameTimeMs;
        this._frameTimeMs = frameTimeMs;
    }
}

let isRegistered = false;

/**
 * Registers the `<rj-webgl-fps-counter>` custom element idempotently.
 */
export function setupWebGLFpsCounterElement(): void {
    if (isRegistered || customElements.get(TAG_RJ_WEBGL_FPS_COUNTER)) {
        return;
    }
    setupFpsCounterElement();
    customElements.define(TAG_RJ_WEBGL_FPS_COUNTER, WebGLFpsCounterElement);
    isRegistered = true;
}
