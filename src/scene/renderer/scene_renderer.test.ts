import { describe, it, expect, vi, beforeEach } from "vitest";
import { mat4, mat3 } from "gl-matrix";
import { SceneRenderer } from "./scene_renderer";
import type { IScene } from "../core/scene_types";
import type { ICamera } from "../camera/camera_types";
import { BlendMode, type IMaterial, type PipelineState } from "../materials/material_types";
import type { IMeshGeometry } from "../models/mesh_geometry_types";
import type { CanvasDimensions, TimeInfo } from "../../webgl/canvas/canvas_types";
import type { RenderOptions } from "./scene_renderer_types";
import type { ShaderKey } from "../../webgl/shaders/shader_types";
import type { ITexture } from "../../webgl/textures/texture_types";
import type { ICubeTexture } from "../../webgl/textures/cube_texture_types";
import { TextureUnit } from "../../webgl/textures/texture_types";
import {
    createMockContextManager,
    createMockShaderProgram,
} from "../../testing/mocks/mock_context_manager";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { createMockTexture, createMockCubeTexture } from "../../testing/mocks/mock_texture";
import { Scene } from "../core/scene";
import { SceneNode } from "../core/scene_node";
import { PerspectiveCamera } from "../camera/perspective_camera";
import { QuadGeometry } from "../models/primitives/quad_geometry";
import { CubeGeometry } from "../models/primitives/cube_geometry";
import { MeshGeometry } from "../models/mesh_geometry";
import { STANDARD_VERTEX_LAYOUT } from "../models/primitives/standard_layout";
import { Material } from "../materials/material";
import { UnlitMaterial } from "../materials/unlit_material";
import { ModelInstance } from "../models/model_instance";
import {
    DEFAULT_RENDER_ORDER,
    DEPTH_SORT_EPSILON,
    TRANSPARENT_RENDER_ORDER_THRESHOLD,
} from "./scene_renderer_constants";
import { SpriteInstance } from "../sprites/sprite_instance";
import { SpriteGeometry } from "../sprites/sprite_geometry";
import { SpritePinMaterial } from "../sprites/sprite_pin_material";
import type { ISpriteMaterial } from "../sprites/sprite_material_types";
import { DEFAULT_SPRITE_RENDER_ORDER } from "../sprites/sprite_constants";

describe("SceneRenderer", () => {
    let mockGl: WebGL2RenderingContext;
    let mockCm: ReturnType<typeof createMockContextManager>;
    let renderer: SceneRenderer;

    const defaultDims: CanvasDimensions = {
        width: 800,
        height: 600,
        cssWidth: 800,
        cssHeight: 600,
        aspect: 800 / 600,
        dpr: 1.0,
    };

    const defaultTimeInfo: TimeInfo = {
        time: 12.5,
        dt: 0.016,
        frameCount: 750,
    };

    function createRenderOptions(
        scene: IScene,
        camera?: ICamera | null,
        overrides?: Partial<RenderOptions>
    ): RenderOptions {
        return {
            contextManager: mockCm,
            scene,
            camera,
            dimensions: defaultDims,
            timeInfo: defaultTimeInfo,
            ...overrides,
        };
    }

    function createCamera(options?: { x?: number; y?: number; z?: number; aspect?: number }): PerspectiveCamera {
        const camera = new PerspectiveCamera({
            fov: 60,
            aspect: options?.aspect ?? defaultDims.aspect,
            near: 0.1,
            far: 1000,
        });

        if (options?.x !== undefined || options?.y !== undefined || options?.z !== undefined) {
            camera.transform.setPosition(options?.x ?? 0, options?.y ?? 0, options?.z ?? 0);
            camera.updateWorldTransform();
        }

        vi.spyOn(camera, "updateAspectRatio");
        vi.spyOn(camera, "updateMatrices");
        return camera;
    }

    function createModelInstance(options?: {
        geometry?: IMeshGeometry;
        material?: IMaterial;
        renderOrder?: number;
        visible?: boolean;
        name?: string;
    }): ModelInstance {
        const geometry = options?.geometry ?? new QuadGeometry({ width: 1, height: 1 });
        const material = options?.material ?? new UnlitMaterial();
        const instance = new ModelInstance(geometry, material, options?.name ?? "TestModelInstance");

        if (options?.renderOrder !== undefined) {
            instance.renderOrder = options.renderOrder;
        } else if (options && "renderOrder" in options) {
            (instance as any).renderOrder = undefined;
        }

        if (options?.visible !== undefined) {
            instance.visible = options.visible;
        }

        return instance;
    }

    function createSpriteInstance(options?: {
        material?: ISpriteMaterial;
        renderOrder?: number;
        visible?: boolean;
        name?: string;
    }): SpriteInstance {
        const material = options?.material ?? new SpritePinMaterial();
        const instance = new SpriteInstance(
            { material },
            options?.name ?? "TestSpriteInstance"
        );

        if (options?.renderOrder !== undefined) {
            instance.renderOrder = options.renderOrder;
        }

        if (options?.visible !== undefined) {
            instance.visible = options.visible;
        }

        return instance;
    }

    beforeEach(() => {
        mockGl = createMockWebGL2Context();
        mockCm = createMockContextManager(mockGl);
        renderer = new SceneRenderer();
        SpriteGeometry.disposeSharedQuad();
    });

    describe("constructor", () => {
        it("instantiates a parameterless SceneRenderer", () => {
            const instance = new SceneRenderer();
            expect(instance).toBeInstanceOf(SceneRenderer);
        });
    });

    describe("render: hierarchical traversal and camera synchronization", () => {
        it("calls scene.update()", () => {
            const scene = new Scene();
            const updateSpy = vi.spyOn(scene, "update");
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(updateSpy).toHaveBeenCalledTimes(1);
        });

        it("calls camera.updateAspectRatio(dims.aspect) and camera.updateMatrices()", () => {
            const scene = new Scene();
            const camera = createCamera();
            const customDims: CanvasDimensions = {
                width: 1920,
                height: 1080,
                cssWidth: 960,
                cssHeight: 540,
                aspect: 1920 / 1080,
                dpr: 2.0,
            };

            renderer.render(createRenderOptions(scene, camera, { dimensions: customDims }));

            expect(camera.updateAspectRatio).toHaveBeenCalledTimes(1);
            expect(camera.updateAspectRatio).toHaveBeenCalledWith(customDims.aspect);
            expect(camera.updateMatrices).toHaveBeenCalledTimes(1);
        });

        it("extracts camera world position into Tier A uniform u_cameraPosition", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const camera = createCamera({ x: 42.5, y: -18.25, z: 100.0 });
            const instance = createModelInstance();
            const scene = new Scene();
            scene.addChild(instance);

            renderer.render(createRenderOptions(scene, camera));

            expect(mockShader.setVec3).toHaveBeenCalledWith(
                "u_cameraPosition",
                { x: 42.5, y: -18.25, z: 100.0 }
            );
        });
    });

    describe("render: render queue collection and sorting", () => {
        it("collects visible ModelInstance nodes with geometry and material", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const plainNode = new SceneNode("PlainContainerNode");
            const instanceNode = createModelInstance({ name: "MeshNode" });

            const scene = new Scene();
            scene.addChild(plainNode);
            scene.addChild(instanceNode);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.geometries.bind).toHaveBeenCalledTimes(1);
            expect(mockCm.geometries.bind).toHaveBeenCalledWith(instanceNode.geometry);
        });

        it("skips invisible nodes (visible = false)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const visibleInstance = createModelInstance({ name: "VisibleInstance" });
            const invisibleInstance = createModelInstance({
                name: "InvisibleInstance",
                visible: false,
            });

            const scene = new Scene();
            scene.addChild(visibleInstance);
            scene.addChild(invisibleInstance);

            const camera = createCamera();
            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.geometries.bind).toHaveBeenCalledTimes(1);
            expect(mockCm.geometries.bind).toHaveBeenCalledWith(visibleInstance.geometry);
            expect(mockCm.geometries.bind).not.toHaveBeenCalledWith(invisibleInstance.geometry);
        });

        it("sorts render queue by renderOrder ascending (e.g. -100 before 0 before 10)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const instOrder10 = createModelInstance({
                renderOrder: 10,
                geometry: new QuadGeometry({ width: 10, height: 10 }),
                name: "Order10",
            });
            const instOrderMinus100 = createModelInstance({
                renderOrder: -100,
                geometry: new QuadGeometry({ width: 1, height: 1 }),
                name: "OrderMinus100",
            });
            const instOrder0 = createModelInstance({
                renderOrder: 0,
                geometry: new QuadGeometry({ width: 5, height: 5 }),
                name: "Order0",
            });

            const executionOrder: IMeshGeometry[] = [];
            (mockCm.geometries.bind as any).mockImplementation((geom: IMeshGeometry) => {
                executionOrder.push(geom);
                return {
                    id: 1,
                    vertexBuffer: {} as any,
                    indexBuffer: null,
                    indexCount: null,
                    indexType: 5123,
                    uploadedVersion: 1,
                    disposeListener: vi.fn(),
                };
            });

            const scene = new Scene();
            scene.addChild(instOrder10);
            scene.addChild(instOrderMinus100);
            scene.addChild(instOrder0);

            const camera = createCamera();
            renderer.render(createRenderOptions(scene, camera));

            expect(executionOrder).toEqual([
                instOrderMinus100.geometry,
                instOrder0.geometry,
                instOrder10.geometry,
            ]);
        });

        it("defaults undefined renderOrder to 0", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const instOrder5 = createModelInstance({
                renderOrder: 5,
                geometry: new QuadGeometry({ width: 5, height: 5 }),
                name: "Order5",
            });
            const instOrderUndefined = createModelInstance({
                renderOrder: undefined,
                geometry: new QuadGeometry({ width: 2, height: 2 }),
                name: "OrderUndefined",
            });
            const instOrderMinus5 = createModelInstance({
                renderOrder: -5,
                geometry: new QuadGeometry({ width: 1, height: 1 }),
                name: "OrderMinus5",
            });

            const executionOrder: IMeshGeometry[] = [];
            (mockCm.geometries.bind as any).mockImplementation((geom: IMeshGeometry) => {
                executionOrder.push(geom);
                return {
                    id: 1,
                    vertexBuffer: {} as any,
                    indexBuffer: null,
                    indexCount: null,
                    indexType: 5123,
                    uploadedVersion: 1,
                    disposeListener: vi.fn(),
                };
            });

            const scene = new Scene();
            scene.addChild(instOrder5);
            scene.addChild(instOrderUndefined);
            scene.addChild(instOrderMinus5);

            const camera = createCamera();
            renderer.render(createRenderOptions(scene, camera));

            expect(executionOrder).toEqual([
                instOrderMinus5.geometry,
                instOrderUndefined.geometry,
                instOrder5.geometry,
            ]);
        });

        describe("transparent camera-depth sorting", () => {
            it("sorts transparent items with equal renderOrder >= TRANSPARENT_RENDER_ORDER_THRESHOLD back-to-front (item A closer than item B)", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const itemA = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemA_Near",
                });
                itemA.transform.setPosition(0, 0, 5); // depth = 10 - 5 = 5 (closer)

                const itemB = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemB_Far",
                });
                itemB.transform.setPosition(0, 0, -10); // depth = 10 - (-10) = 20 (farther)

                const executionOrder: string[] = [];
                vi.spyOn(itemA, "render").mockImplementation(() => {
                    executionOrder.push(itemA.name);
                });
                vi.spyOn(itemB, "render").mockImplementation(() => {
                    executionOrder.push(itemB.name);
                });

                const scene = new Scene();
                scene.addChild(itemA);
                scene.addChild(itemB);

                renderer.render(createRenderOptions(scene, camera));

                // B is farther from camera than A, so B renders before A
                expect(executionOrder).toEqual(["ItemB_Far", "ItemA_Near"]);
                expect(itemA.render).toHaveBeenCalledTimes(1);
                expect(itemB.render).toHaveBeenCalledTimes(1);
            });

            it("sorts transparent items with equal renderOrder >= TRANSPARENT_RENDER_ORDER_THRESHOLD back-to-front (item B closer than item A)", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const itemA = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemA_Far",
                });
                itemA.transform.setPosition(0, 0, -20); // depth = 10 - (-20) = 30 (farther)

                const itemB = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemB_Near",
                });
                itemB.transform.setPosition(0, 0, 2); // depth = 10 - 2 = 8 (closer)

                const executionOrder: string[] = [];
                vi.spyOn(itemA, "render").mockImplementation(() => {
                    executionOrder.push(itemA.name);
                });
                vi.spyOn(itemB, "render").mockImplementation(() => {
                    executionOrder.push(itemB.name);
                });

                const scene = new Scene();
                scene.addChild(itemA);
                scene.addChild(itemB);

                renderer.render(createRenderOptions(scene, camera));

                // A is farther from camera than B, so A renders before B
                expect(executionOrder).toEqual(["ItemA_Far", "ItemB_Near"]);
                expect(itemA.render).toHaveBeenCalledTimes(1);
                expect(itemB.render).toHaveBeenCalledTimes(1);
            });

            it("preserves stable insertion order when two transparent items share the exact same camera depth (A added before B)", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const itemA = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemA_EqualDepth",
                });
                itemA.transform.setPosition(5, 2, 0); // depth = 10 - 0 = 10

                const itemB = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemB_EqualDepth",
                });
                itemB.transform.setPosition(-3, -4, 0); // depth = 10 - 0 = 10

                const executionOrder: string[] = [];
                vi.spyOn(itemA, "render").mockImplementation(() => {
                    executionOrder.push(itemA.name);
                });
                vi.spyOn(itemB, "render").mockImplementation(() => {
                    executionOrder.push(itemB.name);
                });

                const scene = new Scene();
                scene.addChild(itemA);
                scene.addChild(itemB);

                renderer.render(createRenderOptions(scene, camera));
                expect(executionOrder).toEqual(["ItemA_EqualDepth", "ItemB_EqualDepth"]);
            });

            it("preserves stable insertion order when two transparent items share the exact same camera depth (B added before A)", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const itemA = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemA_EqualDepth",
                });
                itemA.transform.setPosition(5, 2, 0); // depth = 10 - 0 = 10

                const itemB = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemB_EqualDepth",
                });
                itemB.transform.setPosition(-3, -4, 0); // depth = 10 - 0 = 10

                const executionOrder: string[] = [];
                vi.spyOn(itemA, "render").mockImplementation(() => {
                    executionOrder.push(itemA.name);
                });
                vi.spyOn(itemB, "render").mockImplementation(() => {
                    executionOrder.push(itemB.name);
                });

                const scene = new Scene();
                scene.addChild(itemB);
                scene.addChild(itemA);

                renderer.render(createRenderOptions(scene, camera));
                expect(executionOrder).toEqual(["ItemB_EqualDepth", "ItemA_EqualDepth"]);
            });

            it("preserves stable insertion order when depth difference is within DEPTH_SORT_EPSILON", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const itemA = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemA_BaseDepth",
                });
                itemA.transform.setPosition(0, 0, 0); // depth = 10.0

                const itemB = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "ItemB_SubEpsilonDepth",
                });
                // Slightly different z within DEPTH_SORT_EPSILON (e.g. half of DEPTH_SORT_EPSILON)
                itemB.transform.setPosition(0, 0, DEPTH_SORT_EPSILON * 0.5);

                const executionOrder: string[] = [];
                vi.spyOn(itemA, "render").mockImplementation(() => {
                    executionOrder.push(itemA.name);
                });
                vi.spyOn(itemB, "render").mockImplementation(() => {
                    executionOrder.push(itemB.name);
                });

                const scene = new Scene();
                scene.addChild(itemA);
                scene.addChild(itemB);

                renderer.render(createRenderOptions(scene, camera));

                // Since depth difference is <= DEPTH_SORT_EPSILON, stable insertion order (A then B) is preserved
                expect(executionOrder).toEqual(["ItemA_BaseDepth", "ItemB_SubEpsilonDepth"]);
            });

            it("preserves stable insertion order for items with renderOrder < TRANSPARENT_RENDER_ORDER_THRESHOLD regardless of depth (near added before far)", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const itemNear = createModelInstance({
                    renderOrder: DEFAULT_RENDER_ORDER,
                    name: "OpaqueNear",
                });
                itemNear.transform.setPosition(0, 0, 8); // depth = 2 (closer)

                const itemFar = createModelInstance({
                    renderOrder: DEFAULT_RENDER_ORDER,
                    name: "OpaqueFar",
                });
                itemFar.transform.setPosition(0, 0, -50); // depth = 60 (farther)

                const executionOrder: string[] = [];
                vi.spyOn(itemNear, "render").mockImplementation(() => {
                    executionOrder.push(itemNear.name);
                });
                vi.spyOn(itemFar, "render").mockImplementation(() => {
                    executionOrder.push(itemFar.name);
                });

                const scene = new Scene();
                scene.addChild(itemNear);
                scene.addChild(itemFar);

                renderer.render(createRenderOptions(scene, camera));
                expect(executionOrder).toEqual(["OpaqueNear", "OpaqueFar"]);
            });

            it("preserves stable insertion order for items with renderOrder < TRANSPARENT_RENDER_ORDER_THRESHOLD regardless of depth (far added before near)", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const itemNear = createModelInstance({
                    renderOrder: DEFAULT_RENDER_ORDER,
                    name: "OpaqueNear",
                });
                itemNear.transform.setPosition(0, 0, 8); // depth = 2 (closer)

                const itemFar = createModelInstance({
                    renderOrder: DEFAULT_RENDER_ORDER,
                    name: "OpaqueFar",
                });
                itemFar.transform.setPosition(0, 0, -50); // depth = 60 (farther)

                const executionOrder: string[] = [];
                vi.spyOn(itemNear, "render").mockImplementation(() => {
                    executionOrder.push(itemNear.name);
                });
                vi.spyOn(itemFar, "render").mockImplementation(() => {
                    executionOrder.push(itemFar.name);
                });

                const scene = new Scene();
                scene.addChild(itemFar);
                scene.addChild(itemNear);

                renderer.render(createRenderOptions(scene, camera));
                expect(executionOrder).toEqual(["OpaqueFar", "OpaqueNear"]);
            });

            it("ensures distinct renderOrder values always take precedence over camera depth", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const opaqueNear = createModelInstance({
                    renderOrder: DEFAULT_RENDER_ORDER,
                    name: "OpaqueNear",
                });
                opaqueNear.transform.setPosition(0, 0, 9); // depth = 1 (very close)

                const transparentFar = createModelInstance({
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                    name: "TransparentFar",
                });
                transparentFar.transform.setPosition(0, 0, -100); // depth = 110 (very far)

                const executionOrder: string[] = [];
                vi.spyOn(opaqueNear, "render").mockImplementation(() => {
                    executionOrder.push(opaqueNear.name);
                });
                vi.spyOn(transparentFar, "render").mockImplementation(() => {
                    executionOrder.push(transparentFar.name);
                });

                // Add transparent far FIRST to verify that lower renderOrder still draws first
                const scene = new Scene();
                scene.addChild(transparentFar);
                scene.addChild(opaqueNear);

                renderer.render(createRenderOptions(scene, camera));

                // Opaque item with renderOrder 0 renders before transparent item with renderOrder 1000,
                // even though transparent item is much farther away and was added first.
                expect(executionOrder).toEqual(["OpaqueNear", "TransparentFar"]);
            });

            it("sorts SpriteInstance waypoint place pins back-to-front at default sprite renderOrder", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const pinNear = createSpriteInstance({
                    name: "PinNear",
                });
                pinNear.transform.setPosition(0, 0, 4); // depth = 10 - 4 = 6 (closer)

                const pinFar = createSpriteInstance({
                    name: "PinFar",
                });
                pinFar.transform.setPosition(0, 0, -15); // depth = 10 - (-15) = 25 (farther)

                expect(pinNear.renderOrder).toBe(DEFAULT_SPRITE_RENDER_ORDER);
                expect(pinFar.renderOrder).toBe(DEFAULT_SPRITE_RENDER_ORDER);
                expect(pinNear.renderOrder).toBeGreaterThanOrEqual(TRANSPARENT_RENDER_ORDER_THRESHOLD);

                const executionOrder: string[] = [];
                vi.spyOn(pinNear, "render").mockImplementation(() => {
                    executionOrder.push(pinNear.name);
                });
                vi.spyOn(pinFar, "render").mockImplementation(() => {
                    executionOrder.push(pinFar.name);
                });

                const scene = new Scene();
                scene.addChild(pinNear);
                scene.addChild(pinFar);

                renderer.render(createRenderOptions(scene, camera));

                // PinFar (depth 25) draws before PinNear (depth 6)
                expect(executionOrder).toEqual(["PinFar", "PinNear"]);
                expect(pinNear.render).toHaveBeenCalledTimes(1);
                expect(pinFar.render).toHaveBeenCalledTimes(1);
            });

            it("sorts mixed SpriteInstance and ModelInstance transparent items back-to-front", () => {
                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const waypointPinFar = createSpriteInstance({
                    name: "WaypointPinFar",
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                });
                waypointPinFar.transform.setPosition(0, 0, -30); // depth = 40 (farther)

                const modelInstanceNear = createModelInstance({
                    name: "ModelInstanceNear",
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                });
                modelInstanceNear.transform.setPosition(0, 0, 2); // depth = 8 (closer)

                const executionOrder: string[] = [];
                vi.spyOn(waypointPinFar, "render").mockImplementation(() => {
                    executionOrder.push(waypointPinFar.name);
                });
                vi.spyOn(modelInstanceNear, "render").mockImplementation(() => {
                    executionOrder.push(modelInstanceNear.name);
                });

                const scene = new Scene();
                scene.addChild(modelInstanceNear);
                scene.addChild(waypointPinFar);

                renderer.render(createRenderOptions(scene, camera));

                // WaypointPinFar (depth 40) draws before ModelInstanceNear (depth 8)
                expect(executionOrder).toEqual(["WaypointPinFar", "ModelInstanceNear"]);
            });

            it("executes full rendering pass for mixed SpriteInstance and ModelInstance without errors", () => {
                const mockShader = createMockShaderProgram("unlit");
                mockCm.shaders.get = vi.fn(() => mockShader);

                const camera = createCamera({ x: 0, y: 0, z: 10 });
                const pinFar = createSpriteInstance({
                    name: "WaypointPin",
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                });
                pinFar.transform.setPosition(0, 0, -10);

                const meshNear = createModelInstance({
                    name: "TransparentMesh",
                    renderOrder: TRANSPARENT_RENDER_ORDER_THRESHOLD,
                });
                meshNear.transform.setPosition(0, 0, 5);

                const scene = new Scene();
                scene.addChild(meshNear);
                scene.addChild(pinFar);

                const drawOrder: unknown[] = [];
                (mockCm.geometries.draw as any).mockImplementation((geom: unknown) => {
                    drawOrder.push(geom);
                });

                renderer.render(createRenderOptions(scene, camera));

                expect(mockCm.geometries.draw).toHaveBeenCalledTimes(2);
                expect(drawOrder).toEqual([pinFar.geometry, meshNear.geometry]);
            });
        });
    });

    describe("render: pipeline state, shader acquisition, and binding", () => {
        it("applies pipeline state: contextManager.applyPipelineState(material.pipelineState)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const customState: Partial<PipelineState> = {
                blendMode: BlendMode.Additive,
                depthTest: false,
                depthWrite: false,
                cullFace: false,
            };
            const material = new Material({
                shaderKey: "unlit",
                pipelineState: customState,
            });
            const instance = createModelInstance({ material });

            const scene = new Scene();
            scene.addChild(instance);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.applyPipelineState).toHaveBeenCalledTimes(1);
            expect(mockCm.applyPipelineState).toHaveBeenCalledWith(material.pipelineState);
        });

        it("activates shader via contextManager.shaders.bindKey(material.shaderKey)", () => {
            const material = new UnlitMaterial();
            const instance = createModelInstance({ material });

            const scene = new Scene();
            scene.addChild(instance);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.shaders.bindKey).toHaveBeenCalledWith("unlit");
        });
    });

    describe("render: matrix computation and uniform distribution", () => {
        it("computes modelViewMatrix = viewMatrix * worldMatrix", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const camera = createCamera({ x: 1, y: 2, z: 3 });
            const instance = createModelInstance();
            instance.transform.setPosition(4, 5, 6);
            instance.updateWorldTransform();

            const scene = new Scene();
            scene.addChild(instance);

            renderer.render(createRenderOptions(scene, camera));

            const expectedMV = new Float32Array(16);
            mat4.multiply(
                expectedMV,
                camera.viewMatrix,
                instance.worldMatrix
            );

            const mvCall = (mockShader.setMat4 as any).mock.calls.find(
                (c: [string, Float32Array]) => c[0] === "u_modelViewMatrix"
            );
            expect(mvCall).toBeDefined();
            expect(mvCall[1]).toBeMatrixCloseTo(expectedMV);
        });

        it("computes normalMatrix from instance worldMatrix (fallback to identity if uninvertible)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            // Case A: Invertible transform (scaled by 2, 3, 4)
            const instanceInvertible = createModelInstance();
            instanceInvertible.transform.setScale(2, 3, 4);
            instanceInvertible.updateWorldTransform();

            const expectedNormal = new Float32Array(9);
            mat3.normalFromMat4(
                expectedNormal,
                instanceInvertible.worldMatrix
            );

            let scene = new Scene();
            scene.addChild(instanceInvertible);

            const camera = createCamera();
            renderer.render(createRenderOptions(scene, camera));

            const normalCall1 = (mockShader.setMat3 as any).mock.calls.find(
                (c: [string, Float32Array]) => c[0] === "u_normalMatrix"
            );
            expect(normalCall1).toBeDefined();
            expect(normalCall1[1]).toBeMatrixCloseTo(expectedNormal);

            // Case B: Degenerate / uninvertible transform (all zeros)
            vi.clearAllMocks();
            const instanceDegenerate = createModelInstance();
            instanceDegenerate.worldMatrix.fill(0);

            const identity3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

            scene = new Scene();
            scene.addChild(instanceDegenerate);

            // Overwrite worldMatrix again after scene.update()
            vi.spyOn(scene, "update").mockImplementation(() => {
                instanceDegenerate.worldMatrix.fill(0);
            });

            renderer.render(createRenderOptions(scene, camera));

            const normalCall2 = (mockShader.setMat3 as any).mock.calls.find(
                (c: [string, Float32Array]) => c[0] === "u_normalMatrix"
            );
            expect(normalCall2).toBeDefined();
            expect(normalCall2[1]).toBeMatrixCloseTo(identity3);
        });

        it("uploads Tier A uniforms (u_viewProjectionMatrix, u_viewMatrix, u_projectionMatrix, u_cameraPosition, u_time, u_viewportHeight)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const camera = createCamera({ x: 1.0, y: 2.0, z: 3.0 });
            const instance = createModelInstance();
            const scene = new Scene();
            scene.addChild(instance);

            renderer.render(createRenderOptions(scene, camera));

            expect(mockShader.setMat4).toHaveBeenCalledWith(
                "u_viewProjectionMatrix",
                camera.viewProjectionMatrix
            );
            expect(mockShader.setMat4).toHaveBeenCalledWith(
                "u_viewMatrix",
                camera.viewMatrix
            );
            expect(mockShader.setMat4).toHaveBeenCalledWith(
                "u_projectionMatrix",
                camera.projectionMatrix
            );
            expect(mockShader.setVec3).toHaveBeenCalledWith(
                "u_cameraPosition",
                { x: 1.0, y: 2.0, z: 3.0 }
            );
            expect(mockShader.setFloat).toHaveBeenCalledWith("u_time", defaultTimeInfo.time);
            expect(mockShader.setFloat).toHaveBeenCalledWith(
                "u_viewportHeight",
                defaultDims.height
            );
        });

        it("uploads Tier B uniforms (u_modelMatrix, u_modelViewMatrix, u_normalMatrix)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const camera = createCamera();
            const instance = createModelInstance();
            const scene = new Scene();
            scene.addChild(instance);

            renderer.render(createRenderOptions(scene, camera));

            expect(mockShader.setMat4).toHaveBeenCalledWith(
                "u_modelMatrix",
                instance.worldMatrix
            );
            const mvCall = (mockShader.setMat4 as any).mock.calls.find(
                (c: [string, Float32Array]) => c[0] === "u_modelViewMatrix"
            );
            expect(mvCall).toBeDefined();

            const normalCall = (mockShader.setMat3 as any).mock.calls.find(
                (c: [string, Float32Array]) => c[0] === "u_normalMatrix"
            );
            expect(normalCall).toBeDefined();
        });

        it("uploads Tier C uniforms via shader.setUniforms(material.getUniforms())", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const materialUniforms = {
                u_color: [1, 0.5, 0.2, 1],
                u_roughness: 0.8,
                u_opacity: 1.0,
            };
            const material = new Material({
                shaderKey: "unlit",
                uniforms: materialUniforms,
            });
            const instance = createModelInstance({ material });

            const scene = new Scene();
            scene.addChild(instance);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockShader.setUniforms).toHaveBeenCalledTimes(1);
            expect(mockShader.setUniforms).toHaveBeenCalledWith(materialUniforms);
        });
    });

    describe("render: texture unit binding", () => {
        it("binds 2D textures from material.getTextures()", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const tex0 = createMockTexture("color-map");
            const tex1 = createMockTexture("normal-map");
            const textures: Record<number, ITexture> = {
                [TextureUnit.Color]: tex0,
                [TextureUnit.Normal]: tex1,
            };

            const material = new Material({
                shaderKey: "unlit",
                textures,
            });
            const instance = createModelInstance({ material });

            const scene = new Scene();
            scene.addChild(instance);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.textures.bind).toHaveBeenCalledTimes(2);
            expect(mockCm.textures.bind).toHaveBeenCalledWith(TextureUnit.Color, tex0);
            expect(mockCm.textures.bind).toHaveBeenCalledWith(TextureUnit.Normal, tex1);
        });

        it("skips 2D texture binding when material has no textures assigned", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const materialNoTexture = new UnlitMaterial();
            const instance = createModelInstance({ material: materialNoTexture });

            const scene = new Scene();
            scene.addChild(instance);

            const camera = createCamera();
            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.textures.bind).not.toHaveBeenCalled();
        });

        it("binds cube textures from material.getCubeTextures()", () => {
            const mockShader = createMockShaderProgram("skybox");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const mockCubeTex = createMockCubeTexture("space-skybox");
            const cubeTextures: Record<number, ICubeTexture> = {
                [TextureUnit.Environment]: mockCubeTex,
            };

            const material = new Material({
                shaderKey: "skybox",
                cubeTextures,
            });
            const instance = createModelInstance({ material });

            const scene = new Scene();
            scene.addChild(instance);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.textures.bindCube).toHaveBeenCalledTimes(1);
            expect(mockCm.textures.bindCube).toHaveBeenCalledWith(
                TextureUnit.Environment,
                mockCubeTex
            );
        });
    });

    describe("render: geometry binding and draw calls", () => {
        it("binds geometry via contextManager.geometries.bind(geometry)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const geometry = new QuadGeometry({ width: 2, height: 2 });
            const instance = createModelInstance({ geometry });

            const scene = new Scene();
            scene.addChild(instance);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.geometries.bind).toHaveBeenCalledTimes(1);
            expect(mockCm.geometries.bind).toHaveBeenCalledWith(geometry);
        });

        it("indexed geometry: calls gl.drawElements(geometry.primitiveType, record.indexCount, record.indexType, 0)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const geometry = new CubeGeometry({ width: 1, height: 1, depth: 1 });
            const instance = createModelInstance({ geometry });

            (mockCm.geometries.bind as any).mockReturnValue({
                id: 1,
                vertexBuffer: {} as any,
                indexBuffer: {} as any,
                indexCount: 36,
                indexType: WebGL2RenderingContext.UNSIGNED_SHORT,
                uploadedVersion: 1,
                disposeListener: vi.fn(),
            });

            const scene = new Scene();
            scene.addChild(instance);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockGl.drawElements).toHaveBeenCalledTimes(1);
            expect(mockGl.drawElements).toHaveBeenCalledWith(
                WebGL2RenderingContext.TRIANGLES,
                36,
                WebGL2RenderingContext.UNSIGNED_SHORT,
                0
            );
            expect(mockGl.drawArrays).not.toHaveBeenCalled();
        });

        it("non-indexed geometry: calls gl.drawArrays(geometry.primitiveType, 0, geometry.vertexCount)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            // Construct non-indexed geometry with 3 vertices
            const geometry = new MeshGeometry(
                {
                    attributes: new Float32Array(3 * 8),
                    layout: STANDARD_VERTEX_LAYOUT,
                    vertexCount: 3,
                },
                WebGL2RenderingContext.POINTS
            );
            const instance = createModelInstance({ geometry });

            (mockCm.geometries.bind as any).mockReturnValue({
                id: 1,
                vertexBuffer: {} as any,
                indexBuffer: null,
                indexCount: null,
                indexType: WebGL2RenderingContext.UNSIGNED_SHORT,
                uploadedVersion: 1,
                disposeListener: vi.fn(),
            });

            const scene = new Scene();
            scene.addChild(instance);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockGl.drawArrays).toHaveBeenCalledTimes(1);
            expect(mockGl.drawArrays).toHaveBeenCalledWith(WebGL2RenderingContext.POINTS, 0, 3);
            expect(mockGl.drawElements).not.toHaveBeenCalled();
        });

        it("does not perform post-pass unbinding", () => {
            const instance1 = createModelInstance();
            const instance2 = createModelInstance();

            const scene = new Scene();
            scene.addChild(instance1);
            scene.addChild(instance2);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.geometries.unbind).not.toHaveBeenCalled();
        });
    });

    describe(".reset()", () => {
        it("clears render queue and resets frameId to 0 without interacting with contextManager", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const instance = createModelInstance();
            const scene = new Scene();
            scene.addChild(instance);
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            const internalQueue = (renderer as unknown as { _renderQueue: unknown[] })._renderQueue;
            const internalFrameId = (renderer as unknown as { _frameId: number })._frameId;
            expect(internalQueue.length).toBe(1);
            expect(internalFrameId).toBe(1);

            renderer.reset();

            expect(internalQueue.length).toBe(0);
            expect((renderer as unknown as { _frameId: number })._frameId).toBe(0);
            expect(mockCm.resetPipelineState).not.toHaveBeenCalled();
        });
    });

    describe("render: context loss, depth clearing, and camera fallback", () => {
        it("early-exits safely without rendering when context is null", () => {
            mockCm.getContext = vi.fn(() => null);

            const scene = new Scene();
            const updateSpy = vi.spyOn(scene, "update");
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(updateSpy).not.toHaveBeenCalled();
            expect(mockCm.geometries.unbind).not.toHaveBeenCalled();
        });

        it("early-exits safely without rendering when gl.isContextLost() is true", () => {
            (mockGl.isContextLost as any).mockReturnValue(true);

            const scene = new Scene();
            const updateSpy = vi.spyOn(scene, "update");
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(updateSpy).not.toHaveBeenCalled();
            expect(mockCm.geometries.unbind).not.toHaveBeenCalled();
        });

        it("clears depth buffer when options.clearDepth is true", () => {
            const scene = new Scene();
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera, { clearDepth: true }));

            expect(mockCm.setDepthMask).toHaveBeenCalledWith(true);
            expect(mockGl.clear).toHaveBeenCalledWith(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        });

        it("does not clear depth buffer when options.clearDepth is false or omitted", () => {
            const scene = new Scene();
            const camera = createCamera();

            renderer.render(createRenderOptions(scene, camera));

            expect(mockCm.setDepthMask).not.toHaveBeenCalled();
            expect(mockGl.clear).not.toHaveBeenCalled();
        });

        it("resolves scene.activeCamera when camera parameter is null or undefined", () => {
            const scene = new Scene();
            const activeCam = createCamera();
            scene.activeCamera = activeCam;
            const instance = createModelInstance();
            scene.addChild(instance);

            renderer.render(createRenderOptions(scene, null));

            expect(activeCam.updateAspectRatio).toHaveBeenCalledTimes(1);
            expect(activeCam.updateMatrices).toHaveBeenCalledTimes(1);
        });

        it("throws an error when camera is omitted and scene.activeCamera is null", () => {
            const scene = new Scene();
            scene.activeCamera = null;

            expect(() => renderer.render(createRenderOptions(scene, null))).toThrow(
                "[SceneRenderer] No camera provided and scene.activeCamera is null."
            );
        });

        it("increments frameId on successive render calls and passes it to renderContext", () => {
            const scene = new Scene();
            const camera = createCamera();
            const renderSpy = vi.fn();
            const mockRenderable = new SceneNode("MockRenderable") as any;
            mockRenderable.isRenderable = true;
            mockRenderable.renderOrder = 0;
            mockRenderable.render = renderSpy;
            scene.addChild(mockRenderable);

            renderer.render(createRenderOptions(scene, camera));
            expect(renderSpy).toHaveBeenCalledTimes(1);
            expect(renderSpy.mock.calls[0][0].frameId).toBe(1);

            renderer.render(createRenderOptions(scene, camera));
            expect(renderSpy).toHaveBeenCalledTimes(2);
            expect(renderSpy.mock.calls[1][0].frameId).toBe(2);
        });
    });
});
