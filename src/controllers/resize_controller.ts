import type { ReactiveController, ReactiveControllerHost } from "lit";
import type {
    IResizeController,
    ResizeControllerOptions,
    ViewportDimensions,
} from "./resize_controller_types";
import {
    DEFAULT_ASPECT_RATIO,
    DEFAULT_DEVICE_PIXEL_RATIO,
    DEFAULT_FALLBACK_DIMENSION,
    MIN_DEVICE_PIXEL_RATIO,
    MIN_VIEWPORT_DIMENSION,
} from "./resize_controller_constants";

/**
 * Lit Reactive Controller observing element or viewport resize changes,
 * applying DPR scaling, and notifying host elements and subscribers.
 */
export class ResizeController implements ReactiveController, IResizeController {
    private readonly host: ReactiveControllerHost;
    private readonly options: ResizeControllerOptions;
    private observer: ResizeObserver | null = null;
    private hasMeasured: boolean = false;

    private currentDimensions: ViewportDimensions = {
        width: DEFAULT_FALLBACK_DIMENSION,
        height: DEFAULT_FALLBACK_DIMENSION,
        cssWidth: DEFAULT_FALLBACK_DIMENSION,
        cssHeight: DEFAULT_FALLBACK_DIMENSION,
        devicePixelRatio: DEFAULT_DEVICE_PIXEL_RATIO,
        aspect: DEFAULT_ASPECT_RATIO,
    };

    public constructor(host: ReactiveControllerHost, options: ResizeControllerOptions = {}) {
        this.host = host;
        this.options = options;
        this.host.addController(this);
    }

    public get dimensions(): ViewportDimensions {
        return this.currentDimensions;
    }

    public hostConnected(): void {
        const target = this.targetElement;
        if (typeof ResizeObserver !== "undefined" && target) {
            this.observer = new ResizeObserver(this.handleResize);
            this.observer.observe(target);
        }
        this.measureImmediate();
    }

    public hostDisconnected(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.hasMeasured = false;
    }

    public measureImmediate(): ViewportDimensions {
        const target = this.targetElement;
        if (!target) {
            return this.currentDimensions;
        }

        const rect = target.getBoundingClientRect();
        const rawDpr =
            typeof window !== "undefined" &&
            typeof window.devicePixelRatio === "number" &&
            window.devicePixelRatio > MIN_DEVICE_PIXEL_RATIO
                ? window.devicePixelRatio
                : DEFAULT_DEVICE_PIXEL_RATIO;

        const dprCap =
            this.options.dprCap !== undefined &&
            Number.isFinite(this.options.dprCap) &&
            this.options.dprCap > MIN_DEVICE_PIXEL_RATIO
                ? this.options.dprCap
                : Number.POSITIVE_INFINITY;

        const devicePixelRatio = Math.min(rawDpr, dprCap);
        const cssWidth = rect.width;
        const cssHeight = rect.height;
        const width = Math.max(MIN_VIEWPORT_DIMENSION, Math.round(cssWidth * devicePixelRatio));
        const height = Math.max(MIN_VIEWPORT_DIMENSION, Math.round(cssHeight * devicePixelRatio));
        const aspect = width / Math.max(MIN_VIEWPORT_DIMENSION, height);

        const nextDimensions: ViewportDimensions = {
            width,
            height,
            cssWidth,
            cssHeight,
            devicePixelRatio,
            aspect,
        };

        const hasChanged =
            !this.hasMeasured ||
            nextDimensions.width !== this.currentDimensions.width ||
            nextDimensions.height !== this.currentDimensions.height ||
            nextDimensions.cssWidth !== this.currentDimensions.cssWidth ||
            nextDimensions.cssHeight !== this.currentDimensions.cssHeight ||
            nextDimensions.devicePixelRatio !== this.currentDimensions.devicePixelRatio ||
            nextDimensions.aspect !== this.currentDimensions.aspect;

        if (hasChanged) {
            this.hasMeasured = true;
            this.currentDimensions = nextDimensions;
            this.options.onResize?.(nextDimensions);
            this.host.requestUpdate();
        }

        return this.currentDimensions;
    }

    private handleResize = (): void => {
        this.measureImmediate();
    };

    private get targetElement(): HTMLElement | null {
        if (this.options.target) {
            return this.options.target;
        }
        if (
            this.host &&
            typeof (this.host as unknown as HTMLElement).getBoundingClientRect === "function"
        ) {
            return this.host as unknown as HTMLElement;
        }
        return null;
    }
}
