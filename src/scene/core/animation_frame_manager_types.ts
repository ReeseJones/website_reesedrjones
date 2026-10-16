import type { TimeInfo } from "../../webgl/canvas/canvas_types";

/**
 * Opaque numeric handle identifying a scheduled requestAnimationFrame callback.
 */
export type AnimationFrameHandle = number;

/**
 * High-resolution monotonic timestamp or duration in milliseconds (DOMHighResTimeStamp).
 */
export type Milliseconds = number;

/**
 * Browser requestAnimationFrame callback receiving the current monotonic timestamp in milliseconds.
 */
export type AnimationFrameRequestCallback = (timestampMs: Milliseconds) => void;

/**
 * Injectable timing and animation frame scheduling provider.
 */
export interface IAnimationFrameScheduler {
    /** Schedules a callback for the next animation frame and returns its handle */
    readonly requestAnimationFrame: (callback: AnimationFrameRequestCallback) => AnimationFrameHandle;
    /** Cancels a previously scheduled animation frame callback by its handle */
    readonly cancelAnimationFrame: (handle: AnimationFrameHandle) => void;
    /** Returns the current monotonic timestamp in milliseconds (e.g., performance.now()) */
    readonly getTimestampMs: () => Milliseconds;
}

/**
 * Base execution state delivered to every AnimationFrameManager subscriber on each tick.
 */
export interface AnimationFrameState {
    /** Simulation timing metrics (elapsed seconds, clamped delta seconds, tick count) */
    readonly timeInfo: TimeInfo;
}

/**
 * Callback invoked on each tick of the AnimationFrameManager loop.
 */
export type AnimationFrameCallback<TState extends AnimationFrameState = AnimationFrameState> = (
    state: TState
) => void;

/**
 * Factory function invoked once per tick to construct the frame state payload from TimeInfo.
 */
export type AnimationFrameStateFactory<TState extends AnimationFrameState = AnimationFrameState> = (
    timeInfo: TimeInfo
) => TState;

/**
 * Internal subscriber record managed by AnimationFrameManager.
 */
export interface AnimationFrameSubscriber<TState extends AnimationFrameState = AnimationFrameState> {
    readonly id: string;
    readonly priority: number;
    readonly callback: AnimationFrameCallback<TState>;
}

/**
 * Demand-driven, priority-ordered requestAnimationFrame loop manager.
 */
export interface IAnimationFrameManager<TState extends AnimationFrameState = AnimationFrameState> {
    /** Number of currently active subscribers */
    readonly subscriberCount: number;

    /** Whether a requestAnimationFrame tick is currently scheduled or executing */
    readonly isRunning: boolean;

    /**
     * Registers a frame callback at the given priority (lower numbers run first; default: 0).
     * Starts the RAF loop if not already running. Returns an unsubscribe cleanup closure.
     */
    subscribe(callback: AnimationFrameCallback<TState>, priority?: number): () => void;

    /**
     * Cancels any pending requestAnimationFrame and clears all subscribers.
     */
    destroy(): void;
}
