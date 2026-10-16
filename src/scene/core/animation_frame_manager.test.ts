import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnimationFrameManager } from "./animation_frame_manager";
import {
    DEFAULT_FRAME_SUBSCRIBER_PRIORITY,
    MAX_SIMULATION_DT_SEC,
    MIN_SIMULATION_DT_SEC,
} from "./animation_frame_manager_constants";
import type { AnimationFrameState } from "./animation_frame_manager_types";
import type { TimeInfo } from "../../webgl/canvas/canvas_types";
import { createMockAnimationFrameScheduler } from "../../testing/mocks/mock_animation_frame";
import type { IMockAnimationFrameScheduler } from "../../testing/mocks/mock_animation_frame_types";

const createBaseFrameState = (timeInfo: TimeInfo): AnimationFrameState => ({ timeInfo });

describe("AnimationFrameManager", () => {
    let scheduler: IMockAnimationFrameScheduler;

    beforeEach(() => {
        scheduler = createMockAnimationFrameScheduler(1000);
    });

    describe("constructor", () => {
        it("should initialize idle with subscriberCount = 0, isRunning = false, and zero RAF calls", () => {
            const manager = new AnimationFrameManager(createBaseFrameState, scheduler);
            expect(manager.subscriberCount).toBe(0);
            expect(manager.isRunning).toBe(false);
            expect(scheduler.requestAnimationFrame).not.toHaveBeenCalled();
        });

        it("should pass AnimationFrameState ({ timeInfo }) constructed by createFrameState to subscribers", () => {
            const manager = new AnimationFrameManager(createBaseFrameState, scheduler);
            const received: AnimationFrameState[] = [];

            manager.subscribe((state) => {
                received.push(state);
            });

            scheduler.stepFrame(20);

            expect(received).toHaveLength(1);
            expect(received[0].timeInfo.dt).toBeCloseTo(0.02, 6);
            expect(received[0].timeInfo.time).toBeCloseTo(0.02, 6);
            expect(received[0].timeInfo.frameCount).toBe(1);
        });

        it("should support custom TState factory mode, invoking factory(timeInfo) once per tick and passing custom state to all subscribers", () => {
            interface CustomFrameState extends AnimationFrameState {
                readonly label: string;
            }

            const factorySpy = vi.fn((timeInfo: TimeInfo): CustomFrameState => ({
                label: `tick_${timeInfo.frameCount}`,
                timeInfo,
            }));

            const manager = new AnimationFrameManager<CustomFrameState>(factorySpy, scheduler);
            const sub1Received: CustomFrameState[] = [];
            const sub2Received: CustomFrameState[] = [];

            manager.subscribe((state) => sub1Received.push(state), 1);
            manager.subscribe((state) => sub2Received.push(state), 2);

            scheduler.stepFrame(25);

            expect(factorySpy).toHaveBeenCalledTimes(1);
            expect(sub1Received).toHaveLength(1);
            expect(sub2Received).toHaveLength(1);
            expect(sub1Received[0]).toBe(sub2Received[0]);
            expect(sub1Received[0].label).toBe("tick_1");
            expect(sub1Received[0].timeInfo.dt).toBeCloseTo(0.025, 6);
        });

        it("should delegate to the default browser scheduler when scheduler argument is omitted", () => {
            const restoreGlobal = scheduler.installGlobal();
            try {
                const manager = new AnimationFrameManager(createBaseFrameState);
                const received: AnimationFrameState[] = [];

                const unsub = manager.subscribe((state) => {
                    received.push(state);
                });

                expect(scheduler.getTimestampMs).toHaveBeenCalledTimes(1);
                expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);

                scheduler.stepFrame(16);
                expect(received).toHaveLength(1);
                expect(received[0].timeInfo.dt).toBeCloseTo(0.016, 6);

                unsub();
                expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
            } finally {
                restoreGlobal();
            }
        });
    });

    describe("subscriberCount", () => {
        it("should track active subscriber count across subscribe, idempotent unsubscribe, and destroy", () => {
            const manager = new AnimationFrameManager(createBaseFrameState, scheduler);
            expect(manager.subscriberCount).toBe(0);

            const unsub1 = manager.subscribe(vi.fn());
            expect(manager.subscriberCount).toBe(1);

            const unsub2 = manager.subscribe(vi.fn());
            expect(manager.subscriberCount).toBe(2);

            unsub1();
            expect(manager.subscriberCount).toBe(1);

            // Calling the same unsubscribe closure again is a safe no-op
            unsub1();
            expect(manager.subscriberCount).toBe(1);

            unsub2();
            expect(manager.subscriberCount).toBe(0);

            manager.subscribe(vi.fn());
            manager.subscribe(vi.fn());
            expect(manager.subscriberCount).toBe(2);

            manager.destroy();
            expect(manager.subscriberCount).toBe(0);
        });
    });

    describe("isRunning", () => {
        it("should accurately reflect lifecycle transitions from idle -> scheduled -> mid-tick -> unsubscribed -> destroyed", () => {
            const manager = new AnimationFrameManager(createBaseFrameState, scheduler);
            expect(manager.isRunning).toBe(false);

            let isRunningMidTick = false;
            let unsub: (() => void) | null = null;

            unsub = manager.subscribe(() => {
                // Unsubscribe self during tick; isRunning must still report true while mid-tick
                unsub?.();
                isRunningMidTick = manager.isRunning;
            });

            expect(manager.isRunning).toBe(true);

            scheduler.stepFrame(16);

            expect(isRunningMidTick).toBe(true);
            // After tick finishes with 0 remaining subscribers, loop stops
            expect(manager.isRunning).toBe(false);

            // Re-subscribe and unsubscribe outside tick
            const unsub2 = manager.subscribe(vi.fn());
            expect(manager.isRunning).toBe(true);
            unsub2();
            expect(manager.isRunning).toBe(false);

            // Re-subscribe and destroy
            manager.subscribe(vi.fn());
            expect(manager.isRunning).toBe(true);
            manager.destroy();
            expect(manager.isRunning).toBe(false);
        });
    });

    describe("subscribe()", () => {
        it("should activate RAF on first subscriber, reuse pending RAF on subsequent subscribers, and cancel RAF immediately when last subscriber unsubscribes", () => {
            const manager = new AnimationFrameManager(createBaseFrameState, scheduler);
            expect(scheduler.requestAnimationFrame).not.toHaveBeenCalled();

            const unsub1 = manager.subscribe(vi.fn());
            expect(typeof unsub1).toBe("function");
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(1);

            const unsub2 = manager.subscribe(vi.fn());
            expect(typeof unsub2).toBe("function");
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);

            unsub1();
            expect(scheduler.cancelAnimationFrame).not.toHaveBeenCalled();
            expect(scheduler.pendingCount).toBe(1);

            unsub2();
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledWith(1);
            expect(scheduler.pendingCount).toBe(0);
        });

        it("should execute subscribers in ascending priority order (a.priority - b.priority), defaulting to DEFAULT_FRAME_SUBSCRIBER_PRIORITY (0)", () => {
            const manager = new AnimationFrameManager(createBaseFrameState, scheduler);
            const order: string[] = [];

            manager.subscribe(() => order.push("p_10"), 10);
            manager.subscribe(() => order.push(`default_${DEFAULT_FRAME_SUBSCRIBER_PRIORITY}`));
            const unsubNeg5 = manager.subscribe(() => order.push("p_-5"), -5);
            manager.subscribe(() => order.push("p_2"), 2);

            scheduler.stepFrame(16);
            expect(order).toEqual(["p_-5", "default_0", "p_2", "p_10"]);

            // Subsequent tick without subscriber changes uses cached sorted order
            order.length = 0;
            scheduler.stepFrame(16);
            expect(order).toEqual(["p_-5", "default_0", "p_2", "p_10"]);

            // Unsubscribing and adding a new subscriber marks dirty and resorts
            order.length = 0;
            unsubNeg5();
            manager.subscribe(() => order.push("p_-20"), -20);
            scheduler.stepFrame(16);
            expect(order).toEqual(["p_-20", "default_0", "p_2", "p_10"]);
        });

        it("should clamp dt between MIN_SIMULATION_DT_SEC (0.0001) and MAX_SIMULATION_DT_SEC (0.1) across zero, negative, huge, and nominal intervals", () => {
            const manager = new AnimationFrameManager(createBaseFrameState, scheduler);
            const frames: TimeInfo[] = [];

            manager.subscribe(({ timeInfo }) => {
                frames.push(timeInfo);
            });

            // Tick 1: Zero elapsed ms -> MIN_SIMULATION_DT_SEC
            scheduler.stepFrame(0);
            expect(frames[0].dt).toBe(MIN_SIMULATION_DT_SEC);
            expect(frames[0].time).toBeCloseTo(MIN_SIMULATION_DT_SEC, 6);
            expect(frames[0].frameCount).toBe(1);

            // Tick 2: Negative elapsed ms -> MIN_SIMULATION_DT_SEC
            scheduler.stepFrame(-100);
            expect(frames[1].dt).toBe(MIN_SIMULATION_DT_SEC);
            expect(frames[1].time).toBeCloseTo(MIN_SIMULATION_DT_SEC * 2, 6);
            expect(frames[1].frameCount).toBe(2);

            // Tick 3: Huge elapsed ms (3000ms) -> MAX_SIMULATION_DT_SEC
            scheduler.stepFrame(3000);
            expect(frames[2].dt).toBe(MAX_SIMULATION_DT_SEC);
            expect(frames[2].time).toBeCloseTo(MIN_SIMULATION_DT_SEC * 2 + MAX_SIMULATION_DT_SEC, 6);
            expect(frames[2].frameCount).toBe(3);

            // Tick 4: Nominal 40ms (0.04s) -> unclamped
            scheduler.stepFrame(40);
            expect(frames[3].dt).toBeCloseTo(0.04, 6);
            expect(frames[3].time).toBeCloseTo(
                MIN_SIMULATION_DT_SEC * 2 + MAX_SIMULATION_DT_SEC + 0.04,
                6
            );
            expect(frames[3].frameCount).toBe(4);
        });

        it("should safely handle mid-tick unsubscription by skipping downstream unsubscribed callbacks and not scheduling another RAF when subscriberCount reaches 0", () => {
            const manager = new AnimationFrameManager(createBaseFrameState, scheduler);
            let unsub1: (() => void) | null = null;
            let unsub2: (() => void) | null = null;

            const sub2Spy = vi.fn();
            const sub1Spy = vi.fn(() => {
                unsub1?.();
                unsub2?.();
            });

            unsub1 = manager.subscribe(sub1Spy, 1);
            unsub2 = manager.subscribe(sub2Spy, 2);

            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);

            expect(() => {
                scheduler.stepFrame(16);
            }).not.toThrow();

            expect(sub1Spy).toHaveBeenCalledTimes(1);
            expect(sub2Spy).not.toHaveBeenCalled();
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(0);
            expect(manager.subscriberCount).toBe(0);
            expect(manager.isRunning).toBe(false);
        });
    });

    describe("destroy()", () => {
        it("should cancel any pending requestAnimationFrame, clear all subscribers, and set subscriberCount to 0 and isRunning to false", () => {
            const manager = new AnimationFrameManager(createBaseFrameState, scheduler);
            const subSpy = vi.fn();

            manager.subscribe(subSpy);
            expect(manager.subscriberCount).toBe(1);
            expect(manager.isRunning).toBe(true);
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);

            expect(manager.destroy()).toBeUndefined();

            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledWith(1);
            expect(scheduler.pendingCount).toBe(0);
            expect(manager.subscriberCount).toBe(0);
            expect(manager.isRunning).toBe(false);

            // Calling destroy() again when already idle is a safe no-op
            expect(manager.destroy()).toBeUndefined();
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
        });
    });
});
