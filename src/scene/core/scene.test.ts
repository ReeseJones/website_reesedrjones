import { describe, it, expect, vi, beforeEach } from "vitest";
import { Scene } from "./scene";
import { SceneNode } from "./scene_node";
import {
    DEFAULT_FRAME_SUBSCRIBER_PRIORITY,
    MAX_SIMULATION_DT_SEC,
    MIN_SIMULATION_DT_SEC,
} from "./animation_frame_manager_constants";
import type { SceneFrameState } from "./scene_types";
import { PerspectiveCamera } from "../camera/perspective_camera";
import { createMockAnimationFrameScheduler } from "../../testing/mocks/mock_animation_frame";
import type { IMockAnimationFrameScheduler } from "../../testing/mocks/mock_animation_frame_types";

/** Matrix index of the X translation component in a column-major 4x4 matrix. */
const TX = 12;
/** Matrix index of the Y translation component in a column-major 4x4 matrix. */
const TY = 13;
/** Matrix index of the Z translation component in a column-major 4x4 matrix. */
const TZ = 14;
const PRECISION = 5;

function collectVisibleNames(scene: Scene): string[] {
    const names: string[] = [];
    scene.traverseVisible((node) => names.push(node.name));
    return names;
}

describe("Scene", () => {
    describe("constructor", () => {
        it("should create a SceneNode named 'SceneRoot' by default", () => {
            const scene = new Scene();
            expect(scene).toBeInstanceOf(SceneNode);
            expect(scene.name).toBe("SceneRoot");
        });

        it("should accept a custom name and optional id", () => {
            const scene = new Scene("Level1", "custom_id_1");
            expect(scene.name).toBe("Level1");
            expect(scene.id).toBe("custom_id_1");
        });

        it("should initialize with no parent and no children", () => {
            const scene = new Scene();
            expect(scene.parent).toBeNull();
            expect(scene.children.length).toBe(0);
        });

        it("should initialize activeCamera as null", () => {
            const scene = new Scene();
            expect(scene.activeCamera).toBeNull();
        });
    });

    describe("activeCamera", () => {
        it("should allow assigning and retrieving an active camera", () => {
            const scene = new Scene();
            const camera = new PerspectiveCamera({}, "TestCamera");
            scene.activeCamera = camera;
            expect(scene.activeCamera).toBe(camera);
        });
    });

    describe("registerCamera()", () => {
        it("should automatically appoint the first registered camera as activeCamera and return an unregister closure", () => {
            const scene = new Scene();
            const cam1 = new PerspectiveCamera({}, "Cam1");

            const unregister = scene.registerCamera(cam1);
            expect(typeof unregister).toBe("function");
            expect(scene.activeCamera).toBe(cam1);
        });

        it("should preserve existing activeCamera when a secondary camera registers without makeDefault, and switch when makeDefault is true", () => {
            const scene = new Scene();
            const cam1 = new PerspectiveCamera({}, "Cam1");
            const cam2 = new PerspectiveCamera({}, "Cam2");
            const cam3 = new PerspectiveCamera({}, "Cam3");

            scene.registerCamera(cam1);
            expect(scene.activeCamera).toBe(cam1);

            scene.registerCamera(cam2, false);
            expect(scene.activeCamera).toBe(cam1);

            scene.registerCamera(cam3, true);
            expect(scene.activeCamera).toBe(cam3);
        });

        it("should deduplicate when the same camera instance is registered multiple times", () => {
            const scene = new Scene();
            const cam1 = new PerspectiveCamera({}, "Cam1");
            const cam2 = new PerspectiveCamera({}, "Cam2");

            const unreg1A = scene.registerCamera(cam1);
            scene.registerCamera(cam1, true);
            scene.registerCamera(cam2, true);
            expect(scene.activeCamera).toBe(cam2);

            // Unregistering cam1 once removes it from the registry completely
            unreg1A();

            // When cam2 unregisters, activeCamera becomes null rather than falling back to a duplicate cam1
            const unreg2 = scene.registerCamera(cam2, true);
            unreg2();
            expect(scene.activeCamera).toBeNull();
        });

        it("should fall back to the most recently registered remaining camera when activeCamera unregisters, or null when none remain", () => {
            const scene = new Scene();
            const cam1 = new PerspectiveCamera({}, "Cam1");
            const cam2 = new PerspectiveCamera({}, "Cam2");
            const cam3 = new PerspectiveCamera({}, "Cam3");

            const unreg1 = scene.registerCamera(cam1);
            const unreg2 = scene.registerCamera(cam2);
            const unreg3 = scene.registerCamera(cam3, true);

            expect(scene.activeCamera).toBe(cam3);

            // Unregistering active cam3 falls back to most recently registered remaining camera (cam2)
            unreg3();
            expect(scene.activeCamera).toBe(cam2);

            // Unregistering non-active cam1 keeps cam2 as activeCamera
            unreg1();
            expect(scene.activeCamera).toBe(cam2);

            // Unregistering last remaining camera resets activeCamera to null
            unreg2();
            expect(scene.activeCamera).toBeNull();
        });
    });

    describe("addChild()", () => {
        it("should attach the node as a child and return this for chaining", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            const result = scene.addChild(node);
            expect(result).toBe(scene);
            expect(scene.children).toContain(node);
            expect(node.parent).toBe(scene);
        });

        it("should support fluent chaining of multiple child additions", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            const b = new SceneNode("B");
            const c = new SceneNode("C");
            expect(scene.addChild(a).addChild(b).addChild(c)).toBe(scene);
            expect(scene.children).toEqual([a, b, c]);
        });

        it("should be idempotent when adding the same node twice", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            scene.addChild(node);
            const result = scene.addChild(node);
            expect(result).toBe(scene);
            expect(scene.children.length).toBe(1);
        });

        it("should reparent a node that already belongs to another parent", () => {
            const scene = new Scene();
            const oldParent = new SceneNode("OldParent");
            const node = new SceneNode("A");
            oldParent.addChild(node);

            scene.addChild(node);
            expect(oldParent.children.length).toBe(0);
            expect(node.parent).toBe(scene);
            expect(scene.children).toEqual([node]);
        });

        it("should move a node from one scene to another", () => {
            const s1 = new Scene();
            const s2 = new Scene();
            const node = new SceneNode("A");
            s1.addChild(node);
            s2.addChild(node);
            expect(s1.children.length).toBe(0);
            expect(s2.children).toEqual([node]);
            expect(node.parent).toBe(s2);
        });
    });

    describe("removeChild()", () => {
        it("should detach a child node and return true", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            scene.addChild(node);
            expect(scene.removeChild(node)).toBe(true);
            expect(scene.children.length).toBe(0);
            expect(node.parent).toBeNull();
        });

        it("should return false for a node not in the scene", () => {
            const scene = new Scene();
            const node = new SceneNode("Stranger");
            expect(scene.removeChild(node)).toBe(false);
            expect(node.parent).toBeNull();
        });

        it("should return false when removing the same node twice", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            scene.addChild(node);
            expect(scene.removeChild(node)).toBe(true);
            expect(scene.removeChild(node)).toBe(false);
        });

        it("should keep remaining siblings in order", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            const b = new SceneNode("B");
            const c = new SceneNode("C");
            scene.addChild(a).addChild(b).addChild(c);
            expect(scene.removeChild(b)).toBe(true);
            expect(scene.children).toEqual([a, c]);
        });
    });

    describe(".update()", () => {
        it("should clear world-dirty flags across the whole graph", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            scene.addChild(parent);

            scene.update();
            expect(scene.isWorldDirty).toBe(false);
            expect(parent.isWorldDirty).toBe(false);
            expect(child.isWorldDirty).toBe(false);
        });

        it("should be safe to call on an empty scene", () => {
            const scene = new Scene();
            expect(() => scene.update()).not.toThrow();
            expect(scene.isWorldDirty).toBe(false);
        });

        it("should compose world matrices hierarchically (M_world = M_parent * M_local)", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.transform.setPosition(1, 2, 3);
            child.transform.setPosition(10, 20, 30);
            parent.addChild(child);
            scene.addChild(parent);

            scene.update();

            expect(parent.worldMatrix[TX]).toBeCloseTo(1, PRECISION);
            expect(parent.worldMatrix[TY]).toBeCloseTo(2, PRECISION);
            expect(parent.worldMatrix[TZ]).toBeCloseTo(3, PRECISION);
            expect(child.worldMatrix[TX]).toBeCloseTo(11, PRECISION);
            expect(child.worldMatrix[TY]).toBeCloseTo(22, PRECISION);
            expect(child.worldMatrix[TZ]).toBeCloseTo(33, PRECISION);
        });

        it("should apply scene root transform to children", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            node.transform.setPosition(1, 0, 0);
            scene.transform.setScale(2, 2, 2);
            scene.addChild(node);

            scene.update();

            expect(node.worldMatrix[TX]).toBeCloseTo(2, PRECISION);
            expect(node.worldMatrix[0]).toBeCloseTo(2, PRECISION);
        });

        it("should cascade computedVisible from hidden ancestors", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            scene.addChild(parent);

            parent.visible = false;
            scene.update();
            expect(parent.computedVisible).toBe(false);
            expect(child.computedVisible).toBe(false);
            expect(child.visible).toBe(true);

            parent.visible = true;
            scene.update();
            expect(parent.computedVisible).toBe(true);
            expect(child.computedVisible).toBe(true);
        });
    });

    describe(".traverseVisible()", () => {
        it("should visit only the scene for an empty scene", () => {
            const scene = new Scene();
            scene.update();
            const callback = vi.fn();
            expect(scene.traverseVisible(callback)).toBeUndefined();
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(scene);
        });

        it("should visit all nodes in depth-first pre-order when all are visible", () => {
            const scene = new Scene("Root");
            const a = new SceneNode("A");
            const a1 = new SceneNode("A1");
            const a2 = new SceneNode("A2");
            const b = new SceneNode("B");
            a.addChild(a1).addChild(a2);
            scene.addChild(a).addChild(b);
            scene.update();

            expect(collectVisibleNames(scene)).toEqual(["Root", "A", "A1", "A2", "B"]);
        });

        it("should prune an invisible node and its entire subtree", () => {
            const scene = new Scene("Root");
            const a = new SceneNode("A");
            const a1 = new SceneNode("A1");
            const b = new SceneNode("B");
            a.addChild(a1);
            scene.addChild(a).addChild(b);

            a.visible = false;
            scene.update();

            expect(collectVisibleNames(scene)).toEqual(["Root", "B"]);
        });

        it("should skip only a hidden leaf while visiting its visible siblings", () => {
            const scene = new Scene("Root");
            const a = new SceneNode("A");
            const a1 = new SceneNode("A1");
            const a2 = new SceneNode("A2");
            a.addChild(a1).addChild(a2);
            scene.addChild(a);

            a1.visible = false;
            scene.update();

            expect(collectVisibleNames(scene)).toEqual(["Root", "A", "A2"]);
        });

        it("should visit nothing when the scene itself is hidden", () => {
            const scene = new Scene();
            scene.addChild(new SceneNode("A"));
            scene.visible = false;
            scene.update();

            const callback = vi.fn();
            scene.traverseVisible(callback);
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe(".clear()", () => {
        it("should remove all direct child nodes", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            const b = new SceneNode("B");
            scene.addChild(a).addChild(b);

            expect(scene.clear()).toBeUndefined();
            expect(scene.children.length).toBe(0);
            expect(a.parent).toBeNull();
            expect(b.parent).toBeNull();
        });

        it("should destroy every child node exactly once", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            const b = new SceneNode("B");
            scene.addChild(a).addChild(b);
            const spyA = vi.spyOn(a, "destroy");
            const spyB = vi.spyOn(b, "destroy");

            scene.clear();
            expect(spyA).toHaveBeenCalledTimes(1);
            expect(spyB).toHaveBeenCalledTimes(1);
        });

        it("should preserve the scene node itself so it remains usable", () => {
            const scene = new Scene("Root");
            scene.addChild(new SceneNode("A"));
            scene.clear();

            const b = new SceneNode("B");
            expect(scene.addChild(b)).toBe(scene);
            scene.update();
            expect(collectVisibleNames(scene)).toEqual(["Root", "B"]);
        });
    });

    describe("subscribeFrame()", () => {
        let scheduler: IMockAnimationFrameScheduler;

        beforeEach(() => {
            scheduler = createMockAnimationFrameScheduler(1000);
        });

        it("should not call requestAnimationFrame on new Scene() until the first subscriber registers, and should cancel RAF immediately when the last subscriber unsubscribes", () => {
            const scene = new Scene("SceneRoot", undefined, scheduler);
            expect(scheduler.requestAnimationFrame).not.toHaveBeenCalled();

            const sub1 = vi.fn();
            const sub2 = vi.fn();

            const unsub1 = scene.subscribeFrame(sub1);
            expect(typeof unsub1).toBe("function");
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(1);

            // Second subscriber reuses the existing scheduled RAF
            const unsub2 = scene.subscribeFrame(sub2);
            expect(typeof unsub2).toBe("function");
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);

            // Unsubscribing first subscriber leaves 1 active, so RAF is not cancelled
            unsub1();
            expect(scheduler.cancelAnimationFrame).not.toHaveBeenCalled();
            expect(scheduler.pendingCount).toBe(1);

            // Unsubscribing last subscriber immediately cancels pending RAF
            unsub2();
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledWith(1);
            expect(scheduler.pendingCount).toBe(0);
        });

        it("should execute subscribers in ascending priority order (a.priority - b.priority), defaulting to DEFAULT_FRAME_SUBSCRIBER_PRIORITY (0)", () => {
            const scene = new Scene("SceneRoot", undefined, scheduler);
            const executionOrder: string[] = [];

            scene.subscribeFrame(() => {
                executionOrder.push("priority_10");
            }, 10);

            scene.subscribeFrame(() => {
                executionOrder.push(`default_${DEFAULT_FRAME_SUBSCRIBER_PRIORITY}`);
            });

            scene.subscribeFrame(() => {
                executionOrder.push("priority_-5");
            }, -5);

            scene.subscribeFrame(() => {
                executionOrder.push("priority_2");
            }, 2);

            scheduler.stepFrame(16);

            expect(executionOrder).toEqual([
                "priority_-5",
                "default_0",
                "priority_2",
                "priority_10",
            ]);
        });

        it("should pass SceneFrameState ({ scene, activeCamera, timeInfo }) with clamped dt, accumulated time, and incremented frameCount", () => {
            const scene = new Scene("SceneRoot", undefined, scheduler);
            const cam1 = new PerspectiveCamera({}, "Cam1");
            const cam2 = new PerspectiveCamera({}, "Cam2");
            const receivedStates: SceneFrameState[] = [];

            scene.subscribeFrame((state) => {
                receivedStates.push(state);
            });

            // Frame 1: Zero elapsed ms -> clamps to MIN_SIMULATION_DT_SEC (0.0001), activeCamera is null
            scheduler.stepFrame(0);
            expect(receivedStates[0].scene).toBe(scene);
            expect(receivedStates[0].activeCamera).toBeNull();
            expect(receivedStates[0].timeInfo.dt).toBe(MIN_SIMULATION_DT_SEC);
            expect(receivedStates[0].timeInfo.time).toBeCloseTo(MIN_SIMULATION_DT_SEC, 6);
            expect(receivedStates[0].timeInfo.frameCount).toBe(1);

            // Frame 2: Negative elapsed ms -> clamps to MIN_SIMULATION_DT_SEC, activeCamera appointed to cam1
            scene.registerCamera(cam1);
            scheduler.stepFrame(-50);
            expect(receivedStates[1].activeCamera).toBe(cam1);
            expect(receivedStates[1].timeInfo.dt).toBe(MIN_SIMULATION_DT_SEC);
            expect(receivedStates[1].timeInfo.time).toBeCloseTo(MIN_SIMULATION_DT_SEC * 2, 6);
            expect(receivedStates[1].timeInfo.frameCount).toBe(2);

            // Frame 3: Huge elapsed ms (5000ms) -> clamps to MAX_SIMULATION_DT_SEC (0.1), activeCamera switched to cam2
            scene.registerCamera(cam2, true);
            scheduler.stepFrame(5000);
            expect(receivedStates[2].activeCamera).toBe(cam2);
            expect(receivedStates[2].timeInfo.dt).toBe(MAX_SIMULATION_DT_SEC);
            expect(receivedStates[2].timeInfo.time).toBeCloseTo(
                MIN_SIMULATION_DT_SEC * 2 + MAX_SIMULATION_DT_SEC,
                6
            );
            expect(receivedStates[2].timeInfo.frameCount).toBe(3);

            // Frame 4: Nominal 50ms (0.05s) -> unclamped
            scheduler.stepFrame(50);
            expect(receivedStates[3].timeInfo.dt).toBeCloseTo(0.05, 6);
            expect(receivedStates[3].timeInfo.time).toBeCloseTo(
                MIN_SIMULATION_DT_SEC * 2 + MAX_SIMULATION_DT_SEC + 0.05,
                6
            );
            expect(receivedStates[3].timeInfo.frameCount).toBe(4);
        });

        it("should handle safe mid-tick unsubscription without throwing or scheduling another RAF when the subscriber map becomes empty", () => {
            const scene = new Scene("SceneRoot", undefined, scheduler);
            let unsub1: (() => void) | null = null;
            let unsub2: (() => void) | null = null;

            const sub2Spy = vi.fn();
            const sub1Spy = vi.fn(() => {
                unsub1?.();
                unsub2?.();
            });

            unsub1 = scene.subscribeFrame(sub1Spy, 1);
            unsub2 = scene.subscribeFrame(sub2Spy, 2);

            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(1);

            expect(() => {
                scheduler.stepFrame(16);
            }).not.toThrow();

            expect(sub1Spy).toHaveBeenCalledTimes(1);
            expect(sub2Spy).not.toHaveBeenCalled();
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(0);
        });
    });

    describe(".destroy()", () => {
        it("should clear all children and destroy the scene node", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            scene.addChild(a);
            const clearSpy = vi.spyOn(scene, "clear");

            scene.destroy();
            expect(clearSpy).toHaveBeenCalledTimes(1);
            expect(scene.children.length).toBe(0);
            expect(a.parent).toBeNull();
        });

        it("should cancel any pending requestAnimationFrame, clear subscribers, and reset activeCamera to null", () => {
            const scheduler = createMockAnimationFrameScheduler(1000);
            const scene = new Scene("SceneRoot", undefined, scheduler);
            const cam = new PerspectiveCamera({}, "MainCam");
            scene.registerCamera(cam, true);
            expect(scene.activeCamera).toBe(cam);

            const frameSpy = vi.fn();
            scene.subscribeFrame(frameSpy);
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(1);

            scene.destroy();

            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledWith(1);
            expect(scheduler.pendingCount).toBe(0);
            expect(scene.activeCamera).toBeNull();
        });
    });
});
