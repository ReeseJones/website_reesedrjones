import {
    DEFAULT_FRAME_SUBSCRIBER_PRIORITY,
    MAX_SIMULATION_DT_SEC,
    MIN_SIMULATION_DT_SEC,
    MS_PER_SECOND,
} from "./animation_frame_manager_constants";
import type {
    AnimationFrameCallback,
    AnimationFrameHandle,
    AnimationFrameState,
    AnimationFrameStateFactory,
    AnimationFrameSubscriber,
    IAnimationFrameManager,
    IAnimationFrameScheduler,
    Milliseconds,
} from "./animation_frame_manager_types";
import type { TimeInfo } from "../../components/webgl_canvas/types";

const defaultBrowserScheduler: IAnimationFrameScheduler = {
    requestAnimationFrame: (callback) => globalThis.requestAnimationFrame(callback),
    cancelAnimationFrame: (handle) => globalThis.cancelAnimationFrame(handle),
    getTimestampMs: () => performance.now(),
};

/**
 * Demand-driven, priority-ordered requestAnimationFrame scheduler and simulation clock.
 */
export class AnimationFrameManager<
    TState extends AnimationFrameState = AnimationFrameState,
> implements IAnimationFrameManager<TState> {
    private readonly _createFrameState: AnimationFrameStateFactory<TState>;
    private readonly _scheduler: IAnimationFrameScheduler;
    private _subscribersMap: Map<string, AnimationFrameSubscriber<TState>> = new Map();
    private _sortedSubscribers: AnimationFrameSubscriber<TState>[] = [];
    private _isSubscribersDirty: boolean = false;
    private _nextSubscriberId: number = 0;
    private _rafId: AnimationFrameHandle | null = null;
    private _isTicking: boolean = false;
    private _lastTimeMs: Milliseconds = 0;
    private _elapsedTime: number = 0;
    private _frameCount: number = 0;

    constructor(
        createFrameState: AnimationFrameStateFactory<TState>,
        scheduler: IAnimationFrameScheduler = defaultBrowserScheduler
    ) {
        this._createFrameState = createFrameState;
        this._scheduler = scheduler;
    }

    public get subscriberCount(): number {
        return this._subscribersMap.size;
    }

    public get isRunning(): boolean {
        return this._rafId !== null || this._isTicking;
    }

    public subscribe(
        callback: AnimationFrameCallback<TState>,
        priority: number = DEFAULT_FRAME_SUBSCRIBER_PRIORITY
    ): () => void {
        this._nextSubscriberId += 1;
        const id = `frame_sub_${this._nextSubscriberId}`;
        const subscriber: AnimationFrameSubscriber<TState> = {
            id,
            priority,
            callback,
        };

        this._subscribersMap.set(id, subscriber);
        this._isSubscribersDirty = true;

        if (this._rafId === null && !this._isTicking) {
            const tick = (nowMs: Milliseconds): void => {
                if (this._subscribersMap.size === 0) {
                    this._rafId = null;
                    return;
                }

                const rawDt = (nowMs - this._lastTimeMs) / MS_PER_SECOND;
                const dt = Math.min(
                    Math.max(rawDt, MIN_SIMULATION_DT_SEC),
                    MAX_SIMULATION_DT_SEC
                );
                this._lastTimeMs = nowMs;
                this._elapsedTime += dt;
                this._frameCount += 1;

                if (this._isSubscribersDirty) {
                    this._sortedSubscribers = Array.from(this._subscribersMap.values()).sort(
                        (a, b) => a.priority - b.priority
                    );
                    this._isSubscribersDirty = false;
                }

                const timeInfo: TimeInfo = {
                    time: this._elapsedTime,
                    dt,
                    frameCount: this._frameCount,
                };

                const frameState = this._createFrameState(timeInfo);

                this._isTicking = true;
                const currentSubscribers = this._sortedSubscribers;
                for (let i = 0; i < currentSubscribers.length; i++) {
                    const sub = currentSubscribers[i];
                    if (this._subscribersMap.has(sub.id)) {
                        sub.callback(frameState);
                    }
                }
                this._isTicking = false;

                if (this._subscribersMap.size > 0) {
                    this._rafId = this._scheduler.requestAnimationFrame(tick);
                } else {
                    this._rafId = null;
                }
            };

            this._lastTimeMs = this._scheduler.getTimestampMs();
            this._rafId = this._scheduler.requestAnimationFrame(tick);
        }

        return () => {
            this._subscribersMap.delete(id);
            this._isSubscribersDirty = true;

            if (this._subscribersMap.size === 0 && this._rafId !== null && !this._isTicking) {
                this._scheduler.cancelAnimationFrame(this._rafId);
                this._rafId = null;
            }
        };
    }

    public destroy(): void {
        if (this._rafId !== null) {
            this._scheduler.cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._subscribersMap.clear();
        this._sortedSubscribers = [];
    }
}
