import type { ReactiveController } from "lit";
import type {
    ElementControllerHost,
    IResizeController,
    IResizeObserverLike,
    ResizeControllerOptions,
    ViewportDimensions,
} from "./resize_controller_types";
import {
    DEFAULT_ASPECT_RATIO,
    DEFAULT_DEVICE_PIXEL_RATIO,
    DEFAULT_FALLBACK_DIMENSION,
    MIN_DEBOUNCE_MS,
    MIN_DEVICE_PIXEL_RATIO,
    MIN_VIEWPORT_DIMENSION,
} from "./resize_controller_constants";

/**
 * Lit Reactive Controller observing element or viewport resize changes,
 * applying DPR scaling, and notifying host elements and subscribers.
 */
export class ResizeController implements ReactiveController, IResizeController {
    private readonly host: ElementControllerHost;
    private readonly target: HTMLElement;
    private readonly options: ResizeControllerOptions;
    private observer: IResizeObserverLike | null = null;
    private debounceTimerId: ReturnType<typeof setTimeout> | null = null;
    private hasMeasured: boolean = false;

    private currentDimensions: ViewportDimensions = {
        width: DEFAULT_FALLBACK_DIMENSION,
        height: DEFAULT_FALLBACK_DIMENSION,
        cssWidth: DEFAULT_FALLBACK_DIMENSION,
        cssHeight: DEFAULT_FALLBACK_DIMENSION,
        devicePixelRatio: DEFAULT_DEVICE_PIXEL_RATIO,
        aspect: DEFAULT_ASPECT_RATIO,
    };

    public constructor(host: ElementControllerHost, options: ResizeControllerOptions) {
        this.host = host;
        this.options = options;
        this.target = options.target ?? host;
        this.host.addController(this);
    }

    public get dimensions(): ViewportDimensions {
        return this.currentDimensions;
    }

    public hostConnected(): void {
        this.observer = this.options.observerFactory.create(this.handleResize);
        this.observer.observe(this.target);
        this.measureImmediate();
    }

    public hostDisconnected(): void {
        if (this.debounceTimerId !== null) {
            clearTimeout(this.debounceTimerId);
            this.debounceTimerId = null;
        }
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.hasMeasured = false;
    }

    public measureImmediate(): ViewportDimensions {
        if (this.debounceTimerId !== null) {
            clearTimeout(this.debounceTimerId);
            this.debounceTimerId = null;
        }

        const rect = this.target.getBoundingClientRect();
        const devicePixelRatio =
            typeof window !== "undefined" &&
            typeof window.devicePixelRatio === "number" &&
            window.devicePixelRatio > MIN_DEVICE_PIXEL_RATIO
                ? window.devicePixelRatio
                : DEFAULT_DEVICE_PIXEL_RATIO;
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
        const debounceMs = this.options.debounceMs;
        if (debounceMs !== undefined && debounceMs > MIN_DEBOUNCE_MS) {
            if (this.debounceTimerId !== null) {
                clearTimeout(this.debounceTimerId);
            }
            this.debounceTimerId = setTimeout(() => {
                this.debounceTimerId = null;
                this.measureImmediate();
            }, debounceMs);
        } else {
            this.measureImmediate();
        }
    };

}
