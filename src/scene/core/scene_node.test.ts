import { describe, it, expect, vi } from "vitest";
import { SceneNode } from "./scene_node";

describe("SceneNode", () => {
    describe("constructor", () => {
        it("should initialize with default name and unique generated id", () => {
            const node = new SceneNode();
            expect(node.name).toBe("SceneNode");
            expect(node.id).toBeDefined();
            expect(node.children.length).toBe(0);
            expect(node.parent).toBeNull();
            expect(node.visible).toBe(true);
            expect(node.computedVisible).toBe(true);
            expect(node.isWorldDirty).toBe(true);
        });

        it("should accept custom name and id", () => {
            const node = new SceneNode("CustomNode", "custom_id_123");
            expect(node.name).toBe("CustomNode");
            expect(node.id).toBe("custom_id_123");
        });
    });

    describe(".addChild() and .removeChild()", () => {
        it("should attach child to parent and set parent reference", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");

            parent.addChild(child);
            expect(parent.children.length).toBe(1);
            expect(parent.children[0]).toBe(child);
            expect(child.parent).toBe(parent);
        });

        it("should re-parent child if child already belongs to another parent", () => {
            const parentA = new SceneNode("ParentA");
            const parentB = new SceneNode("ParentB");
            const child = new SceneNode("Child");

            parentA.addChild(child);
            expect(parentA.children.length).toBe(1);

            parentB.addChild(child);
            expect(parentA.children.length).toBe(0);
            expect(parentB.children.length).toBe(1);
            expect(child.parent).toBe(parentB);
        });

        it("should ignore adding self as child to prevent circular hierarchy", () => {
            const node = new SceneNode("Node");
            node.addChild(node);
            expect(node.children.length).toBe(0);
            expect(node.parent).toBeNull();
        });

        it("should remove child correctly and detach parent reference", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            const removed = parent.removeChild(child);
            expect(removed).toBe(true);
            expect(parent.children.length).toBe(0);
            expect(child.parent).toBeNull();
        });

        it("should return false when removing non-existent child", () => {
            const parent = new SceneNode("Parent");
            const stranger = new SceneNode("Stranger");
            expect(parent.removeChild(stranger)).toBe(false);
        });
    });

    describe(".removeFromParent()", () => {
        it("should cleanly detach self from its current parent", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            child.removeFromParent();
            expect(parent.children.length).toBe(0);
            expect(child.parent).toBeNull();
        });
    });

    describe(".traverse()", () => {
        it("should visit all descendants in depth-first order", () => {
            const root = new SceneNode("Root");
            const child1 = new SceneNode("Child1");
            const child2 = new SceneNode("Child2");
            const grandChild = new SceneNode("GrandChild");

            root.addChild(child1);
            root.addChild(child2);
            child1.addChild(grandChild);

            const visited: string[] = [];
            root.traverse((node) => visited.push(node.name));

            expect(visited).toEqual(["Root", "Child1", "GrandChild", "Child2"]);
        });
    });

    describe(".updateWorldTransform()", () => {
        it("should calculate world transform as identity for root at origin", () => {
            const root = new SceneNode("Root");
            root.updateWorldTransform();

            expect(root.isWorldDirty).toBe(false);
            const wm = root.worldMatrix;
            expect(wm[12]).toBe(0);
            expect(wm[13]).toBe(0);
            expect(wm[14]).toBe(0);
        });

        it("should compose parent and child translations hierarchically", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.transform.setPosition(10, 0, 0);
            child.transform.setPosition(0, 5, 0);

            parent.updateWorldTransform();

            const childWM = child.worldMatrix;
            expect(childWM[12]).toBe(10); // X from parent
            expect(childWM[13]).toBe(5);  // Y from child
            expect(childWM[14]).toBe(0);
        });

        it("should invalidate child world matrix when parent transform is modified (dirty cascade)", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            parent.updateWorldTransform();

            expect(parent.isWorldDirty).toBe(false);
            expect(child.isWorldDirty).toBe(false);

            // Mutate parent position
            parent.transform.setPosition(100, 200, 300);
            expect(parent.isWorldDirty).toBe(true);
            expect(child.isWorldDirty).toBe(true);

            parent.updateWorldTransform();
            expect(child.worldMatrix[12]).toBe(100);
            expect(child.worldMatrix[13]).toBe(200);
            expect(child.worldMatrix[14]).toBe(300);
            expect(child.isWorldDirty).toBe(false);
        });
    });

    describe(".visible and .computedVisible", () => {
        it("should cascade invisibility down the hierarchy", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.visible = false;
            child.visible = true;

            parent.updateWorldTransform();

            expect(parent.computedVisible).toBe(false);
            expect(child.computedVisible).toBe(false); // Cascaded from parent
        });

        it("should allow child to be invisible while parent is visible", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.visible = true;
            child.visible = false;

            parent.updateWorldTransform();

            expect(parent.computedVisible).toBe(true);
            expect(child.computedVisible).toBe(false);
        });
    });

    describe(".destroy() and .dispose()", () => {
        it("should recursively remove children and detach from parent", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.dispose();
            expect(parent.children.length).toBe(0);
            expect(child.parent).toBeNull();
        });
    });
});
