import { describe, it, expect, vi, beforeEach } from "vitest";
import { mat4, mat3 } from "gl-matrix";
import { SceneRenderer } from "./scene_renderer";
import type { IScene } from "../core/scene_types";
import type { IMaterial, PipelineState } from "../materials/material_types";
import type { IMeshGeometry } from "../models/mesh_geometry_types";
import type { CanvasDimensions, TimeInfo } from "../../components/webgl_canvas/types";
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

    const defaultOptions: RenderOptions = {
        timeInfo: defaultTimeInfo,
        dimensions: defaultDims,
    };

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

    beforeEach(() => {
        mockGl = createMockWebGL2Context();
        mockCm = createMockContextManager(mockGl);
        renderer = new SceneRenderer(mockCm);
    });

    describe("constructor and initialization", () => {
        it("stores contextManager on public property contextManager", () => {
            expect(renderer.contextManager).toBe(mockCm);
        });
    });

    describe("render: hierarchical traversal and camera synchronization", () => {
        it("calls scene.update()", () => {
            const scene = new Scene();
            const updateSpy = vi.spyOn(scene, "update");
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

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

            renderer.render(scene, camera, { timeInfo: defaultTimeInfo, dimensions: customDims });

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
            scene.add(instance);

            renderer.render(scene, camera, defaultOptions);

            expect(mockShader.setVec3).toHaveBeenCalledWith(
                "u_cameraPosition",
                [42.5, -18.25, 100.0]
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
            scene.add(plainNode);
            scene.add(instanceNode);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

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
            scene.add(visibleInstance);
            scene.add(invisibleInstance);

            const camera = createCamera();
            renderer.render(scene, camera, defaultOptions);

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
            scene.add(instOrder10);
            scene.add(instOrderMinus100);
            scene.add(instOrder0);

            const camera = createCamera();
            renderer.render(scene, camera, defaultOptions);

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
            scene.add(instOrder5);
            scene.add(instOrderUndefined);
            scene.add(instOrderMinus5);

            const camera = createCamera();
            renderer.render(scene, camera, defaultOptions);

            expect(executionOrder).toEqual([
                instOrderMinus5.geometry,
                instOrderUndefined.geometry,
                instOrder5.geometry,
            ]);
        });
    });

    describe("render: pipeline state, shader acquisition, and binding", () => {
        it("applies pipeline state: contextManager.applyPipelineState(material.pipelineState)", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const customState: Partial<PipelineState> = {
                blendMode: "additive",
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
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            expect(mockCm.applyPipelineState).toHaveBeenCalledTimes(1);
            expect(mockCm.applyPipelineState).toHaveBeenCalledWith(material.pipelineState);
        });

        it("acquires shader from contextManager.shaders.get(material.shaderKey)", () => {
            const preRegisteredShader = createMockShaderProgram("pre_registered");
            mockCm.shaders.get = vi.fn((key: string) =>
                key === "pre_registered" ? preRegisteredShader : null
            );

            const material = new Material({ shaderKey: "pre_registered" as ShaderKey });
            const instance = createModelInstance({ material });

            const scene = new Scene();
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            expect(mockCm.shaders.get).toHaveBeenCalledWith("pre_registered");
            expect(mockCm.shaders.getOrCreate).not.toHaveBeenCalled();
            expect(mockCm.shaders.bind).toHaveBeenCalledWith(preRegisteredShader);
        });

        it("lazily resolves known keys via getOrCreate ('galaxy_pinprick', 'galaxy_orb', 'unlit', 'skybox')", () => {
            const knownKeys: ShaderKey[] = [
                "galaxy_pinprick",
                "galaxy_orb",
                "unlit",
                "skybox",
            ];

            for (const key of knownKeys) {
                vi.clearAllMocks();
                mockCm.shaders.get = vi.fn(() => null);

                const material = new Material({ shaderKey: key });
                const instance = createModelInstance({ material });

                const scene = new Scene();
                scene.add(instance);
                const camera = createCamera();

                renderer.render(scene, camera, defaultOptions);

                expect(mockCm.shaders.getOrCreate).toHaveBeenCalledTimes(1);
                expect(mockCm.shaders.getOrCreate).toHaveBeenCalledWith(
                    key,
                    expect.objectContaining({
                        label: key,
                        vertSource: expect.any(String),
                        fragSource: expect.any(String),
                    })
                );
            }
        });

        it("warns once and skips unknown shader keys", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            mockCm.shaders.get = vi.fn(() => null);

            const unknownMaterial = new Material({
                shaderKey: "unknown_mystery_shader" as ShaderKey,
            });
            const instance1 = createModelInstance({ material: unknownMaterial });
            const instance2 = createModelInstance({ material: unknownMaterial });

            const scene = new Scene();
            scene.add(instance1);
            scene.add(instance2);

            const camera = createCamera();
            renderer.render(scene, camera, defaultOptions);

            // Warned only once despite two nodes referencing the missing shader
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy).toHaveBeenCalledWith(
                "[SceneRenderer] Shader 'unknown_mystery_shader' is not registered with WebGLContextManager."
            );

            // Nodes with missing shader are skipped completely
            expect(mockCm.shaders.bind).not.toHaveBeenCalled();
            expect(mockGl.drawArrays).not.toHaveBeenCalled();
            expect(mockGl.drawElements).not.toHaveBeenCalled();

            // Subsequent frame does not trigger redundant console warnings
            renderer.render(scene, camera, defaultOptions);
            expect(warnSpy).toHaveBeenCalledTimes(1);

            warnSpy.mockRestore();
        });

        it("binds resolved shader: contextManager.shaders.bind(shader)", () => {
            const resolvedShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => resolvedShader);

            const material = new UnlitMaterial();
            const instance = createModelInstance({ material });

            const scene = new Scene();
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            expect(mockCm.shaders.bind).toHaveBeenCalledTimes(1);
            expect(mockCm.shaders.bind).toHaveBeenCalledWith(resolvedShader);
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
            scene.add(instance);

            renderer.render(scene, camera, defaultOptions);

            const expectedMV = new Float32Array(16);
            mat4.multiply(
                expectedMV as unknown as mat4,
                camera.viewMatrix as unknown as mat4,
                instance.worldMatrix as unknown as mat4
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
                expectedNormal as unknown as mat3,
                instanceInvertible.worldMatrix as unknown as mat4
            );

            let scene = new Scene();
            scene.add(instanceInvertible);

            const camera = createCamera();
            renderer.render(scene, camera, defaultOptions);

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
            scene.add(instanceDegenerate);

            // Overwrite worldMatrix again after scene.update()
            vi.spyOn(scene, "update").mockImplementation(() => {
                instanceDegenerate.worldMatrix.fill(0);
            });

            renderer.render(scene, camera, defaultOptions);

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
            scene.add(instance);

            renderer.render(scene, camera, defaultOptions);

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
                [1.0, 2.0, 3.0]
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
            scene.add(instance);

            renderer.render(scene, camera, defaultOptions);

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
                u_useTexture: 0,
            };
            const material = new Material({
                shaderKey: "unlit",
                uniforms: materialUniforms,
            });
            const instance = createModelInstance({ material });

            const scene = new Scene();
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

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
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            expect(mockCm.textures.bind).toHaveBeenCalledTimes(2);
            expect(mockCm.textures.bind).toHaveBeenCalledWith(TextureUnit.Color, tex0, "white");
            expect(mockCm.textures.bind).toHaveBeenCalledWith(TextureUnit.Normal, tex1, "white");
        });

        it("fallback white texture on unit 0 when u_useTexture > 0.5 without explicit textures", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            // Sub-case A: u_useTexture = 1.0 (> 0.5) without textures -> binds fallback
            const materialWithFallback = new UnlitMaterial({ useTexture: true });
            const instanceA = createModelInstance({ material: materialWithFallback });

            let scene = new Scene();
            scene.add(instanceA);

            const camera = createCamera();
            renderer.render(scene, camera, defaultOptions);

            expect(mockCm.textures.bind).toHaveBeenCalledTimes(1);
            expect(mockCm.textures.bind).toHaveBeenCalledWith(TextureUnit.Color, null, "white");

            // Sub-case B: u_useTexture = 0.0 (<= 0.5) without textures -> no texture bind
            vi.clearAllMocks();
            const materialNoTexture = new UnlitMaterial({ useTexture: false });
            const instanceB = createModelInstance({ material: materialNoTexture });

            scene = new Scene();
            scene.add(instanceB);

            renderer.render(scene, camera, defaultOptions);

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
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

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
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

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
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

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
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            expect(mockGl.drawArrays).toHaveBeenCalledTimes(1);
            expect(mockGl.drawArrays).toHaveBeenCalledWith(WebGL2RenderingContext.POINTS, 0, 3);
            expect(mockGl.drawElements).not.toHaveBeenCalled();
        });

        it("unbinds geometry after loop via contextManager.geometries.unbind()", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const instance1 = createModelInstance();
            const instance2 = createModelInstance();

            const scene = new Scene();
            scene.add(instance1);
            scene.add(instance2);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            expect(mockCm.geometries.unbind).toHaveBeenCalledTimes(1);
        });
    });

    describe("reset and context loss handling", () => {
        it("reset(): clears render queue and calls contextManager.resetPipelineState()", () => {
            const mockShader = createMockShaderProgram("unlit");
            mockCm.shaders.get = vi.fn(() => mockShader);

            const instance = createModelInstance();
            const scene = new Scene();
            scene.add(instance);
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            const internalQueue = (renderer as unknown as { _renderQueue: unknown[] })._renderQueue;
            expect(internalQueue.length).toBe(1);

            renderer.reset();

            expect(internalQueue.length).toBe(0);
            expect(mockCm.resetPipelineState).toHaveBeenCalledTimes(1);
        });

        it("early-exits safely without rendering when context is null", () => {
            mockCm.getContext = vi.fn(() => null);

            const scene = new Scene();
            const updateSpy = vi.spyOn(scene, "update");
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(mockCm.geometries.unbind).not.toHaveBeenCalled();
        });

        it("early-exits safely without rendering when gl.isContextLost() is true", () => {
            (mockGl.isContextLost as any).mockReturnValue(true);

            const scene = new Scene();
            const updateSpy = vi.spyOn(scene, "update");
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(mockCm.geometries.unbind).not.toHaveBeenCalled();
        });

        it("clears depth buffer when options.clearDepth is true", () => {
            const scene = new Scene();
            const camera = createCamera();

            renderer.render(scene, camera, {
                ...defaultOptions,
                clearDepth: true,
            });

            expect(mockCm.setDepthMask).toHaveBeenCalledWith(true);
            expect(mockGl.clear).toHaveBeenCalledWith(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        });

        it("does not clear depth buffer when options.clearDepth is false or omitted", () => {
            const scene = new Scene();
            const camera = createCamera();

            renderer.render(scene, camera, defaultOptions);

            expect(mockCm.setDepthMask).not.toHaveBeenCalled();
            expect(mockGl.clear).not.toHaveBeenCalled();
        });
    });
});
