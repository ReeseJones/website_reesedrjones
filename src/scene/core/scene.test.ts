import { describe, it, expect, vi } from "vitest";
import { Scene } from "./scene";
import { SceneNode } from "./scene_node";
import type { ISceneNode } from "./scene_node_types";

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
        it("should create a root SceneNode named 'SceneRoot' by default", () => {
            const scene = new Scene();
            expect(scene.root).toBeInstanceOf(SceneNode);
            expect(scene.root.name).toBe("SceneRoot");
        });

        it("should accept a custom root name", () => {
            const scene = new Scene("Level1");
            expect(scene.root.name).toBe("Level1");
            expect(scene.root.id.startsWith("Level1_")).toBe(true);
        });

        it("should initialize root with no parent and no children", () => {
            const scene = new Scene();
            expect(scene.root.parent).toBeNull();
            expect(scene.root.children.length).toBe(0);
        });

        it("should create distinct roots for distinct scenes", () => {
            const a = new Scene();
            const b = new Scene();
            expect(a.root).not.toBe(b.root);
            expect(a.root.id).not.toBe(b.root.id);
        });
    });

    describe("root", () => {
        it("should return the same root instance on every access", () => {
            const scene = new Scene();
            const first = scene.root;
            expect(scene.root).toBe(first);
        });
    });

    describe(".add()", () => {
        it("should attach the node as a child of root and return this for chaining", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            const result = scene.add(node);
            expect(result).toBe(scene);
            expect(scene.root.children).toContain(node);
            expect(node.parent).toBe(scene.root);
        });

        it("should support fluent chaining of multiple adds in insertion order", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            const b = new SceneNode("B");
            const c = new SceneNode("C");
            expect(scene.add(a).add(b).add(c)).toBe(scene);
            expect(scene.root.children).toEqual([a, b, c]);
        });

        it("should be idempotent when adding the same node twice", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            scene.add(node);
            const result = scene.add(node);
            expect(result).toBe(scene);
            expect(scene.root.children.length).toBe(1);
        });

        it("should reparent a node that already belongs to another parent", () => {
            const scene = new Scene();
            const oldParent = new SceneNode("OldParent");
            const node = new SceneNode("A");
            oldParent.addChild(node);

            scene.add(node);
            expect(oldParent.children.length).toBe(0);
            expect(node.parent).toBe(scene.root);
            expect(scene.root.children).toEqual([node]);
        });

        it("should move a node from one scene to another", () => {
            const s1 = new Scene();
            const s2 = new Scene();
            const node = new SceneNode("A");
            s1.add(node);
            s2.add(node);
            expect(s1.root.children.length).toBe(0);
            expect(s2.root.children).toEqual([node]);
            expect(node.parent).toBe(s2.root);
        });

        it("should be a no-op when adding the root to itself", () => {
            const scene = new Scene();
            const result = scene.add(scene.root);
            expect(result).toBe(scene);
            expect(scene.root.children.length).toBe(0);
            expect(scene.root.parent).toBeNull();
        });

        it("should mark the added node world-dirty", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);
            scene.add(node);
            expect(node.isWorldDirty).toBe(true);
        });
    });

    describe(".remove()", () => {
        it("should detach a top-level node and return true", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            scene.add(node);
            expect(scene.remove(node)).toBe(true);
            expect(scene.root.children.length).toBe(0);
            expect(node.parent).toBeNull();
        });

        it("should return false for a node not in the scene", () => {
            const scene = new Scene();
            const node = new SceneNode("Stranger");
            expect(scene.remove(node)).toBe(false);
            expect(node.parent).toBeNull();
        });

        it("should return false when removing the same node twice", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            scene.add(node);
            expect(scene.remove(node)).toBe(true);
            expect(scene.remove(node)).toBe(false);
        });

        it("should return false for a nested (non top-level) descendant and leave it attached", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            scene.add(parent);

            expect(scene.remove(child)).toBe(false);
            expect(child.parent).toBe(parent);
            expect(parent.children).toEqual([child]);
        });

        it("should keep the remaining siblings in order", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            const b = new SceneNode("B");
            const c = new SceneNode("C");
            scene.add(a).add(b).add(c);
            expect(scene.remove(b)).toBe(true);
            expect(scene.root.children).toEqual([a, c]);
        });

        it("should keep the removed node's own subtree intact", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            scene.add(parent);

            scene.remove(parent);
            expect(parent.children).toEqual([child]);
            expect(child.parent).toBe(parent);
        });

        it("should mark the removed node world-dirty", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            scene.add(node);
            scene.update();
            expect(node.isWorldDirty).toBe(false);
            scene.remove(node);
            expect(node.isWorldDirty).toBe(true);
        });
    });

    describe(".update()", () => {
        it("should return undefined and clear world-dirty flags across the whole graph", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            scene.add(parent);

            expect(scene.update()).toBeUndefined();
            expect(scene.root.isWorldDirty).toBe(false);
            expect(parent.isWorldDirty).toBe(false);
            expect(child.isWorldDirty).toBe(false);
        });

        it("should be safe to call on an empty scene", () => {
            const scene = new Scene();
            expect(() => scene.update()).not.toThrow();
            expect(scene.root.isWorldDirty).toBe(false);
        });

        it("should compose world matrices hierarchically (M_world = M_parent * M_local)", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.transform.setPosition(1, 2, 3);
            child.transform.setPosition(10, 20, 30);
            parent.addChild(child);
            scene.add(parent);

            scene.update();

            expect(parent.worldMatrix[TX]).toBeCloseTo(1, PRECISION);
            expect(parent.worldMatrix[TY]).toBeCloseTo(2, PRECISION);
            expect(parent.worldMatrix[TZ]).toBeCloseTo(3, PRECISION);
            expect(child.worldMatrix[TX]).toBeCloseTo(11, PRECISION);
            expect(child.worldMatrix[TY]).toBeCloseTo(22, PRECISION);
            expect(child.worldMatrix[TZ]).toBeCloseTo(33, PRECISION);
        });

        it("should apply root transform to all top-level nodes", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            node.transform.setPosition(1, 0, 0);
            scene.root.transform.setScale(2, 2, 2);
            scene.add(node);

            scene.update();

            expect(node.worldMatrix[TX]).toBeCloseTo(2, PRECISION);
            expect(node.worldMatrix[0]).toBeCloseTo(2, PRECISION);
        });

        it("should propagate a later parent transform change to descendants on next update", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            scene.add(parent);
            scene.update();
            expect(child.worldMatrix[TX]).toBeCloseTo(0, PRECISION);

            parent.transform.setPosition(5, 0, 0);
            expect(child.isWorldDirty).toBe(true);

            scene.update();
            expect(child.worldMatrix[TX]).toBeCloseTo(5, PRECISION);
            expect(child.isWorldDirty).toBe(false);
        });

        it("should be idempotent when called repeatedly without changes", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            node.transform.setPosition(3, 4, 5);
            scene.add(node);

            scene.update();
            const snapshot = Array.from(node.worldMatrix);
            scene.update();
            scene.update();

            const after = Array.from(node.worldMatrix);
            for (let i = 0; i < snapshot.length; i++) {
                expect(after[i]).toBeCloseTo(snapshot[i], PRECISION);
            }
            expect(node.isWorldDirty).toBe(false);
        });

        it("should cascade computedVisible from hidden ancestors", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            scene.add(parent);

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

        it("should invoke updateWorldTransform on the root exactly once", () => {
            const scene = new Scene();
            const spy = vi.spyOn(scene.root, "updateWorldTransform");
            scene.update();
            expect(spy).toHaveBeenCalledTimes(1);
            spy.mockRestore();
        });
    });

    describe(".traverseVisible()", () => {
        it("should visit only the root for an empty scene", () => {
            const scene = new Scene();
            scene.update();
            const callback = vi.fn();
            expect(scene.traverseVisible(callback)).toBeUndefined();
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(scene.root);
        });

        it("should visit all nodes in depth-first pre-order when all are visible", () => {
            const scene = new Scene("Root");
            const a = new SceneNode("A");
            const a1 = new SceneNode("A1");
            const a2 = new SceneNode("A2");
            const b = new SceneNode("B");
            a.addChild(a1).addChild(a2);
            scene.add(a).add(b);
            scene.update();

            expect(collectVisibleNames(scene)).toEqual(["Root", "A", "A1", "A2", "B"]);
        });

        it("should prune an invisible node and its entire subtree", () => {
            const scene = new Scene("Root");
            const a = new SceneNode("A");
            const a1 = new SceneNode("A1");
            const b = new SceneNode("B");
            a.addChild(a1);
            scene.add(a).add(b);

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
            scene.add(a);

            a1.visible = false;
            scene.update();

            expect(collectVisibleNames(scene)).toEqual(["Root", "A", "A2"]);
        });

        it("should visit nothing when the root is hidden", () => {
            const scene = new Scene();
            scene.add(new SceneNode("A"));
            scene.root.visible = false;
            scene.update();

            const callback = vi.fn();
            scene.traverseVisible(callback);
            expect(callback).not.toHaveBeenCalled();
        });

        it("should reflect visibility changes only after update() recomputes computedVisible", () => {
            const scene = new Scene("Root");
            const a = new SceneNode("A");
            scene.add(a);
            scene.update();

            a.visible = false;
            // computedVisible is stale until the next update tick
            expect(collectVisibleNames(scene)).toEqual(["Root", "A"]);

            scene.update();
            expect(collectVisibleNames(scene)).toEqual(["Root"]);
        });

        it("should pass ISceneNode instances to the callback", () => {
            const scene = new Scene();
            const node = new SceneNode("A");
            scene.add(node);
            scene.update();

            const visited: ISceneNode[] = [];
            scene.traverseVisible((n) => visited.push(n));
            expect(visited).toEqual([scene.root, node]);
        });

        it("should produce identical results on repeated traversals", () => {
            const scene = new Scene("Root");
            scene.add(new SceneNode("A")).add(new SceneNode("B"));
            scene.update();
            const first = collectVisibleNames(scene);
            const second = collectVisibleNames(scene);
            expect(second).toEqual(first);
        });
    });

    describe(".clear()", () => {
        it("should remove all top-level nodes and return undefined", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            const b = new SceneNode("B");
            scene.add(a).add(b);

            expect(scene.clear()).toBeUndefined();
            expect(scene.root.children.length).toBe(0);
            expect(a.parent).toBeNull();
            expect(b.parent).toBeNull();
        });

        it("should destroy every top-level node exactly once", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            const b = new SceneNode("B");
            scene.add(a).add(b);
            const spyA = vi.spyOn(a, "destroy");
            const spyB = vi.spyOn(b, "destroy");

            scene.clear();
            expect(spyA).toHaveBeenCalledTimes(1);
            expect(spyB).toHaveBeenCalledTimes(1);
        });

        it("should recursively tear down nested descendants", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            const grandchild = new SceneNode("Grandchild");
            child.addChild(grandchild);
            parent.addChild(child);
            scene.add(parent);

            scene.clear();
            expect(parent.children.length).toBe(0);
            expect(child.children.length).toBe(0);
            expect(child.parent).toBeNull();
            expect(grandchild.parent).toBeNull();
        });

        it("should preserve the root node so the scene remains usable", () => {
            const scene = new Scene("Root");
            const root = scene.root;
            scene.add(new SceneNode("A"));
            scene.clear();

            expect(scene.root).toBe(root);
            const b = new SceneNode("B");
            expect(scene.add(b)).toBe(scene);
            scene.update();
            expect(collectVisibleNames(scene)).toEqual(["Root", "B"]);
        });

        it("should be a safe no-op on an empty scene and when called repeatedly", () => {
            const scene = new Scene();
            expect(() => scene.clear()).not.toThrow();
            scene.add(new SceneNode("A"));
            scene.clear();
            expect(() => scene.clear()).not.toThrow();
            expect(scene.root.children.length).toBe(0);
        });

        it("should leave only the root in a visible traversal afterwards", () => {
            const scene = new Scene("Root");
            scene.add(new SceneNode("A")).add(new SceneNode("B"));
            scene.update();
            scene.clear();
            expect(collectVisibleNames(scene)).toEqual(["Root"]);
        });
    });

    describe(".destroy()", () => {
        it("should clear all nodes, destroy the root, and return undefined", () => {
            const scene = new Scene();
            const a = new SceneNode("A");
            scene.add(a);
            const clearSpy = vi.spyOn(scene, "clear");
            const rootDestroySpy = vi.spyOn(scene.root, "destroy");

            expect(scene.destroy()).toBeUndefined();
            expect(clearSpy).toHaveBeenCalledTimes(1);
            expect(rootDestroySpy).toHaveBeenCalledTimes(1);
            expect(scene.root.children.length).toBe(0);
            expect(a.parent).toBeNull();
        });

        it("should invoke clear() before destroying the root", () => {
            const scene = new Scene();
            const order: string[] = [];
            vi.spyOn(scene, "clear").mockImplementation(() => {
                order.push("clear");
            });
            vi.spyOn(scene.root, "destroy").mockImplementation(() => {
                order.push("destroy");
            });

            scene.destroy();
            expect(order).toEqual(["clear", "destroy"]);
        });

        it("should recursively detach a deep hierarchy", () => {
            const scene = new Scene();
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            scene.add(parent);

            scene.destroy();
            expect(parent.parent).toBeNull();
            expect(parent.children.length).toBe(0);
            expect(child.parent).toBeNull();
        });

        it("should be safe on an empty scene and when called repeatedly", () => {
            const scene = new Scene();
            expect(() => scene.destroy()).not.toThrow();
            expect(() => scene.destroy()).not.toThrow();
            expect(scene.root.children.length).toBe(0);
            expect(scene.root.parent).toBeNull();
        });
    });
});
