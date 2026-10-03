import { describe, it, expect, vi } from "vitest";
import { SceneNode } from "./scene_node";
import { Transform } from "./transform";
import type { ISceneNode } from "./scene_node_types";


describe("SceneNode", () => {
    describe("constructor", () => {
        it("should initialize with default name 'SceneNode' and a generated unique id", () => {
            const node = new SceneNode();
            expect(node.name).toBe("SceneNode");
            expect(node.id).toBeDefined();
            expect(typeof node.id).toBe("string");
            expect(node.id.startsWith("SceneNode_")).toBe(true);
        });

        it("should accept custom name and custom id", () => {
            const node = new SceneNode("CustomEntity", "custom-uid-42");
            expect(node.name).toBe("CustomEntity");
            expect(node.id).toBe("custom-uid-42");
        });

        it("should use custom name prefix in generated id when id parameter is omitted", () => {
            const node = new SceneNode("MeshNode");
            expect(node.name).toBe("MeshNode");
            expect(node.id.startsWith("MeshNode_")).toBe(true);
        });

        it("should initialize default state: null parent, empty children, visible, computedVisible, isWorldDirty", () => {
            const node = new SceneNode();
            expect(node.parent).toBeNull();
            expect(node.children).toEqual([]);
            expect(node.children.length).toBe(0);
            expect(node.visible).toBe(true);
            expect(node.computedVisible).toBe(true);
            expect(node.isWorldDirty).toBe(true);
        });

        it("should initialize worldMatrix as an identity 4x4 matrix", () => {
            const node = new SceneNode();
            const wm = node.worldMatrix;
            expect(wm.length).toBe(16);

            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    const expected = row === col ? 1.0 : 0.0;
                    expect(wm[col * 4 + row]).toBeCloseTo(expected, 5);
                }
            }
        });

        it("should initialize transform component bound to node's markWorldDirty", () => {
            const node = new SceneNode();
            expect(node.transform).toBeInstanceOf(Transform);

            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.transform.setPosition(1, 2, 3);
            expect(node.isWorldDirty).toBe(true);
        });
    });

    describe("id", () => {
        it("should return the immutable unique id via getter", () => {
            const node = new SceneNode("NodeA", "fixed-id-001");
            expect(node.id).toBe("fixed-id-001");
        });

        it("should generate distinct ids for multiple instances created with default parameters", () => {
            const node1 = new SceneNode();
            const node2 = new SceneNode();
            const node3 = new SceneNode();

            expect(node1.id).not.toBe(node2.id);
            expect(node2.id).not.toBe(node3.id);
            expect(node1.id).not.toBe(node3.id);
        });

        it("should match the expected format pattern: <name>_<counter>_<alphanumeric>", () => {
            const node = new SceneNode("Entity");
            const pattern = /^Entity_\d+_[a-z0-9]+$/;
            expect(node.id).toMatch(pattern);
        });

        it("should preserve custom id exactly as provided", () => {
            const customId = "uuid-v4-abc-123-xyz";
            const node = new SceneNode("MyNode", customId);
            expect(node.id).toBe(customId);
        });
    });

    describe("name", () => {
        it("should return the node name via getter", () => {
            const node = new SceneNode("CameraNode");
            expect(node.name).toBe("CameraNode");
        });

        it("should allow mutating name via setter", () => {
            const node = new SceneNode("OriginalName");
            node.name = "UpdatedName";
            expect(node.name).toBe("UpdatedName");
        });

        it("should support empty string as name", () => {
            const node = new SceneNode("Init");
            node.name = "";
            expect(node.name).toBe("");
        });

        it("should support special characters and unicode in name", () => {
            const node = new SceneNode("Node");
            node.name = "Node/with:special@chars#1_🚀";
            expect(node.name).toBe("Node/with:special@chars#1_🚀");
        });
    });

    describe("transform", () => {
        it("should return an instance of Transform", () => {
            const node = new SceneNode();
            expect(node.transform).toBeInstanceOf(Transform);
        });

        it("should invalidate world dirty flag when transform position changes", () => {
            const node = new SceneNode();
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.transform.setPosition(10, 0, 0);
            expect(node.isWorldDirty).toBe(true);
        });

        it("should invalidate world dirty flag when transform rotation changes", () => {
            const node = new SceneNode();
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.transform.setRotationEuler(0, 0, Math.PI / 2);
            expect(node.isWorldDirty).toBe(true);
        });

        it("should invalidate world dirty flag when transform scale changes", () => {
            const node = new SceneNode();
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.transform.setScale(2, 2, 2);
            expect(node.isWorldDirty).toBe(true);
        });

        it("should not re-dirty world when setting identical transform values (idempotence)", () => {
            const node = new SceneNode();
            node.transform.setPosition(5, 5, 5);
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.transform.setPosition(5, 5, 5);
            expect(node.isWorldDirty).toBe(false);
        });
    });

    describe("worldMatrix", () => {
        it("should return a Float32Array of length 16", () => {
            const node = new SceneNode();
            expect(node.worldMatrix).toBeInstanceOf(Float32Array);
            expect(node.worldMatrix.length).toBe(16);
        });

        it("should initialize as identity matrix", () => {
            const node = new SceneNode();
            const wm = node.worldMatrix;
            const identity = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ];
            for (let i = 0; i < 16; i++) {
                expect(wm[i]).toBeCloseTo(identity[i], 5);
            }
        });

        it("should retain the same Float32Array buffer instance across updates", () => {
            const node = new SceneNode();
            const bufferRef = node.worldMatrix;
            node.transform.setPosition(1, 2, 3);
            node.updateWorldTransform();
            expect(node.worldMatrix).toBe(bufferRef);
        });
    });

    describe("parent", () => {
        it("should return null for an unattached or root node", () => {
            const node = new SceneNode();
            expect(node.parent).toBeNull();
        });

        it("should return the parent node when attached via addChild", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            expect(child.parent).toBe(parent);
        });

        it("should return null after being detached via removeChild", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            parent.removeChild(child);
            expect(child.parent).toBeNull();
        });

        it("should return null after being detached via removeFromParent", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            child.removeFromParent();
            expect(child.parent).toBeNull();
        });
    });

    describe("children", () => {
        it("should return a readonly array of child nodes", () => {
            const node = new SceneNode();
            expect(Array.isArray(node.children)).toBe(true);
            expect(node.children.length).toBe(0);
        });

        it("should preserve child order as children are attached", () => {
            const parent = new SceneNode("Parent");
            const c1 = new SceneNode("C1");
            const c2 = new SceneNode("C2");
            const c3 = new SceneNode("C3");

            parent.addChild(c1).addChild(c2).addChild(c3);
            expect(parent.children.length).toBe(3);
            expect(parent.children[0]).toBe(c1);
            expect(parent.children[1]).toBe(c2);
            expect(parent.children[2]).toBe(c3);
        });

        it("should reflect removed children immediately", () => {
            const parent = new SceneNode("Parent");
            const c1 = new SceneNode("C1");
            const c2 = new SceneNode("C2");

            parent.addChild(c1).addChild(c2);
            parent.removeChild(c1);
            expect(parent.children.length).toBe(1);
            expect(parent.children[0]).toBe(c2);
        });
    });

    describe("visible", () => {
        it("should default to true on construction", () => {
            const node = new SceneNode();
            expect(node.visible).toBe(true);
        });

        it("should update local visibility flag via setter", () => {
            const node = new SceneNode();
            node.visible = false;
            expect(node.visible).toBe(false);

            node.visible = true;
            expect(node.visible).toBe(true);
        });

        it("should mark world dirty when visibility value changes", () => {
            const node = new SceneNode();
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.visible = false;
            expect(node.isWorldDirty).toBe(true);
        });

        it("should not mark world dirty when setting identical visibility value (idempotent)", () => {
            const node = new SceneNode();
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.visible = true; // Was already true
            expect(node.isWorldDirty).toBe(false);
        });
    });

    describe("computedVisible", () => {
        it("should default to true on initialization", () => {
            const node = new SceneNode();
            expect(node.computedVisible).toBe(true);
        });

        it("should inherit parent false visibility across updateWorldTransform", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.visible = false;
            child.visible = true;
            parent.updateWorldTransform();

            expect(parent.computedVisible).toBe(false);
            expect(child.computedVisible).toBe(false);
        });

        it("should evaluate to false when child itself is hidden even if parent is visible", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.visible = true;
            child.visible = false;
            parent.updateWorldTransform();

            expect(parent.computedVisible).toBe(true);
            expect(child.computedVisible).toBe(false);
        });

        it("should cascade false through multi-tier hierarchies", () => {
            const root = new SceneNode("Root");
            const child = new SceneNode("Child");
            const grandChild = new SceneNode("GrandChild");
            const greatGrandChild = new SceneNode("GreatGrandChild");

            root.addChild(child);
            child.addChild(grandChild);
            grandChild.addChild(greatGrandChild);

            root.visible = false;
            root.updateWorldTransform();

            expect(root.computedVisible).toBe(false);
            expect(child.computedVisible).toBe(false);
            expect(grandChild.computedVisible).toBe(false);
            expect(greatGrandChild.computedVisible).toBe(false);
        });

        it("should restore computedVisible to true when parent visibility is restored", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.visible = false;
            parent.updateWorldTransform();
            expect(child.computedVisible).toBe(false);

            parent.visible = true;
            parent.updateWorldTransform();
            expect(parent.computedVisible).toBe(true);
            expect(child.computedVisible).toBe(true);
        });

        it("should keep child computedVisible false if an intermediate ancestor remains hidden", () => {
            const root = new SceneNode("Root");
            const child = new SceneNode("Child");
            const grandChild = new SceneNode("GrandChild");

            root.addChild(child);
            child.addChild(grandChild);

            root.visible = true;
            child.visible = false;
            grandChild.visible = true;
            root.updateWorldTransform();

            expect(root.computedVisible).toBe(true);
            expect(child.computedVisible).toBe(false);
            expect(grandChild.computedVisible).toBe(false);
        });
    });

    describe("isWorldDirty", () => {
        it("should be true initially upon instantiation", () => {
            const node = new SceneNode();
            expect(node.isWorldDirty).toBe(true);
        });

        it("should be cleared to false after updateWorldTransform()", () => {
            const node = new SceneNode();
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);
        });

        it("should transition from false to true when markWorldDirty() is called", () => {
            const node = new SceneNode();
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.markWorldDirty();
            expect(node.isWorldDirty).toBe(true);
        });

        it("should transition from false to true when local transform is modified", () => {
            const node = new SceneNode();
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.transform.setUniformScale(3);
            expect(node.isWorldDirty).toBe(true);
        });
    });

    describe("markWorldDirty()", () => {
        it("should mark self dirty when clean", () => {
            const node = new SceneNode();
            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);

            node.markWorldDirty();
            expect(node.isWorldDirty).toBe(true);
        });

        it("should recursively mark all descendants dirty across multi-level hierarchies", () => {
            const root = new SceneNode("Root");
            const child = new SceneNode("Child");
            const grandChild = new SceneNode("GrandChild");

            root.addChild(child);
            child.addChild(grandChild);
            root.updateWorldTransform();

            expect(root.isWorldDirty).toBe(false);
            expect(child.isWorldDirty).toBe(false);
            expect(grandChild.isWorldDirty).toBe(false);

            root.markWorldDirty();

            expect(root.isWorldDirty).toBe(true);
            expect(child.isWorldDirty).toBe(true);
            expect(grandChild.isWorldDirty).toBe(true);
        });

        it("should remain dirty without side-effects if already dirty (idempotent)", () => {
            const node = new SceneNode();
            expect(node.isWorldDirty).toBe(true);
            node.markWorldDirty();
            expect(node.isWorldDirty).toBe(true);
        });
    });


    describe("addChild()", () => {
        it("should return this for fluent method chaining", () => {
            const parent = new SceneNode("Parent");
            const child1 = new SceneNode("Child1");
            const child2 = new SceneNode("Child2");

            const chainResult = parent.addChild(child1).addChild(child2);
            expect(chainResult).toBe(parent);
        });

        it("should establish parent-child relationship between parent and child", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");

            parent.addChild(child);
            expect(parent.children.length).toBe(1);
            expect(parent.children[0]).toBe(child);
            expect(child.parent).toBe(parent);
        });

        it("should reparent child if child already belongs to another parent", () => {
            const parentA = new SceneNode("ParentA");
            const parentB = new SceneNode("ParentB");
            const child = new SceneNode("Child");

            parentA.addChild(child);
            expect(parentA.children).toContain(child);
            expect(child.parent).toBe(parentA);

            parentB.addChild(child);
            expect(parentA.children).not.toContain(child);
            expect(parentA.children.length).toBe(0);
            expect(parentB.children).toContain(child);
            expect(parentB.children.length).toBe(1);
            expect(child.parent).toBe(parentB);
        });

        it("should ignore self-addition as a safe no-op and return this", () => {
            const node = new SceneNode("SelfNode");
            const result = node.addChild(node);

            expect(result).toBe(node);
            expect(node.children.length).toBe(0);
            expect(node.parent).toBeNull();
        });

        it("should ignore adding an already attached child as a no-op and return this without duplicate entries", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");

            parent.addChild(child);
            expect(parent.children.length).toBe(1);

            const result = parent.addChild(child);
            expect(result).toBe(parent);
            expect(parent.children.length).toBe(1);
        });

        it("should mark child world dirty upon attachment", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");

            child.updateWorldTransform();
            expect(child.isWorldDirty).toBe(false);

            parent.addChild(child);
            expect(child.isWorldDirty).toBe(true);
        });
    });

    describe("removeChild()", () => {
        it("should return true when successfully removing an attached child", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            const result = parent.removeChild(child);
            expect(result).toBe(true);
            expect(parent.children.length).toBe(0);
        });

        it("should return false when child is not found in children array", () => {
            const parent = new SceneNode("Parent");
            const stranger = new SceneNode("Stranger");

            const result = parent.removeChild(stranger);
            expect(result).toBe(false);
        });

        it("should detach child parent reference to null", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.removeChild(child);
            expect(child.parent).toBeNull();
        });

        it("should mark removed child world dirty", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            parent.updateWorldTransform();
            expect(child.isWorldDirty).toBe(false);

            parent.removeChild(child);
            expect(child.isWorldDirty).toBe(true);
        });

        it("should preserve ordering of remaining sibling children", () => {
            const parent = new SceneNode("Parent");
            const c1 = new SceneNode("C1");
            const c2 = new SceneNode("C2");
            const c3 = new SceneNode("C3");

            parent.addChild(c1).addChild(c2).addChild(c3);
            parent.removeChild(c2);

            expect(parent.children.length).toBe(2);
            expect(parent.children[0]).toBe(c1);
            expect(parent.children[1]).toBe(c3);
        });
    });

    describe("removeFromParent()", () => {
        it("should detach node from parent when parent exists", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            child.removeFromParent();
            expect(parent.children.length).toBe(0);
            expect(child.parent).toBeNull();
        });

        it("should be a safe no-op when node has no parent (null parent)", () => {
            const orphan = new SceneNode("Orphan");
            expect(orphan.parent).toBeNull();

            expect(() => orphan.removeFromParent()).not.toThrow();
            expect(orphan.parent).toBeNull();
        });

        it("should mark self world dirty upon detachment", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            parent.updateWorldTransform();
            expect(child.isWorldDirty).toBe(false);

            child.removeFromParent();
            expect(child.isWorldDirty).toBe(true);
        });
    });

    describe("traverse()", () => {
        it("should invoke callback for a single root leaf node", () => {
            const node = new SceneNode("Leaf");
            const visited: ISceneNode[] = [];

            node.traverse((n) => visited.push(n));
            expect(visited.length).toBe(1);
            expect(visited[0]).toBe(node);
        });

        it("should execute depth-first pre-order traversal visiting node before children", () => {
            const root = new SceneNode("Root");
            const child1 = new SceneNode("Child1");
            const child2 = new SceneNode("Child2");
            const grandChild = new SceneNode("GrandChild");

            root.addChild(child1);
            root.addChild(child2);
            child1.addChild(grandChild);

            const visitedNames: string[] = [];
            root.traverse((n) => visitedNames.push(n.name));

            expect(visitedNames).toEqual(["Root", "Child1", "GrandChild", "Child2"]);
        });

        it("should traverse complex asymmetric multi-branch hierarchy in exact DFS order", () => {
            // Tree hierarchy:
            // Root
            // ├── A
            // │   ├── A1
            // │   │   └── A1a
            // │   └── A2
            // ├── B
            // │   └── B1
            // └── C
            const root = new SceneNode("Root");
            const a = new SceneNode("A");
            const a1 = new SceneNode("A1");
            const a1a = new SceneNode("A1a");
            const a2 = new SceneNode("A2");
            const b = new SceneNode("B");
            const b1 = new SceneNode("B1");
            const c = new SceneNode("C");

            root.addChild(a).addChild(b).addChild(c);
            a.addChild(a1).addChild(a2);
            a1.addChild(a1a);
            b.addChild(b1);

            const traversalSequence: string[] = [];
            root.traverse((node) => traversalSequence.push(node.name));

            expect(traversalSequence).toEqual([
                "Root",
                "A",
                "A1",
                "A1a",
                "A2",
                "B",
                "B1",
                "C"
            ]);
        });

        it("should pass the exact ISceneNode instance to the callback", () => {
            const parent = new SceneNode("P");
            const child = new SceneNode("C");
            parent.addChild(child);

            const received: ISceneNode[] = [];
            parent.traverse((n) => received.push(n));

            expect(received[0]).toBe(parent);
            expect(received[1]).toBe(child);
        });
    });

    describe("updateWorldTransform()", () => {
        it("should compute identity matrix for root node with default transform", () => {
            const root = new SceneNode("Root");
            root.updateWorldTransform();

            expect(root.isWorldDirty).toBe(false);
            const wm = root.worldMatrix;
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    const expected = row === col ? 1.0 : 0.0;
                    expect(wm[col * 4 + row]).toBeCloseTo(expected, 5);
                }
            }
        });

        it("should clear isWorldDirty flag after execution", () => {
            const node = new SceneNode();
            expect(node.isWorldDirty).toBe(true);

            node.updateWorldTransform();
            expect(node.isWorldDirty).toBe(false);
        });

        it("should compose hierarchical translation: M_parent * M_local", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.transform.setPosition(10, 20, 30);
            child.transform.setPosition(1, 2, 3);
            parent.updateWorldTransform();

            const childWM = child.worldMatrix;
            // Column-major indices for translation: X=12, Y=13, Z=14
            expect(childWM[12]).toBeCloseTo(11, 5);
            expect(childWM[13]).toBeCloseTo(22, 5);
            expect(childWM[14]).toBeCloseTo(33, 5);
            expect(childWM[15]).toBeCloseTo(1, 5);
        });

        it("should compose hierarchical rotation: roll 90 deg on parent, offset on child", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            // Rotate parent 90 degrees around Z axis (roll)
            parent.transform.setRotationEuler(0, 0, Math.PI / 2);
            // Child positioned along local X axis
            child.transform.setPosition(10, 0, 0);

            parent.updateWorldTransform();

            const childWM = child.worldMatrix;
            // A 90-degree Z-axis rotation transforms local (10, 0, 0) into world (0, 10, 0)
            expect(childWM[12]).toBeCloseTo(0, 5);
            expect(childWM[13]).toBeCloseTo(10, 5);
            expect(childWM[14]).toBeCloseTo(0, 5);
        });

        it("should compose hierarchical scale and translation: parent scale scales child offset", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.transform.setPosition(10, 0, 0);
            parent.transform.setScale(2, 3, 4);

            child.transform.setPosition(5, 2, 1);
            child.transform.setScale(2, 1, 0.5);

            parent.updateWorldTransform();

            const childWM = child.worldMatrix;
            // Scaled translation: X = 10 + 2*5 = 20, Y = 0 + 3*2 = 6, Z = 0 + 4*1 = 4
            expect(childWM[12]).toBeCloseTo(20, 5);
            expect(childWM[13]).toBeCloseTo(6, 5);
            expect(childWM[14]).toBeCloseTo(4, 5);

            // Composed diagonal scale:
            // m00 = 2 * 2 = 4
            // m11 = 3 * 1 = 3
            // m22 = 4 * 0.5 = 2
            expect(childWM[0]).toBeCloseTo(4, 5);
            expect(childWM[5]).toBeCloseTo(3, 5);
            expect(childWM[10]).toBeCloseTo(2, 5);
        });

        it("should compose 3-level hierarchy: Grandparent * Parent * Child", () => {
            const grandparent = new SceneNode("Grandparent");
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");

            grandparent.addChild(parent);
            parent.addChild(child);

            grandparent.transform.setPosition(100, 0, 0);
            parent.transform.setPosition(0, 50, 0);
            child.transform.setPosition(0, 0, 25);

            grandparent.updateWorldTransform();

            const childWM = child.worldMatrix;
            expect(childWM[12]).toBeCloseTo(100, 5);
            expect(childWM[13]).toBeCloseTo(50, 5);
            expect(childWM[14]).toBeCloseTo(25, 5);
        });

        it("should skip worldMatrix recomputation if dirty flags are false (caching)", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.updateWorldTransform();
            expect(parent.isWorldDirty).toBe(false);
            expect(child.isWorldDirty).toBe(false);

            // Deliberately tamper with child's cached worldMatrix to detect if update runs
            child.worldMatrix[12] = 999.0;

            parent.updateWorldTransform();
            // Since neither node nor transform was dirty, child's matrix was not overwritten
            expect(child.worldMatrix[12]).toBeCloseTo(999.0, 5);
        });

        it("should force update worldMatrix when forceWorldDirty is true even if isWorldDirty is false", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.updateWorldTransform();
            expect(child.isWorldDirty).toBe(false);

            // Tamper with matrix
            child.worldMatrix[12] = 999.0;

            // Invoking with forceWorldDirty = true should recompute and overwrite tampered value
            parent.updateWorldTransform(true);
            expect(child.worldMatrix[12]).toBeCloseTo(0, 5);
        });

        it("should cascade needsWorldUpdate to children when parent was dirty", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);
            parent.updateWorldTransform();

            // Mutate parent position: makes parent dirty
            parent.transform.setPosition(50, 0, 0);
            expect(parent.isWorldDirty).toBe(true);

            parent.updateWorldTransform();
            expect(child.worldMatrix[12]).toBeCloseTo(50, 5);
            expect(parent.isWorldDirty).toBe(false);
            expect(child.isWorldDirty).toBe(false);
        });

        it("should re-evaluate world matrix when local transform position/rotation/scale is mutated", () => {
            const node = new SceneNode("Dynamic");
            node.updateWorldTransform();
            expect(node.worldMatrix[12]).toBeCloseTo(0, 5);

            node.transform.setPosition(7, 8, 9);
            node.updateWorldTransform();

            expect(node.worldMatrix[12]).toBeCloseTo(7, 5);
            expect(node.worldMatrix[13]).toBeCloseTo(8, 5);
            expect(node.worldMatrix[14]).toBeCloseTo(9, 5);
        });

        it("should cascade computedVisible across hierarchy during update", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.visible = false;
            parent.updateWorldTransform();

            expect(parent.computedVisible).toBe(false);
            expect(child.computedVisible).toBe(false);
        });
    });

    describe("destroy()", () => {
        it("should detach node from parent upon destroy", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            child.destroy();
            expect(parent.children.length).toBe(0);
            expect(child.parent).toBeNull();
        });

        it("should recursively destroy all children and clear children array", () => {
            const root = new SceneNode("Root");
            const child1 = new SceneNode("Child1");
            const child2 = new SceneNode("Child2");
            const grandChild = new SceneNode("GrandChild");

            root.addChild(child1).addChild(child2);
            child1.addChild(grandChild);

            const grandChildDestroySpy = vi.spyOn(grandChild, "destroy");
            const child1DestroySpy = vi.spyOn(child1, "destroy");
            const child2DestroySpy = vi.spyOn(child2, "destroy");

            root.destroy();

            expect(child1DestroySpy).toHaveBeenCalledTimes(1);
            expect(child2DestroySpy).toHaveBeenCalledTimes(1);
            expect(grandChildDestroySpy).toHaveBeenCalledTimes(1);
            expect(root.children.length).toBe(0);
        });

        it("should operate safely on an isolated node without parent or children", () => {
            const node = new SceneNode("Isolated");
            expect(() => node.destroy()).not.toThrow();
            expect(node.parent).toBeNull();
            expect(node.children.length).toBe(0);
        });

        it("should leave detached hierarchy in clean state", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            parent.destroy();
            expect(parent.children.length).toBe(0);
            expect(child.parent).toBeNull();
        });

        it("should operate safely when destroy() is called multiple times (idempotent)", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");
            parent.addChild(child);

            expect(() => {
                parent.destroy();
                parent.destroy();
                child.destroy();
            }).not.toThrow();

            expect(parent.children.length).toBe(0);
            expect(parent.parent).toBeNull();
            expect(child.children.length).toBe(0);
            expect(child.parent).toBeNull();
        });
    });
});

