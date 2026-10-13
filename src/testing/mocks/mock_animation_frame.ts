import { vi } from "vitest";
import type {
    AnimationFrameHandle,
    AnimationFrameRequestCallback,
    Milliseconds,
} from "../../scene/core/animation_frame_manager_types";
import type { IMockAnimationFrameScheduler } from "./mock_animation_frame_types";

/**
 * Creates a deterministic, spy-wrapped IAnimationFrameScheduler for unit testing
 * AnimationFrameManager, Scene, and declarative <Scene /> loops without browser timers.
 */
export function createMockAnimationFrameScheduler(
    initialTimestampMs: Milliseconds = 1000
): IMockAnimationFrameScheduler {
    const rafQueue = new Map<AnimationFrameHandle, AnimationFrameRequestCallback>();
    let nextRafId: AnimationFrameHandle = 0;
    let currentNowMs: Milliseconds = initialTimestampMs;

    const requestAnimationFrame = vi.fn(
        (callback: AnimationFrameRequestCallback): AnimationFrameHandle => {
            nextRafId += 1;
            const handle = nextRafId;
            rafQueue.set(handle, callback);
            return handle;
        }
    );

    const cancelAnimationFrame = vi.fn((handle: AnimationFrameHandle): void => {
        rafQueue.delete(handle);
    });

    const getTimestampMs = vi.fn((): Milliseconds => currentNowMs);

    const stepFrame = (deltaMs: Milliseconds): void => {
        currentNowMs += deltaMs;
        const pending = Array.from(rafQueue.entries());
        rafQueue.clear();
        for (const [, callback] of pending) {
            callback(currentNowMs);
        }
    };

    const installGlobal = (): (() => void) => {
        const hadRaf = "requestAnimationFrame" in globalThis;
        const originalRaf = globalThis.requestAnimationFrame;
        const hadCancelRaf = "cancelAnimationFrame" in globalThis;
        const originalCancelRaf = globalThis.cancelAnimationFrame;

        const perfNowSpy = vi.spyOn(performance, "now").mockImplementation(getTimestampMs);
        (globalThis as unknown as Record<string, unknown>).requestAnimationFrame = requestAnimationFrame;
        (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame = cancelAnimationFrame;

        return () => {
            perfNowSpy.mockRestore();
            if (hadRaf) {
                globalThis.requestAnimationFrame = originalRaf;
            } else {
                delete (globalThis as unknown as Record<string, unknown>).requestAnimationFrame;
            }
            if (hadCancelRaf) {
                globalThis.cancelAnimationFrame = originalCancelRaf;
            } else {
                delete (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame;
            }
        };
    };

    return {
        requestAnimationFrame,
        cancelAnimationFrame,
        getTimestampMs,
        get pendingCount(): number {
            return rafQueue.size;
        },
        get currentTimestampMs(): Milliseconds {
            return currentNowMs;
        },
        stepFrame,
        installGlobal,
    };
}
