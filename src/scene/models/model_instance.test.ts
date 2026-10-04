import { describe, it, expect, vi } from "vitest";
import { ModelInstance } from "./model_instance";
import { SceneNode } from "../core/scene_node";
import { Scene } from "../core/scene";
import { Transform } from "../core/transform";
import { QuadGeometry } from "./primitives/quad_geometry";
import { CubeGeometry } from "./primitives/cube_geometry";
import { UnlitMaterial } from "../materials/unlit_material";
import type { IMeshGeometry } from "./mesh_geometry_types";
import type { IMaterial } from "../materials/material_types";
import { isRenderable, type IModelInstance } from "./model_instance_types";
import type { ISceneNode } from "../core/scene_node_types";

describe("ModelInstance", () => {
    function createTestFixtures() {
        const geometry: IMeshGeometry = new QuadGeometry({ width: 1.0, height: 1.0 });
        const material: IMaterial = new UnlitMaterial({ color: [1.0, 0.0, 0.0, 1.0] });
        return { geometry, material };
    }

    describe("constructor and initial properties", () => {
        it("assigns geometry, material, default name 'ModelInstance', and default renderOrder 0", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material);

            expect(instance.geometry).toBe(geometry);
            expect(instance.material).toBe(material);
            expect(instance.name).toBe("ModelInstance");
            expect(instance.renderOrder).toBe(0);
            expect(instance.isRenderable).toBe(true);
            expect(isRenderable(instance)).toBe(true);
            expect(isRenderable(new SceneNode())).toBe(false);
        });

        it("accepts custom name and id", () => {
            const { geometry, material } = createTestFixtures();
            const customName = "AsteroidMesh";
            const customId = "asteroid-custom-node-42";
            const instance = new ModelInstance(geometry, material, customName, customId);

            expect(instance.name).toBe(customName);
            expect(instance.id).toBe(customId);
        });

        it("generates unique SceneNode id if no id provided (matching /^SceneNode_\\d+/ or /^ModelInstance_\\d+/)", () => {
            const { geometry, material } = createTestFixtures();

            // Default constructor uses "ModelInstance" prefix
            const instance1 = new ModelInstance(geometry, material);
            const instance2 = new ModelInstance(geometry, material);

            expect(instance1.id).toMatch(/^ModelInstance_\d+_[a-z0-9]+$/);
            expect(instance2.id).toMatch(/^ModelInstance_\d+_[a-z0-9]+$/);
            expect(instance1.id).not.toBe(instance2.id);

            // Passing "SceneNode" as name matches /^SceneNode_\d+/
            const instanceSceneNode = new ModelInstance(geometry, material, "SceneNode");
            expect(instanceSceneNode.id).toMatch(/^SceneNode_\d+_[a-z0-9]+$/);
        });

        it("is an instance of SceneNode and inherits transform and hierarchy functionality", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material);

            // Inheritance checks
            expect(instance).toBeInstanceOf(SceneNode);
            expect(instance.transform).toBeInstanceOf(Transform);

            // Hierarchy initial state
            expect(instance.parent).toBeNull();
            expect(instance.children).toEqual([]);
            expect(instance.children.length).toBe(0);

            // Visibility initial state
            expect(instance.visible).toBe(true);
            expect(instance.computedVisible).toBe(true);
            expect(instance.isWorldDirty).toBe(true);

            // World matrix initialized to identity 4x4
            const wm = instance.worldMatrix;
            expect(wm).toBeInstanceOf(Float32Array);
            expect(wm.length).toBe(16);
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    const expected = row === col ? 1.0 : 0.0;
                    expect(wm[col * 4 + row]).toBeCloseTo(expected, 5);
                }
            }
        });
    });

    describe("property mutations and state", () => {
        it("allows replacing geometry dynamically", () => {
            const { geometry: quadGeo, material } = createTestFixtures();
            const instance = new ModelInstance(quadGeo, material);
            expect(instance.geometry).toBe(quadGeo);

            const cubeGeo = new CubeGeometry();
            instance.geometry = cubeGeo;
            expect(instance.geometry).toBe(cubeGeo);
        });

        it("allows replacing material dynamically", () => {
            const { geometry, material: unlitRed } = createTestFixtures();
            const instance = new ModelInstance(geometry, unlitRed);
            expect(instance.material).toBe(unlitRed);

            const unlitBlue = new UnlitMaterial({ color: [0.0, 0.0, 1.0, 1.0] });
            instance.material = unlitBlue;
            expect(instance.material).toBe(unlitBlue);
        });

        it("allows modifying renderOrder (e.g. positive, negative, zero for render sorting)", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material);

            expect(instance.renderOrder).toBe(0);

            // Positive render order (e.g. transparent overlays)
            instance.renderOrder = 100;
            expect(instance.renderOrder).toBe(100);

            // Negative render order (e.g. background skybox)
            instance.renderOrder = -50;
            expect(instance.renderOrder).toBe(-50);

            // Zero render order (default opaque queue)
            instance.renderOrder = 0;
            expect(instance.renderOrder).toBe(0);

            // Sorting contract verification across an array of ModelInstances
            const background = new ModelInstance(geometry, material, "Background");
            background.renderOrder = -100;

            const opaque = new ModelInstance(geometry, material, "Opaque");
            opaque.renderOrder = 0;

            const transparent = new ModelInstance(geometry, material, "Transparent");
            transparent.renderOrder = 50;

            const list: IModelInstance[] = [transparent, background, opaque];
            list.sort((a, b) => a.renderOrder - b.renderOrder);

            expect(list[0]).toBe(background);
            expect(list[1]).toBe(opaque);
            expect(list[2]).toBe(transparent);
        });

        it("allows modifying name", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material);
            expect(instance.name).toBe("ModelInstance");

            instance.name = "HeroShip";
            expect(instance.name).toBe("HeroShip");

            instance.name = "Ship/Variant_#2:alpha_✨";
            expect(instance.name).toBe("Ship/Variant_#2:alpha_✨");

            instance.name = "";
            expect(instance.name).toBe("");
        });
    });

    describe("SceneNode and Transform hierarchy integration", () => {
        it("can be added as child of another SceneNode or Scene", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material, "ModelChild");

            // Attach to a SceneNode parent
            const parentNode = new SceneNode("ParentNode");
            const chainResult = parentNode.addChild(instance);
            expect(chainResult).toBe(parentNode);
            expect(instance.parent).toBe(parentNode);
            expect(parentNode.children).toContain(instance);

            // Detach from parent
            instance.removeFromParent();
            expect(instance.parent).toBeNull();
            expect(parentNode.children).not.toContain(instance);

            // Attach to a Scene container
            const scene = new Scene("WorldScene");
            const sceneChainResult = scene.add(instance);
            expect(sceneChainResult).toBe(scene);
            expect(instance.parent).toBe(scene.root);
            expect(scene.root.children).toContain(instance);

            // Remove from Scene
            const removed = scene.remove(instance);
            expect(removed).toBe(true);
            expect(instance.parent).toBeNull();
            expect(scene.root.children).not.toContain(instance);
        });

        it("updating transform (e.g. position, rotation, scale) updates its local and world matrices", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material);

            expect(instance.isWorldDirty).toBe(true);
            instance.updateWorldTransform();
            expect(instance.isWorldDirty).toBe(false);

            // Mutate transform position and scale
            instance.transform.setPosition(12, 24, 36);
            instance.transform.setScale(2, 3, 4);
            expect(instance.isWorldDirty).toBe(true);

            instance.updateWorldTransform();
            expect(instance.isWorldDirty).toBe(false);

            const wm = instance.worldMatrix;
            // Column-major translation indices: X=12, Y=13, Z=14
            expect(wm[12]).toBeCloseTo(12, 5);
            expect(wm[13]).toBeCloseTo(24, 5);
            expect(wm[14]).toBeCloseTo(36, 5);

            // Scale diagonal components: m00=2, m11=3, m22=4
            expect(wm[0]).toBeCloseTo(2, 5);
            expect(wm[5]).toBeCloseTo(3, 5);
            expect(wm[10]).toBeCloseTo(4, 5);
        });

        it("moving parent node cascades worldMatrix update to ModelInstance", () => {
            const { geometry, material } = createTestFixtures();
            const parent = new SceneNode("ParentGroup");
            const instance = new ModelInstance(geometry, material, "ChildModel");
            parent.addChild(instance);

            parent.transform.setPosition(100, 50, 25);
            instance.transform.setPosition(10, 5, 2);

            parent.updateWorldTransform();

            const childWM = instance.worldMatrix;
            // Composed translation: X = 100 + 10 = 110, Y = 50 + 5 = 55, Z = 25 + 2 = 27
            expect(childWM[12]).toBeCloseTo(110, 5);
            expect(childWM[13]).toBeCloseTo(55, 5);
            expect(childWM[14]).toBeCloseTo(27, 5);

            // Further moving the parent marks child dirty and cascades on next update
            parent.transform.setPosition(200, 0, 0);
            expect(parent.isWorldDirty).toBe(true);
            expect(instance.isWorldDirty).toBe(true);

            parent.updateWorldTransform();
            expect(instance.worldMatrix[12]).toBeCloseTo(210, 5);
            expect(instance.worldMatrix[13]).toBeCloseTo(5, 5);
            expect(instance.worldMatrix[14]).toBeCloseTo(2, 5);
        });

        it("supports traversal (node.traverse) finding the ModelInstance", () => {
            const { geometry, material } = createTestFixtures();
            const root = new SceneNode("Root");
            const intermediate = new SceneNode("Group");
            const instanceA = new ModelInstance(geometry, material, "InstanceA");
            const instanceB = new ModelInstance(geometry, material, "InstanceB");

            root.addChild(intermediate);
            intermediate.addChild(instanceA);
            root.addChild(instanceB);

            const visited: ISceneNode[] = [];
            root.traverse((node) => visited.push(node));

            expect(visited).toEqual([root, intermediate, instanceA, instanceB]);
            expect(visited.filter((node): node is ModelInstance => node instanceof ModelInstance)).toEqual([
                instanceA,
                instanceB,
            ]);
        });
    });

    describe("lifecycle and destruction", () => {
        it("isDestroyed starts false, becomes true on destroy()", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material);

            let isDestroyed = false;
            instance.onDestroy(() => {
                isDestroyed = true;
            });

            expect(isDestroyed).toBe(false);
            instance.destroy();
            expect(isDestroyed).toBe(true);
        });

        it("registered onDestroy listeners are called once upon destroy()", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material);

            const listenerA = vi.fn();
            const listenerB = vi.fn();
            instance.onDestroy(listenerA);
            instance.onDestroy(listenerB);

            expect(listenerA).not.toHaveBeenCalled();
            expect(listenerB).not.toHaveBeenCalled();

            instance.destroy();

            expect(listenerA).toHaveBeenCalledTimes(1);
            expect(listenerB).toHaveBeenCalledTimes(1);
        });

        it("allows unsubscribing an onDestroy listener before destruction", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material);

            const listener = vi.fn();
            const unsubscribe = instance.onDestroy(listener);

            unsubscribe();
            instance.destroy();

            expect(listener).not.toHaveBeenCalled();
        });

        it("idempotent destruction", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material);

            const listener = vi.fn();
            instance.onDestroy(listener);

            // Repeated destroy calls must not throw or re-trigger listeners
            expect(() => {
                instance.destroy();
                instance.destroy();
                instance.destroy();
            }).not.toThrow();

            expect(listener).toHaveBeenCalledTimes(1);
            expect(instance.children.length).toBe(0);
            expect(instance.parent).toBeNull();
        });

        it("removing from parent on destroy", () => {
            const { geometry, material } = createTestFixtures();
            const parent = new SceneNode("Parent");
            const instance = new ModelInstance(geometry, material, "ChildInstance");
            parent.addChild(instance);

            expect(parent.children).toContain(instance);
            expect(instance.parent).toBe(parent);

            instance.destroy();

            expect(instance.parent).toBeNull();
            expect(parent.children).not.toContain(instance);
            expect(parent.children.length).toBe(0);
        });

        it("recursively destroys child nodes attached to ModelInstance", () => {
            const { geometry, material } = createTestFixtures();
            const instance = new ModelInstance(geometry, material, "ParentModel");
            const childNode = new SceneNode("ChildNode");
            instance.addChild(childNode);

            const childDestroySpy = vi.spyOn(childNode, "destroy");
            instance.destroy();

            expect(childDestroySpy).toHaveBeenCalledTimes(1);
            expect(instance.children.length).toBe(0);
            expect(childNode.parent).toBeNull();
        });
    });
});
