import { describe, it, expect, vi } from "vitest";
import { Skybox } from "./skybox";
import { SkyboxMaterial } from "./skybox_material";
import { BlendMode } from "../materials/material_types";
import { ModelInstance } from "../models/model_instance";
import { SceneNode } from "../core/scene_node";
import { Scene } from "../core/scene";
import { CubeGeometry } from "../models/primitives/cube_geometry";
import { QuadGeometry } from "../models/primitives/quad_geometry";
import { TextureUnit } from "../../webgl/textures/texture_types";
import { createMockCubeTexture } from "../../testing/mocks/mock_texture";
import type { ISceneNode } from "../core/scene_node_types";
import type { IMeshGeometry } from "../models/mesh_geometry_types";

describe("Skybox", () => {
    describe("constructor and default initialization", () => {
        it("default geometry is an instance of CubeGeometry", () => {
            const skybox = new Skybox();

            expect(skybox.geometry).toBeInstanceOf(CubeGeometry);
            const cube = skybox.geometry as CubeGeometry;
            expect(cube.width).toBe(1.0);
            expect(cube.height).toBe(1.0);
            expect(cube.depth).toBe(1.0);
            expect(cube.vertexCount).toBe(24);
        });

        it("default material is an instance of SkyboxMaterial, exposed on skyboxMaterial and material properties", () => {
            const skybox = new Skybox();

            expect(skybox.skyboxMaterial).toBeInstanceOf(SkyboxMaterial);
            expect(skybox.material).toBeInstanceOf(SkyboxMaterial);
            expect(skybox.skyboxMaterial).toBe(skybox.material);
        });

        it("default name is 'Skybox'", () => {
            const skybox = new Skybox();

            expect(skybox.name).toBe("Skybox");
        });

        it("default renderOrder is -100", () => {
            const skybox = new Skybox();

            expect(skybox.renderOrder).toBe(-100);
        });

        it("generates unique ID matching /^Skybox_\\d+_[a-z0-9]+$/ if no id provided", () => {
            const skybox1 = new Skybox();
            const skybox2 = new Skybox();

            const pattern = /^Skybox_\d+_[a-z0-9]+$/;
            expect(skybox1.id).toMatch(pattern);
            expect(skybox2.id).toMatch(pattern);
            expect(skybox1.id).not.toBe(skybox2.id);
        });

        it("default exposure is 1.0, tint is [1.0, 1.0, 1.0], rotationY is 0.0, cubeTexture is null", () => {
            const skybox = new Skybox();

            expect(skybox.exposure).toBe(1.0);
            expect(skybox.tint).toEqual([1.0, 1.0, 1.0]);
            expect(skybox.rotationY).toBe(0.0);
            expect(skybox.cubeTexture).toBeNull();
        });

        it("inherits ModelInstance and SceneNode (transform, parent null, children empty, visible true)", () => {
            const skybox = new Skybox();

            // Inheritance checks
            expect(skybox).toBeInstanceOf(ModelInstance);
            expect(skybox).toBeInstanceOf(SceneNode);

            // Transform & world matrix
            expect(skybox.transform).toBeDefined();
            expect(skybox.worldMatrix).toBeInstanceOf(Float32Array);
            expect(skybox.worldMatrix.length).toBe(16);

            // Hierarchy initial state
            expect(skybox.parent).toBeNull();
            expect(skybox.children).toEqual([]);
            expect(skybox.children.length).toBe(0);

            // Visibility initial state
            expect(skybox.visible).toBe(true);
            expect(skybox.computedVisible).toBe(true);
            expect(skybox.isWorldDirty).toBe(true);
        });
    });

    describe("constructor parameter resolution and options", () => {
        it("accepts custom geometry (e.g. custom CubeGeometry or MeshGeometry override)", () => {
            const customGeo: IMeshGeometry = new CubeGeometry({ width: 2.0, height: 2.0, depth: 2.0 });
            const skybox = new Skybox({ geometry: customGeo });

            expect(skybox.geometry).toBe(customGeo);

            const quadGeo: IMeshGeometry = new QuadGeometry({ width: 1.0, height: 1.0 });
            const skyboxWithQuad = new Skybox({ geometry: quadGeo });

            expect(skyboxWithQuad.geometry).toBe(quadGeo);
        });

        it("accepts custom name and id", () => {
            const skybox = new Skybox({
                name: "DeepSpaceSky",
                id: "skybox-custom-uuid-007",
            });

            expect(skybox.name).toBe("DeepSpaceSky");
            expect(skybox.id).toBe("skybox-custom-uuid-007");
        });

        it("accepts custom renderOrder (e.g. -50)", () => {
            const skybox = new Skybox({ renderOrder: -50 });

            expect(skybox.renderOrder).toBe(-50);
        });

        it("passes cubeTexture through to internal SkyboxMaterial (assigned to TextureUnit.Environment)", () => {
            const mockCube = createMockCubeTexture("galaxy-map");
            const skybox = new Skybox({ cubeTexture: mockCube });

            expect(skybox.cubeTexture).toBe(mockCube);
            expect(skybox.skyboxMaterial.cubeTexture).toBe(mockCube);
            expect(skybox.skyboxMaterial.getCubeTexture(TextureUnit.Environment)).toBe(mockCube);
        });

        it("passes exposure, tint, and rotationY through to internal SkyboxMaterial", () => {
            const skybox = new Skybox({
                exposure: 2.5,
                tint: [0.8, 0.9, 1.0],
                rotationY: Math.PI / 4,
            });

            expect(skybox.exposure).toBe(2.5);
            expect(skybox.tint).toEqual([0.8, 0.9, 1.0]);
            expect(skybox.rotationY).toBeCloseTo(Math.PI / 4);

            const uniforms = skybox.skyboxMaterial.getUniforms();
            expect(uniforms["u_exposure"]).toBe(2.5);
            expect(uniforms["u_tint"]).toEqual([0.8, 0.9, 1.0]);
            expect(uniforms["u_rotationY"]).toBeCloseTo(Math.PI / 4);
        });

        it("passes pipelineState overrides through to SkyboxMaterial", () => {
            const skybox = new Skybox({
                pipelineState: {
                    blendMode: BlendMode.Alpha,
                    depthTest: false,
                    depthWrite: true,
                    cullFace: true,
                },
            });

            expect(skybox.skyboxMaterial.pipelineState).toEqual({
                blendMode: BlendMode.Alpha,
                depthTest: false,
                depthWrite: true,
                cullFace: true,
            });
        });

        it("passes custom uniforms through to SkyboxMaterial", () => {
            const skybox = new Skybox({
                uniforms: {
                    u_customParam: 42.0,
                    u_extraScale: [2.0, 2.0],
                },
            });

            const uniforms = skybox.skyboxMaterial.getUniforms();
            expect(uniforms["u_customParam"]).toBe(42.0);
            expect(uniforms["u_extraScale"]).toEqual([2.0, 2.0]);
            // Default skybox uniforms should also be preserved
            expect(uniforms["u_exposure"]).toBe(1.0);
            expect(uniforms["u_tint"]).toEqual([1.0, 1.0, 1.0]);
            expect(uniforms["u_rotationY"]).toBe(0.0);
        });
    });

    describe("property pass-through getters and setters", () => {
        it("exposure: reads and writes to skyboxMaterial.exposure and updates u_exposure uniform", () => {
            const skybox = new Skybox();
            expect(skybox.exposure).toBe(1.0);

            skybox.exposure = 3.5;
            expect(skybox.exposure).toBe(3.5);
            expect(skybox.skyboxMaterial.exposure).toBe(3.5);
            expect(skybox.skyboxMaterial.getUniforms()["u_exposure"]).toBe(3.5);

            // Updating material uniform directly reflects on skybox getter
            skybox.skyboxMaterial.exposure = 0.25;
            expect(skybox.exposure).toBe(0.25);
        });

        it("tint: reads and writes to skyboxMaterial.tint and updates u_tint uniform", () => {
            const skybox = new Skybox();
            expect(skybox.tint).toEqual([1.0, 1.0, 1.0]);

            skybox.tint = [0.2, 0.4, 0.6];
            expect(skybox.tint).toEqual([0.2, 0.4, 0.6]);
            expect(skybox.skyboxMaterial.tint).toEqual([0.2, 0.4, 0.6]);
            expect(skybox.skyboxMaterial.getUniforms()["u_tint"]).toEqual([0.2, 0.4, 0.6]);

            // Updating material uniform directly reflects on skybox getter
            skybox.skyboxMaterial.tint = [0.9, 0.8, 0.7];
            expect(skybox.tint).toEqual([0.9, 0.8, 0.7]);
        });

        it("rotationY: reads and writes to skyboxMaterial.rotationY and updates u_rotationY uniform", () => {
            const skybox = new Skybox();
            expect(skybox.rotationY).toBe(0.0);

            skybox.rotationY = 1.57;
            expect(skybox.rotationY).toBeCloseTo(1.57);
            expect(skybox.skyboxMaterial.rotationY).toBeCloseTo(1.57);
            expect(skybox.skyboxMaterial.getUniforms()["u_rotationY"]).toBeCloseTo(1.57);

            // Updating material uniform directly reflects on skybox getter
            skybox.skyboxMaterial.rotationY = 3.14;
            expect(skybox.rotationY).toBeCloseTo(3.14);
        });

        it("cubeTexture: reads and writes to skyboxMaterial.cubeTexture; setting null or undefined clears texture", () => {
            const skybox = new Skybox();
            expect(skybox.cubeTexture).toBeNull();

            const mockCube1 = createMockCubeTexture("cube-1");
            skybox.cubeTexture = mockCube1;

            expect(skybox.cubeTexture).toBe(mockCube1);
            expect(skybox.skyboxMaterial.cubeTexture).toBe(mockCube1);
            expect(skybox.skyboxMaterial.getCubeTexture(TextureUnit.Environment)).toBe(mockCube1);

            // Clear with null
            skybox.cubeTexture = null;
            expect(skybox.cubeTexture).toBeNull();
            expect(skybox.skyboxMaterial.cubeTexture).toBeNull();
            expect(skybox.skyboxMaterial.getCubeTexture(TextureUnit.Environment)).toBeNull();

            // Set again and clear with undefined
            const mockCube2 = createMockCubeTexture("cube-2");
            skybox.cubeTexture = mockCube2;
            expect(skybox.cubeTexture).toBe(mockCube2);

            skybox.cubeTexture = undefined;
            expect(skybox.cubeTexture).toBeNull();
            expect(skybox.skyboxMaterial.cubeTexture).toBeNull();
            expect(skybox.skyboxMaterial.getCubeTexture(TextureUnit.Environment)).toBeNull();
        });
    });

    describe("scene graph and transform hierarchy integration", () => {
        it("can be added as child of SceneNode or Scene", () => {
            const skybox = new Skybox();

            // Attach to a SceneNode
            const parentNode = new SceneNode("ParentWorld");
            const chainResult = parentNode.addChild(skybox);
            expect(chainResult).toBe(parentNode);
            expect(skybox.parent).toBe(parentNode);
            expect(parentNode.children).toContain(skybox);

            // Detach from SceneNode
            skybox.removeFromParent();
            expect(skybox.parent).toBeNull();
            expect(parentNode.children).not.toContain(skybox);

            // Attach to Scene
            const scene = new Scene("SpaceScene");
            const sceneChainResult = scene.add(skybox);
            expect(sceneChainResult).toBe(scene);
            expect(skybox.parent).toBe(scene.root);
            expect(scene.root.children).toContain(skybox);

            // Remove from Scene
            const removed = scene.remove(skybox);
            expect(removed).toBe(true);
            expect(skybox.parent).toBeNull();
            expect(scene.root.children).not.toContain(skybox);
        });

        it("updating transform (position, rotation, scale) updates worldMatrix", () => {
            const skybox = new Skybox();

            expect(skybox.isWorldDirty).toBe(true);
            skybox.updateWorldTransform();
            expect(skybox.isWorldDirty).toBe(false);

            // Modify transform components
            skybox.transform.setPosition(10, 20, 30);
            skybox.transform.setScale(50, 50, 50);
            expect(skybox.isWorldDirty).toBe(true);

            skybox.updateWorldTransform();
            expect(skybox.isWorldDirty).toBe(false);

            const wm = skybox.worldMatrix;
            // Column-major translation indices: X=12, Y=13, Z=14
            expect(wm[12]).toBeCloseTo(10, 5);
            expect(wm[13]).toBeCloseTo(20, 5);
            expect(wm[14]).toBeCloseTo(30, 5);

            // Diagonal scale components
            expect(wm[0]).toBeCloseTo(50, 5);
            expect(wm[5]).toBeCloseTo(50, 5);
            expect(wm[10]).toBeCloseTo(50, 5);
        });

        it("scene traversal discovers Skybox as a ModelInstance and SceneNode", () => {
            const root = new SceneNode("Root");
            const skybox = new Skybox({ name: "TraversedSkybox" });
            const regularNode = new SceneNode("OtherNode");

            root.addChild(skybox);
            root.addChild(regularNode);

            const visited: ISceneNode[] = [];
            root.traverse((node) => visited.push(node));

            expect(visited).toEqual([root, skybox, regularNode]);
            expect(visited).toContain(skybox);

            const modelInstances = visited.filter(
                (node): node is ModelInstance => node instanceof ModelInstance
            );
            expect(modelInstances).toEqual([skybox]);
            expect(modelInstances[0]).toBe(skybox);
        });
    });

    describe("lifecycle and destruction", () => {
        it("isDestroyed starts false, becomes true on destroy()", () => {
            const skybox = new Skybox();

            let isDestroyed = false;
            skybox.onDestroy(() => {
                isDestroyed = true;
            });

            expect(isDestroyed).toBe(false);
            skybox.destroy();
            expect(isDestroyed).toBe(true);
        });

        it("registered onDestroy listeners are called once upon destroy()", () => {
            const skybox = new Skybox();

            const listenerA = vi.fn();
            const listenerB = vi.fn();
            skybox.onDestroy(listenerA);
            skybox.onDestroy(listenerB);

            expect(listenerA).not.toHaveBeenCalled();
            expect(listenerB).not.toHaveBeenCalled();

            skybox.destroy();

            expect(listenerA).toHaveBeenCalledTimes(1);
            expect(listenerB).toHaveBeenCalledTimes(1);
        });

        it("removes from parent node on destroy", () => {
            const parent = new SceneNode("Parent");
            const skybox = new Skybox();
            parent.addChild(skybox);

            expect(parent.children).toContain(skybox);
            expect(skybox.parent).toBe(parent);

            skybox.destroy();

            expect(skybox.parent).toBeNull();
            expect(parent.children).not.toContain(skybox);
            expect(parent.children.length).toBe(0);
        });

        it("idempotent destruction", () => {
            const skybox = new Skybox();
            const listener = vi.fn();
            skybox.onDestroy(listener);

            expect(() => {
                skybox.destroy();
                skybox.destroy();
                skybox.destroy();
            }).not.toThrow();

            expect(listener).toHaveBeenCalledTimes(1);
            expect(skybox.children.length).toBe(0);
            expect(skybox.parent).toBeNull();
        });
    });
});
