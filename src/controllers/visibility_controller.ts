import type { ReactiveController } from "lit";
import type {
    ElementControllerHost,
    IIntersectionObserverEntryLike,
    IIntersectionObserverLike,
    IVisibilityController,
    VisibilityControllerOptions,
} from "./visibility_controller_types";
import {
    DEFAULT_PAUSE_WHEN_HIDDEN,
    DEFAULT_PAUSE_WHEN_OFFSCREEN,
    EVENT_VISIBILITY_CHANGE,
    INTERSECTION_RATIO_OFFSCREEN,
} from "./visibility_controller_constants";

/**
 * Lit Reactive Controller tracking element viewport intersection and document visibility,
 * computing aggregate visibility state to throttle or pause expensive animation and WebGL render loops.
 */
export class VisibilityController implements ReactiveController, IVisibilityController {
    private readonly host: ElementControllerHost;
    private target: HTMLElement;
    private options: VisibilityControllerOptions;
    private isConnected: boolean = false;
    private intersectionObserver: IIntersectionObserverLike | null = null;
    private _isOffscreen: boolean = false;
    private _isHidden: boolean = false;
    private _isVisible: boolean = true;

    public constructor(host: ElementControllerHost, options: VisibilityControllerOptions) {
        this.host = host;
        this.options = options;
        this.target = options.target ?? host;
        this.host.addController(this);

        const pauseHidden = this.options.pauseWhenHidden ?? DEFAULT_PAUSE_WHEN_HIDDEN;
        this._isHidden = pauseHidden && typeof document !== "undefined" ? document.hidden : false;
        this._isVisible = !this._isOffscreen && !this._isHidden;
    }

    public get isVisible(): boolean {
        return this._isVisible;
    }

    public get isOffscreen(): boolean {
        return this._isOffscreen;
    }

    public get isHidden(): boolean {
        return this._isHidden;
    }

    public hostConnected(): void {
        this.isConnected = true;
        this.syncObservers();
    }

    public hostDisconnected(): void {
        this.isConnected = false;
        this.teardownObservers();
    }

    /**
     * Reconfigures visibility options and synchronizes observers with the updated settings.
     *
     * @param options Optional partial configuration overrides.
     */
    public reconfigure(options?: Partial<VisibilityControllerOptions>): void {
        const targetChanged = options?.target !== undefined && options.target !== this.target;
        if (options) {
            this.options = {
                ...this.options,
                ...options,
            };
            if (options.target !== undefined) {
                this.target = options.target ?? this.host;
            }
        }

        if (targetChanged && this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }

        if (this.isConnected) {
            this.syncObservers();
        } else {
            const pauseHidden = this.options.pauseWhenHidden ?? DEFAULT_PAUSE_WHEN_HIDDEN;
            this._isHidden = pauseHidden && typeof document !== "undefined" ? document.hidden : false;
            this._isOffscreen = false;
            this.updateVisibility();
        }
    }

    private teardownObservers(): void {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }

        if (typeof document !== "undefined") {
            document.removeEventListener(EVENT_VISIBILITY_CHANGE, this.handleVisibilityChange);
        }
    }

    private syncObservers(): void {
        const pauseOffscreen = this.options.pauseWhenOffscreen ?? DEFAULT_PAUSE_WHEN_OFFSCREEN;
        const pauseHidden = this.options.pauseWhenHidden ?? DEFAULT_PAUSE_WHEN_HIDDEN;

        if (pauseHidden && typeof document !== "undefined") {
            this._isHidden = document.hidden;
            document.removeEventListener(EVENT_VISIBILITY_CHANGE, this.handleVisibilityChange);
            document.addEventListener(EVENT_VISIBILITY_CHANGE, this.handleVisibilityChange);
        } else {
            if (typeof document !== "undefined") {
                document.removeEventListener(EVENT_VISIBILITY_CHANGE, this.handleVisibilityChange);
            }
            this._isHidden = false;
        }

        if (pauseOffscreen) {
            if (!this.intersectionObserver) {
                this.intersectionObserver = this.options.observerFactory.create(this.handleIntersection);
                this.intersectionObserver.observe(this.target);
            }
        } else {
            if (this.intersectionObserver) {
                this.intersectionObserver.disconnect();
                this.intersectionObserver = null;
            }
            this._isOffscreen = false;
        }

        this.updateVisibility();
    }

    private handleIntersection = (entries: readonly IIntersectionObserverEntryLike[]): void => {
        const entry = entries[0];
        if (!entry) {
            return;
        }

        const isOffscreen =
            entry.isIntersecting === false ||
            entry.intersectionRatio <= INTERSECTION_RATIO_OFFSCREEN;

        if (this._isOffscreen !== isOffscreen) {
            this._isOffscreen = isOffscreen;
            this.updateVisibility();
        }
    };

    private handleVisibilityChange = (): void => {
        if (typeof document === "undefined") {
            return;
        }

        const isHidden = document.hidden;
        if (this._isHidden !== isHidden) {
            this._isHidden = isHidden;
            this.updateVisibility();
        }
    };

    private updateVisibility(): void {
        const nextVisible = !this._isOffscreen && !this._isHidden;
        if (this._isVisible !== nextVisible) {
            this._isVisible = nextVisible;
            this.host.requestUpdate();
            this.options.onChange?.(nextVisible);
        }
    }
}
