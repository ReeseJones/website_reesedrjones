import {
    LitElement,
    html,
    css,
    type CSSResult,
    type TemplateResult,
    type PropertyValues,
} from "lit";
import { createRef, ref, type Ref } from "lit/directives/ref.js";
import { ContextProvider } from "@lit/context";
import { createDefaultContextManager } from "../../webgl/core/context_manager_factory";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type { CanvasDimensions, TimeInfo } from "../../webgl/canvas/canvas_types";
import type { WebGLSubscriber } from "../../webgl/canvas/subscriber_types";
import {
    webglCanvasContext,
    type IWebGLCanvasContext,
    type WebGLCanvasMetrics,
    type WebGLCanvasRenderMode,
} from "./webgl_canvas_element_types";
import {
    WebGLContextCreatedEvent,
    WebGLContextLostEvent,
    WebGLContextRestoredEvent,
    WebGLResizeEvent,
} from "./webgl_canvas_element_events";
import {
    TAG_RJ_WEBGL_CANVAS,
    DEFAULT_DPR_CAP,
    DEFAULT_RENDER_MODE,
    DEFAULT_PAUSE_WHEN_OFFSCREEN,
    DEFAULT_PAUSE_WHEN_HIDDEN,
    DEFAULT_RESIZE_DEBOUNCE_MS,
    DEFAULT_WEBGL_CONTEXT_ATTRIBUTES,
    CONTEXT_SIMULATE_LOSS_DEFAULT_DELAY_MS,
    DEFAULT_METRICS_INTERVAL_SEC,
    MS_PER_SECOND,
} from "./webgl_canvas_element_constants";
import { ResizeController } from "../../controllers/resize_controller";
import { defaultResizeObserverFactory } from "../../controllers/resize_observer_factory";
import type { ViewportDimensions } from "../../controllers/resize_controller_types";
import {
    DEFAULT_ASPECT_RATIO,
    DEFAULT_DEVICE_PIXEL_RATIO,
    DEFAULT_FALLBACK_DIMENSION,
    MIN_DEVICE_PIXEL_RATIO,
    MIN_VIEWPORT_DIMENSION,
} from "../../controllers/resize_controller_constants";
import { VisibilityController } from "../../controllers/visibility_controller";
import { defaultIntersectionObserverFactory } from "../../controllers/intersection_observer_factory";
import { AnimationFrameManager } from "../core/animation_frame_manager";
import { WebGLSubscriberManager } from "../../webgl/canvas/webgl_subscriber_manager";

/**
 * Web Component (<rj-webgl-canvas>) hosting a persistent WebGL2 rendering surface,
 * delegating viewport sizing and visibility throttling to Lit Reactive Controllers,
 * driving animation ticks through AnimationFrameManager, and providing webglCanvasContext via @lit/context.
 */
export class WebGLCanvasElement extends LitElement implements IWebGLCanvasContext {
    public static override styles: CSSResult = css`
        :host {
            display: block;
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        canvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            display: block;
        }
        .overlay-slot {
            position: relative;
            width: 100%;
            height: 100%;
        }
    `;

    public static override properties = {
        dprCap: { type: Number, attribute: "dpr-cap", reflect: true },
        renderMode: { type: String, attribute: "render-mode", reflect: true },
        pauseWhenOffscreen: { type: Boolean, attribute: "pause-when-offscreen", reflect: true },
        pauseWhenHidden: { type: Boolean, attribute: "pause-when-hidden", reflect: true },
    };

    public declare dprCap: number;
    public declare renderMode: WebGLCanvasRenderMode;
    public declare pauseWhenOffscreen: boolean;
    public declare pauseWhenHidden: boolean;

    private readonly _canvasRef: Ref<HTMLCanvasElement> = createRef();
    private readonly _canvasProvider: ContextProvider<typeof webglCanvasContext>;
    private readonly _contextManager: IWebGLContextManager;
    private readonly _subscriberManager: WebGLSubscriberManager;
    private readonly _resizeController: ResizeController;
    private readonly _visibilityController: VisibilityController;
    private readonly _animManager: AnimationFrameManager;

    private _gl: WebGL2RenderingContext | null = null;
    private _isContextLost: boolean = false;
    private _frameUnsubscribe: (() => void) | null = null;
    private _lastTimeInfo: TimeInfo = { time: 0, dt: 0, frameCount: 0 };
    private _metricsFrameCount: number = 0;
    private _metricsAccumulatedTime: number = 0;
    private _fps: number = 0;
    private _frameTimeMs: number = 0;

    private _dimensions: CanvasDimensions = {
        width: DEFAULT_FALLBACK_DIMENSION,
        height: DEFAULT_FALLBACK_DIMENSION,
        cssWidth: DEFAULT_FALLBACK_DIMENSION,
        cssHeight: DEFAULT_FALLBACK_DIMENSION,
        dpr: DEFAULT_DEVICE_PIXEL_RATIO,
        aspect: DEFAULT_ASPECT_RATIO,
    };

    public constructor() {
        super();
        this.dprCap = DEFAULT_DPR_CAP;
        this.renderMode = DEFAULT_RENDER_MODE;
        this.pauseWhenOffscreen = DEFAULT_PAUSE_WHEN_OFFSCREEN;
        this.pauseWhenHidden = DEFAULT_PAUSE_WHEN_HIDDEN;
        this._contextManager = createDefaultContextManager();
        this._subscriberManager = new WebGLSubscriberManager();
        this._canvasProvider = new ContextProvider(this, {
            context: webglCanvasContext,
            initialValue: this,
        });

        this._resizeController = new ResizeController(this, {
            observerFactory: defaultResizeObserverFactory,
            debounceMs: DEFAULT_RESIZE_DEBOUNCE_MS,
            onResize: (dims: ViewportDimensions) => this._handleResize(dims),
        });

        this._visibilityController = new VisibilityController(this, {
            observerFactory: defaultIntersectionObserverFactory,
            pauseWhenOffscreen: this.pauseWhenOffscreen,
            pauseWhenHidden: this.pauseWhenHidden,
        });

        this._animManager = new AnimationFrameManager((timeInfo) => ({ timeInfo }));
        this._frameUnsubscribe = this._animManager.subscribe((frameState) => {
            if (this.renderMode === "continuous" && this._visibilityController.isVisible) {
                this._renderFrame(frameState.timeInfo);
            }
        });
    }

    public override render(): TemplateResult {
        return html`
            <canvas ${ref(this._canvasRef)} part="canvas"></canvas>
            <div class="overlay-slot" part="overlay">
                <slot></slot>
            </div>
        `;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._canvasProvider.setValue(this);
        const canvas = this._canvasRef.value;
        if (canvas && !this._gl) {
            this._initWebGL(canvas);
        }
    }

    public override disconnectedCallback(): void {
        this._contextManager.destroy();
        super.disconnectedCallback();
    }

    protected override firstUpdated(): void {
        const canvas = this._canvasRef.value;
        if (!canvas) {
            return;
        }
        this._initWebGL(canvas);
    }

    protected override updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);

        if (changedProperties.has("dprCap") && this._gl) {
            this._handleResize(this._resizeController.dimensions);
        }

        if (changedProperties.has("renderMode")) {
            if (this.renderMode === "on-demand") {
                this.requestRender();
            }
        }

        if (
            changedProperties.has("pauseWhenOffscreen") ||
            changedProperties.has("pauseWhenHidden")
        ) {
            this._visibilityController.reconfigure({
                pauseWhenOffscreen: this.pauseWhenOffscreen,
                pauseWhenHidden: this.pauseWhenHidden,
            });
        }
    }

    public get gl(): WebGL2RenderingContext | null {
        return this._gl;
    }

    public get contextManager(): IWebGLContextManager {
        return this._contextManager;
    }

    public get dimensions(): CanvasDimensions {
        return this._dimensions;
    }

    public get isContextLost(): boolean {
        return this._isContextLost;
    }

    public get metrics(): WebGLCanvasMetrics {
        return {
            fps: this._fps,
            frameTimeMs: this._frameTimeMs,
        };
    }

    public subscribe(subscriber: WebGLSubscriber): () => void {
        const unsubscribe = this._subscriberManager.subscribe(subscriber);

        if (this.renderMode === "on-demand" && this._gl && !this._isContextLost) {
            this.requestRender();
        }

        return unsubscribe;
    }

    public requestRender(): void {
        if (typeof window !== "undefined") {
            this._lastTimeInfo = {
                ...this._lastTimeInfo,
                frameCount: this._lastTimeInfo.frameCount + 1,
            };
            this._renderFrame(this._lastTimeInfo);
        }
    }

    public simulateContextLoss(delayMs: number = CONTEXT_SIMULATE_LOSS_DEFAULT_DELAY_MS): void {
        if (!this._gl) {
            console.warn("[WebGL Debug] Cannot lose context: WebGL context is not active.");
            return;
        }
        const loseExt = this._gl.getExtension("WEBGL_lose_context");
        if (!loseExt) {
            console.warn("[WebGL Debug] WEBGL_lose_context extension is not supported.");
            return;
        }
        loseExt.loseContext();
        setTimeout(() => {
            loseExt.restoreContext();
        }, delayMs);
    }

    public destroy(): void {
        this._frameUnsubscribe?.();
        this._frameUnsubscribe = null;
        this._animManager.destroy();

        this._metricsFrameCount = 0;
        this._metricsAccumulatedTime = 0;
        this._fps = 0;
        this._frameTimeMs = 0;

        const canvas = this._canvasRef.value;
        if (canvas) {
            canvas.removeEventListener("webglcontextlost", this._handleContextLost);
            canvas.removeEventListener("webglcontextrestored", this._handleContextRestored);
        }

        this._subscriberManager.destroy();
        this._contextManager.destroy();

        if (this._gl) {
            const loseExt = this._gl.getExtension("WEBGL_lose_context");
            loseExt?.loseContext();
            this._gl = null;
        }
    }

    private _initWebGL(canvas: HTMLCanvasElement): void {
        const gl = canvas.getContext(
            "webgl2",
            DEFAULT_WEBGL_CONTEXT_ATTRIBUTES
        );

        if (!gl) {
            console.error("WebGLCanvasElement: Failed to acquire WebGL2 rendering context.");
            return;
        }

        this._gl = gl;
        this._isContextLost = false;
        this._contextManager.setContext(gl);

        canvas.addEventListener("webglcontextlost", this._handleContextLost, false);
        canvas.addEventListener("webglcontextrestored", this._handleContextRestored, false);

        this._handleResize(this._resizeController.measureImmediate());
        this.dispatchEvent(new WebGLContextCreatedEvent(gl, this._contextManager));

        this._subscriberManager.notifyInit(gl, this._dimensions);

        if (this.renderMode === "on-demand") {
            this.requestRender();
        }
    }

    private _handleResize(dims: ViewportDimensions): void {
        const rawDpr = dims.devicePixelRatio;
        const dprCap =
            Number.isFinite(this.dprCap) && this.dprCap > MIN_DEVICE_PIXEL_RATIO
                ? this.dprCap
                : Number.POSITIVE_INFINITY;
        const effectiveDpr = Math.min(rawDpr, dprCap);
        const width = Math.max(MIN_VIEWPORT_DIMENSION, Math.round(dims.cssWidth * effectiveDpr));
        const height = Math.max(MIN_VIEWPORT_DIMENSION, Math.round(dims.cssHeight * effectiveDpr));
        const aspect = width / Math.max(MIN_VIEWPORT_DIMENSION, height);

        const canvas = this._canvasRef.value;
        const gl = this._gl;

        if (canvas && (canvas.width !== width || canvas.height !== height)) {
            canvas.width = width;
            canvas.height = height;
        }

        if (gl) {
            this._contextManager.setViewport(0, 0, width, height);
        }

        const nextDims: CanvasDimensions = {
            width,
            height,
            cssWidth: dims.cssWidth,
            cssHeight: dims.cssHeight,
            dpr: effectiveDpr,
            aspect,
        };

        const hasChanged =
            this._dimensions.width !== nextDims.width ||
            this._dimensions.height !== nextDims.height ||
            this._dimensions.dpr !== nextDims.dpr;

        this._dimensions = nextDims;
        this._canvasProvider.setValue(this, true);

        if (hasChanged) {
            this.dispatchEvent(new WebGLResizeEvent(nextDims));
            if (gl) {
                this._subscriberManager.notifyResize(gl, nextDims);
            }
        }

        if (this.renderMode === "on-demand") {
            this.requestRender();
        }
    }

    private _renderFrame(timeInfo: TimeInfo): void {
        this._metricsFrameCount++;
        this._metricsAccumulatedTime += timeInfo.dt;

        if (this._metricsAccumulatedTime >= DEFAULT_METRICS_INTERVAL_SEC) {
            if (this._metricsFrameCount > 0 && this._metricsAccumulatedTime > 0) {
                this._fps = this._metricsFrameCount / this._metricsAccumulatedTime;
                this._frameTimeMs =
                    (this._metricsAccumulatedTime * MS_PER_SECOND) / this._metricsFrameCount;
            }
            this._metricsFrameCount = 0;
            this._metricsAccumulatedTime = 0;
        }

        if (this._gl && !this._isContextLost) {
            this._lastTimeInfo = timeInfo;
            this._subscriberManager.notifyRender(this._gl, timeInfo, this._dimensions);
        }
    }

    private _handleContextLost = (e: Event): void => {
        e.preventDefault();
        this._isContextLost = true;
        this._contextManager.handleContextLost();
        this._canvasProvider.setValue(this, true);
        this.dispatchEvent(new WebGLContextLostEvent());
        this._subscriberManager.notifyContextLost(e as WebGLContextEvent);
    };

    private _handleContextRestored = (): void => {
        const canvas = this._canvasRef.value;
        if (!canvas) {
            return;
        }

        const gl = canvas.getContext(
            "webgl2",
            DEFAULT_WEBGL_CONTEXT_ATTRIBUTES
        ) as WebGL2RenderingContext | null;

        if (gl) {
            this._gl = gl;
            this._isContextLost = false;
            this._contextManager.handleContextRestored(gl);
            this._handleResize(this._resizeController.measureImmediate());
            this._canvasProvider.setValue(this, true);
            this.dispatchEvent(new WebGLContextRestoredEvent(gl));
            this._subscriberManager.notifyContextRestored(gl, this._dimensions);
            if (this.renderMode === "on-demand") {
                this.requestRender();
            }
        }
    };
}

let isWebGLCanvasElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-webgl-canvas> with customElements.
 */
export function setupWebGLCanvasElement(): void {
    if (
        isWebGLCanvasElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_WEBGL_CANVAS))
    ) {
        return;
    }

    customElements.define(TAG_RJ_WEBGL_CANVAS, WebGLCanvasElement);
    isWebGLCanvasElementRegistered = true;
}
