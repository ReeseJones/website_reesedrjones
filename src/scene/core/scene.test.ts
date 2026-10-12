import { describe, it, expect, vi } from "vitest";
import { Scene } from "./scene";
import { SceneNode } from "./scene_node";
import type { ISceneNode } from "./scene_node_types";
import type { ICamera } from "../camera/camera_types";

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
            const mockCamera = { name: "TestCamera" } as unknown as ICamera;
            scene.activeCamera = mockCamera;
            expect(scene.activeCamera).toBe(mockCamera);
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
    });
});
