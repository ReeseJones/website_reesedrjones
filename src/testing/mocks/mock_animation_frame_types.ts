import type { Mock } from "vitest";
import type {
    AnimationFrameHandle,
    AnimationFrameRequestCallback,
    IAnimationFrameScheduler,
    Milliseconds,
} from "../../scene/core/animation_frame_manager_types";

/**
 * Deterministic mock animation frame scheduler for pure-CPU simulation testing.
 */
export interface IMockAnimationFrameScheduler extends IAnimationFrameScheduler {
    /** Spy-wrapped requestAnimationFrame scheduler */
    readonly requestAnimationFrame: Mock<(callback: AnimationFrameRequestCallback) => AnimationFrameHandle>;
    /** Spy-wrapped cancelAnimationFrame handler */
    readonly cancelAnimationFrame: Mock<(handle: AnimationFrameHandle) => void>;
    /** Spy-wrapped monotonic clock reader */
    readonly getTimestampMs: Mock<() => Milliseconds>;
    /** Number of currently pending scheduled animation frame callbacks */
    readonly pendingCount: number;
    /** Current simulated monotonic clock timestamp in milliseconds */
    readonly currentTimestampMs: Milliseconds;
    /** Advances the simulated clock by deltaMs and flushes all currently queued animation frame callbacks */
    stepFrame(deltaMs: Milliseconds): void;
    /** Installs requestAnimationFrame, cancelAnimationFrame, and performance.now onto globalThis and returns a cleanup restore closure */
    installGlobal(): () => void;
}
