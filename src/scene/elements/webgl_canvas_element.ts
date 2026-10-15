import {
    LitElement,
    html,
    css,
    type CSSResult,
    type TemplateResult,
    type PropertyValues,
} from "lit";
import { property } from "lit/decorators.js";
import { createRef, ref, type Ref } from "lit/directives/ref.js";
import { ContextProvider } from "@lit/context";
import {
    webglCanvasContext,
    type IWebGLCanvasContext,
} from "./scene_element_types";
import { createDefaultContextManager } from "../../webgl/core/context_manager_factory";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type {
    CanvasDimensions,
    TimeInfo,
    WebGLSubscriber,
} from "../../components/webgl_canvas/types";
import type { WebGLCanvasRenderMode } from "./webgl_canvas_element_types";
import type { NormalizedRgbaTuple } from "./converters/rgba_color_converter_types";
import { rgbaColorConverter } from "./converters/rgba_color_converter";
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
    DEFAULT_WEBGL_CONTEXT_ATTRIBUTES,
    VIEWPORT_X,
    VIEWPORT_Y,
    CONTEXT_SIMULATE_LOSS_DEFAULT_DELAY_MS,
} from "./webgl_canvas_element_constants";
import { ResizeController } from "../../controllers/resize_controller";
import type { ViewportDimensions } from "../../controllers/resize_controller_types";
import {
    DEFAULT_ASPECT_RATIO,
    DEFAULT_DEVICE_PIXEL_RATIO,
    DEFAULT_FALLBACK_DIMENSION,
} from "../../controllers/resize_controller_constants";
import { VisibilityController } from "../../controllers/visibility_controller";
import { AnimationFrameManager } from "../core/animation_frame_manager";

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
            pointer-events: none;
        }
        ::slotted(*) {
            pointer-events: auto;
        }
    `;

    @property({ type: Number, attribute: "dpr-cap", reflect: true })
    public accessor dprCap: number = DEFAULT_DPR_CAP;

    @property({ type: Boolean, attribute: "auto-clear", reflect: true })
    public accessor autoClear: boolean = DEFAULT_AUTO_CLEAR;

    @property({ converter: rgbaColorConverter, attribute: "clear-color", reflect: true })
    public accessor clearColor: NormalizedRgbaTuple = DEFAULT_CLEAR_COLOR;

    @property({ type: String, attribute: "render-mode", reflect: true })
    public accessor renderMode: WebGLCanvasRenderMode = DEFAULT_RENDER_MODE;

    @property({ type: Boolean, attribute: "pause-when-offscreen", reflect: true })
    public accessor pauseWhenOffscreen: boolean = DEFAULT_PAUSE_WHEN_OFFSCREEN;

    @property({ type: Boolean, attribute: "pause-when-hidden", reflect: true })
    public accessor pauseWhenHidden: boolean = DEFAULT_PAUSE_WHEN_HIDDEN;

    private readonly _canvasRef: Ref<HTMLCanvasElement> = createRef();
    private readonly _canvasProvider: ContextProvider<typeof webglCanvasContext>;
    private readonly _contextManager: IWebGLContextManager;
    private readonly _resizeController: ResizeController;
    private readonly _visibilityController: VisibilityController;
    private readonly _animManager: AnimationFrameManager;
    private readonly _subscribers: Map<string, WebGLSubscriber> = new Map();

    private _gl: WebGL2RenderingContext | null = null;
    private _isContextLost: boolean = false;
    private _frameUnsubscribe: (() => void) | null = null;
    private _lastTimeInfo: TimeInfo = { time: 0, dt: 0, frameCount: 0 };

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
        this._contextManager = createDefaultContextManager();
        this._canvasProvider = new ContextProvider(this, {
            context: webglCanvasContext,
            initialValue: this,
        });

        const self = this;
        this._resizeController = new ResizeController(this, {
            get dprCap(): number {
                return self.dprCap;
            },
            onResize: (dims: ViewportDimensions) => this._handleResize(dims),
        });

        this._visibilityController = new VisibilityController(this, {
            get pauseWhenOffscreen(): boolean {
                return self.pauseWhenOffscreen;
            },
            get pauseWhenHidden(): boolean {
                return self.pauseWhenHidden;
            },
            onChange: () => this._syncLoop(),
        });

        this._animManager = new AnimationFrameManager((timeInfo) => ({ timeInfo }));
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
        } else if (this._gl) {
            this._syncLoop();
        }
    }

    public override disconnectedCallback(): void {
        this._stopLoop();
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
            this._handleResize(this._resizeController.measureImmediate());
        }

        if (changedProperties.has("renderMode")) {
            this._syncLoop();
            if (this.renderMode === "on-demand") {
                this.requestRender();
            }
        }

        if (
            changedProperties.has("pauseWhenOffscreen") ||
            changedProperties.has("pauseWhenHidden")
        ) {
            this._visibilityController.hostDisconnected();
            this._visibilityController.hostConnected();
            this._syncLoop();
        }

        if (
            (changedProperties.has("autoClear") || changedProperties.has("clearColor")) &&
            this.renderMode === "on-demand"
        ) {
            this.requestRender();
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

    public subscribe(subscriber: WebGLSubscriber): () => void {
        this._subscribers.set(subscriber.id, subscriber);

        if (this._gl && !this._isContextLost) {
            subscriber.init?.(this._gl, this._dimensions);
            if (this.renderMode === "on-demand") {
                this.requestRender();
            }
        }

        return () => {
            subscriber.destroy?.();
            this._subscribers.delete(subscriber.id);
        };
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
        this._stopLoop();
        this._animManager.destroy();

        const canvas = this._canvasRef.value;
        if (canvas) {
            canvas.removeEventListener("webglcontextlost", this._handleContextLost);
            canvas.removeEventListener("webglcontextrestored", this._handleContextRestored);
        }

        for (const sub of this._subscribers.values()) {
            sub.destroy?.();
        }
        this._subscribers.clear();

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
        ) as WebGL2RenderingContext | null;

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

        for (const sub of this._subscribers.values()) {
            sub.init?.(gl, this._dimensions);
        }

        this._syncLoop();
        if (this.renderMode === "on-demand") {
            this.requestRender();
        }
    }

    private _handleResize(dims: ViewportDimensions): void {
        const canvas = this._canvasRef.value;
        const gl = this._gl;

        if (canvas && (canvas.width !== dims.width || canvas.height !== dims.height)) {
            canvas.width = dims.width;
            canvas.height = dims.height;
        }

        if (gl) {
            gl.viewport(VIEWPORT_X, VIEWPORT_Y, dims.width, dims.height);
        }

        const nextDims: CanvasDimensions = {
            width: dims.width,
            height: dims.height,
            cssWidth: dims.cssWidth,
            cssHeight: dims.cssHeight,
            dpr: dims.devicePixelRatio,
            aspect: dims.aspect,
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
                for (const sub of this._subscribers.values()) {
                    sub.resize?.(gl, nextDims);
                }
            }
        }

        if (this.renderMode === "on-demand") {
            this.requestRender();
        }
    }

    private _shouldLoop(): boolean {
        return (
            this.renderMode === "continuous" &&
            this._visibilityController.isVisible &&
            !this._isContextLost &&
            this._gl !== null
        );
    }

    private _syncLoop(): void {
        if (this._shouldLoop()) {
            if (this._frameUnsubscribe === null) {
                this._frameUnsubscribe = this._animManager.subscribe((frameState) => {
                    this._renderFrame(frameState.timeInfo);
                });
            }
        } else {
            this._stopLoop();
        }
    }

    private _stopLoop(): void {
        if (this._frameUnsubscribe !== null) {
            this._frameUnsubscribe();
            this._frameUnsubscribe = null;
        }
    }

    private _renderFrame(timeInfo: TimeInfo): void {
        const gl = this._gl;
        if (!gl || this._isContextLost || !this._visibilityController.isVisible) {
            return;
        }

        this._lastTimeInfo = timeInfo;

        if (this.autoClear) {
            const [r, g, b, a] = this.clearColor;
            gl.clearColor(r, g, b, a);
            gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);
        }

        const sorted = Array.from(this._subscribers.values()).sort(
            (a, b) => a.priority - b.priority
        );

        const dims = this._dimensions;
        for (let i = 0; i < sorted.length; i++) {
            sorted[i].render?.(gl, timeInfo, dims);
        }
    }

    private _handleContextLost = (e: Event): void => {
        e.preventDefault();
        this._stopLoop();
        this._isContextLost = true;
        this._contextManager.handleContextLost();
        this._canvasProvider.setValue(this, true);
        this.dispatchEvent(new WebGLContextLostEvent());
        for (const sub of this._subscribers.values()) {
            sub.onContextLost?.(e as WebGLContextEvent);
        }
    };

    private _handleContextRestored = (): void => {
        this._isContextLost = false;
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
            this._contextManager.handleContextRestored(gl);
            this._handleResize(this._resizeController.measureImmediate());
            this._canvasProvider.setValue(this, true);
            this.dispatchEvent(new WebGLContextRestoredEvent(gl));
            for (const sub of this._subscribers.values()) {
                sub.onContextRestored?.(gl, this._dimensions);
            }
            this._syncLoop();
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
