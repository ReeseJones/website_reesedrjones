import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebGLContextManager } from "./context_manager";
import { ShaderManager } from "../shaders/shader_manager";
import { TextureManager } from "../textures/texture_manager";
import { GeometryManager } from "../geometry/geometry_manager";
import type { IContextSubsystem, SubsystemDiagnostics } from "./subsystem_types";
import type { PipelineState } from "../../scene/materials/material_types";
import type { ShaderKey } from "../shaders/shader_types";
import type { ShaderProgramOptions } from "../shaders/shader_program_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { createMockShaderProgram } from "../../testing/mocks/mock_context_manager";

describe("WebGLContextManager", () => {
    let gl: WebGL2RenderingContext;
    let shaders: ShaderManager;
    let textures: TextureManager;
    let geometries: GeometryManager;
    let manager: WebGLContextManager;

    function createTestContextManager(): WebGLContextManager {
        return new WebGLContextManager({
            shaders: new ShaderManager(),
            textures: new TextureManager(),
            geometries: new GeometryManager(),
        });
    }

    beforeEach(() => {
        gl = createMockWebGL2Context();
        shaders = new ShaderManager();
        textures = new TextureManager();
        geometries = new GeometryManager();
        manager = new WebGLContextManager({ shaders, textures, geometries });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor and subsystem registration", () => {
        it("constructor receives and registers ShaderManager, TextureManager, and GeometryManager", () => {
            const s = new ShaderManager();
            const t = new TextureManager();
            const g = new GeometryManager();
            const cm = new WebGLContextManager({ shaders: s, textures: t, geometries: g });

            expect(cm.shaders).toBe(s);
            expect(cm.textures).toBe(t);
            expect(cm.geometries).toBe(g);

            expect(cm.getSubsystem("shader")).toBe(s);
            expect(cm.getSubsystem("texture")).toBe(t);
            expect(cm.getSubsystem("geometry")).toBe(g);
        });

        it("invokes attach(this) on each injected subsystem", () => {
            const s = new ShaderManager();
            const t = new TextureManager();
            const g = new GeometryManager();
            const sAttachSpy = vi.spyOn(s, "attach");
            const tAttachSpy = vi.spyOn(t, "attach");
            const gAttachSpy = vi.spyOn(g, "attach");

            const cm = new WebGLContextManager({ shaders: s, textures: t, geometries: g });

            expect(sAttachSpy).toHaveBeenCalledWith(cm);
            expect(tAttachSpy).toHaveBeenCalledWith(cm);
            expect(gAttachSpy).toHaveBeenCalledWith(cm);
        });

        it("public accessors shaders, textures, geometries expose the registered subsystems", () => {
            expect(manager.shaders).toBeDefined();
            expect(manager.textures).toBeDefined();
            expect(manager.geometries).toBeDefined();

            expect(manager.shaders).toBe(manager.getSubsystem("shader"));
            expect(manager.textures).toBe(manager.getSubsystem("texture"));
            expect(manager.geometries).toBe(manager.getSubsystem("geometry"));
        });

        it("initializes with null context until setContext is invoked", () => {
            const cm = createTestContextManager();
            expect(cm.getContext()).toBeNull();

            const testGl = createMockWebGL2Context();
            cm.setContext(testGl);
            expect(cm.getContext()).toBe(testGl);
        });

        it("registerSubsystem adds custom IContextSubsystem and returns it", () => {
            const customSub: IContextSubsystem = {
                name: "custom_sub",
                restorationPriority: 50,
                attach: vi.fn(),
                detach: vi.fn(),
                onContextLost: vi.fn(),
                onContextRestored: vi.fn(),
                destroy: vi.fn(),
                getDiagnostics: vi.fn(() => ({
                    name: "custom_sub",
                    resourceCount: 4,
                    activeBindings: 2,
                })),
            };

            const returned = manager.registerSubsystem(customSub);

            expect(customSub.attach).toHaveBeenCalledWith(manager);
            expect(returned).toBe(customSub);
            expect(manager.getSubsystem("custom_sub")).toBe(customSub);
        });

        it("getSubsystem finds subsystem by name or returns null if not found", () => {
            expect(manager.getSubsystem("shader")).toBe(manager.shaders);
            expect(manager.getSubsystem("texture")).toBe(manager.textures);
            expect(manager.getSubsystem("geometry")).toBe(manager.geometries);
            expect(manager.getSubsystem("nonexistent_subsystem")).toBeNull();
        });

        it("getDiagnostics returns aggregated record of diagnostics keyed by subsystem name", () => {
            const customSub: IContextSubsystem = {
                name: "custom_audio",
                restorationPriority: 99,
                attach: vi.fn(),
                detach: vi.fn(),
                onContextLost: vi.fn(),
                onContextRestored: vi.fn(),
                destroy: vi.fn(),
                getDiagnostics: vi.fn(() => ({
                    name: "custom_audio",
                    resourceCount: 12,
                    activeBindings: 3,
                })),
            };
            manager.registerSubsystem(customSub);

            const diagnostics = manager.getDiagnostics();

            expect(diagnostics).toHaveProperty("shader");
            expect(diagnostics.shader.name).toBe("shader");
            expect(diagnostics).toHaveProperty("texture");
            expect(diagnostics.texture.name).toBe("texture");
            expect(diagnostics).toHaveProperty("geometry");
            expect(diagnostics.geometry.name).toBe("geometry");
            expect(diagnostics).toHaveProperty("custom_audio");
            expect(diagnostics.custom_audio).toEqual({
                name: "custom_audio",
                resourceCount: 12,
                activeBindings: 3,
            });
        });
    });

    describe("context lifecycle: setContext, getContext, handleContextLost, handleContextRestored", () => {
        it("setContext stores gl, resets currentPipelineState, updates maxTextureUnits from gl.getParameter(MAX_TEXTURE_IMAGE_UNITS)", () => {
            vi.mocked(gl.getParameter).mockImplementation((param: number) => {
                if (param === gl.MAX_TEXTURE_IMAGE_UNITS) return 32;
                return 0;
            });

            manager.setContext(gl);

            expect(manager.getContext()).toBe(gl);
            expect(manager.maxTextureUnits).toBe(32);

            // Verify currentPipelineState is reset to null by applying a pipeline state,
            // calling setContext again, and confirming calls are reapplied.
            const testState: PipelineState = {
                blendMode: "alpha",
                depthTest: true,
                depthWrite: true,
                cullFace: true,
            };
            manager.applyPipelineState(testState);
            vi.clearAllMocks();

            // Calling setContext(gl) must reset pipeline state cache
            manager.setContext(gl);
            vi.clearAllMocks();

            manager.applyPipelineState(testState);
            expect(gl.enable).toHaveBeenCalledWith(gl.DEPTH_TEST);
            expect(gl.depthMask).toHaveBeenCalledWith(true);
            expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
            expect(gl.enable).toHaveBeenCalledWith(gl.CULL_FACE);
        });

        it("setContext sorts subsystems by restorationPriority (Shaders=10, Textures=20, Geometries=30) and calls onContextRestored in order", () => {
            const order: string[] = [];
            vi.spyOn(manager.shaders, "onContextRestored").mockImplementation(() => {
                order.push("shader");
            });
            vi.spyOn(manager.textures, "onContextRestored").mockImplementation(() => {
                order.push("texture");
            });
            vi.spyOn(manager.geometries, "onContextRestored").mockImplementation(() => {
                order.push("geometry");
            });

            const earlySub: IContextSubsystem = {
                name: "early",
                restorationPriority: 5,
                attach: vi.fn(),
                detach: vi.fn(),
                onContextLost: vi.fn(),
                onContextRestored: vi.fn(() => {
                    order.push("early");
                }),
                destroy: vi.fn(),
                getDiagnostics: vi.fn(() => ({ name: "early", resourceCount: 0, activeBindings: 0 })),
            };
            const midSub: IContextSubsystem = {
                name: "mid",
                restorationPriority: 25,
                attach: vi.fn(),
                detach: vi.fn(),
                onContextLost: vi.fn(),
                onContextRestored: vi.fn(() => {
                    order.push("mid");
                }),
                destroy: vi.fn(),
                getDiagnostics: vi.fn(() => ({ name: "mid", resourceCount: 0, activeBindings: 0 })),
            };

            // Register out of priority order to verify sort
            manager.registerSubsystem(midSub);
            manager.registerSubsystem(earlySub);

            manager.setContext(gl);

            expect(order).toEqual(["early", "shader", "texture", "mid", "geometry"]);
        });

        it("getContext returns active gl or null when uninitialized/lost", () => {
            const cm = createTestContextManager();
            expect(cm.getContext()).toBeNull();

            cm.setContext(gl);
            expect(cm.getContext()).toBe(gl);

            cm.handleContextLost();
            expect(cm.getContext()).toBeNull();
        });

        it("handleContextLost clears gl to null, clears currentPipelineState, and calls onContextLost on all registered subsystems", () => {
            manager.setContext(gl);

            const shaderLostSpy = vi.spyOn(manager.shaders, "onContextLost");
            const textureLostSpy = vi.spyOn(manager.textures, "onContextLost");
            const geometryLostSpy = vi.spyOn(manager.geometries, "onContextLost");

            const customSub: IContextSubsystem = {
                name: "custom",
                restorationPriority: 15,
                attach: vi.fn(),
                detach: vi.fn(),
                onContextLost: vi.fn(),
                onContextRestored: vi.fn(),
                destroy: vi.fn(),
                getDiagnostics: vi.fn(() => ({ name: "custom", resourceCount: 0, activeBindings: 0 })),
            };
            manager.registerSubsystem(customSub);

            manager.handleContextLost();

            expect(manager.getContext()).toBeNull();
            expect(shaderLostSpy).toHaveBeenCalledTimes(1);
            expect(textureLostSpy).toHaveBeenCalledTimes(1);
            expect(geometryLostSpy).toHaveBeenCalledTimes(1);
            expect(customSub.onContextLost).toHaveBeenCalledTimes(1);

            // Pipeline state cache should be cleared so applying state does nothing with null context
            manager.applyPipelineState({
                blendMode: "opaque",
                depthTest: true,
                depthWrite: true,
                cullFace: true,
            });
            expect(gl.enable).not.toHaveBeenCalled();
        });

        it("handleContextRestored updates gl, resets pipeline state, updates maxTextureUnits, and notifies subsystems in priority order", () => {
            const newGl = createMockWebGL2Context();
            vi.mocked(newGl.getParameter).mockImplementation((param: number) => {
                if (param === newGl.MAX_TEXTURE_IMAGE_UNITS) return 24;
                return 0;
            });

            const order: string[] = [];
            vi.spyOn(manager.shaders, "onContextRestored").mockImplementation((context) => {
                order.push(`shader:${context === newGl}`);
            });
            vi.spyOn(manager.textures, "onContextRestored").mockImplementation((context) => {
                order.push(`texture:${context === newGl}`);
            });
            vi.spyOn(manager.geometries, "onContextRestored").mockImplementation((context) => {
                order.push(`geometry:${context === newGl}`);
            });

            manager.handleContextRestored(newGl);

            expect(manager.getContext()).toBe(newGl);
            expect(manager.maxTextureUnits).toBe(24);
            expect(order).toEqual(["shader:true", "texture:true", "geometry:true"]);
        });
    });

    describe("pipeline state caching and application", () => {
        it("applyPipelineState does nothing if gl is null", () => {
            const cm = createTestContextManager();
            expect(cm.getContext()).toBeNull();

            expect(() => {
                cm.applyPipelineState({
                    blendMode: "alpha",
                    depthTest: true,
                    depthWrite: true,
                    cullFace: true,
                });
            }).not.toThrow();
        });

        it("applies depthTest (gl.enable(DEPTH_TEST) + depthFunc(LEQUAL) or gl.disable(DEPTH_TEST))", () => {
            manager.setContext(gl);
            vi.clearAllMocks();

            manager.applyPipelineState({
                depthTest: true,
                depthWrite: false,
                blendMode: "opaque",
                cullFace: false,
            });
            expect(gl.enable).toHaveBeenCalledWith(gl.DEPTH_TEST);
            expect(gl.depthFunc).toHaveBeenCalledWith(gl.LEQUAL);

            vi.clearAllMocks();
            manager.applyPipelineState({
                depthTest: false,
                depthWrite: false,
                blendMode: "opaque",
                cullFace: false,
            });
            expect(gl.disable).toHaveBeenCalledWith(gl.DEPTH_TEST);
        });

        it("applies depthWrite (gl.depthMask)", () => {
            manager.setContext(gl);
            vi.clearAllMocks();

            manager.applyPipelineState({
                depthTest: false,
                depthWrite: true,
                blendMode: "opaque",
                cullFace: false,
            });
            expect(gl.depthMask).toHaveBeenCalledWith(true);

            vi.clearAllMocks();
            manager.applyPipelineState({
                depthTest: false,
                depthWrite: false,
                blendMode: "opaque",
                cullFace: false,
            });
            expect(gl.depthMask).toHaveBeenCalledWith(false);
        });

        it("applies blendMode ('opaque' -> disable BLEND; 'alpha' -> enable BLEND + blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA); 'additive' -> enable BLEND + blendFunc(ONE, ONE))", () => {
            manager.setContext(gl);

            // Opaque mode disables BLEND
            vi.clearAllMocks();
            manager.applyPipelineState({
                depthTest: false,
                depthWrite: false,
                blendMode: "opaque",
                cullFace: false,
            });
            expect(gl.disable).toHaveBeenCalledWith(gl.BLEND);

            // Alpha mode enables BLEND and sets SRC_ALPHA, ONE_MINUS_SRC_ALPHA
            vi.clearAllMocks();
            manager.applyPipelineState({
                depthTest: false,
                depthWrite: false,
                blendMode: "alpha",
                cullFace: false,
            });
            expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
            expect(gl.blendFunc).toHaveBeenCalledWith(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            // Additive mode enables BLEND and sets ONE, ONE
            vi.clearAllMocks();
            manager.applyPipelineState({
                depthTest: false,
                depthWrite: false,
                blendMode: "additive",
                cullFace: false,
            });
            expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
            expect(gl.blendFunc).toHaveBeenCalledWith(gl.ONE, gl.ONE);
        });

        it("applies cullFace (gl.enable(CULL_FACE) or gl.disable(CULL_FACE))", () => {
            manager.setContext(gl);
            vi.clearAllMocks();

            manager.applyPipelineState({
                depthTest: false,
                depthWrite: false,
                blendMode: "opaque",
                cullFace: true,
            });
            expect(gl.enable).toHaveBeenCalledWith(gl.CULL_FACE);

            vi.clearAllMocks();
            manager.applyPipelineState({
                depthTest: false,
                depthWrite: false,
                blendMode: "opaque",
                cullFace: false,
            });
            expect(gl.disable).toHaveBeenCalledWith(gl.CULL_FACE);
        });

        it("redundant call optimization: subsequent applyPipelineState with identical state skips redundant gl calls", () => {
            manager.setContext(gl);

            const state: PipelineState = {
                depthTest: true,
                depthWrite: true,
                blendMode: "alpha",
                cullFace: true,
            };

            manager.applyPipelineState(state);
            vi.clearAllMocks();

            // Re-apply exact same state
            manager.applyPipelineState(state);

            expect(gl.enable).not.toHaveBeenCalled();
            expect(gl.disable).not.toHaveBeenCalled();
            expect(gl.depthMask).not.toHaveBeenCalled();
            expect(gl.depthFunc).not.toHaveBeenCalled();
            expect(gl.blendFunc).not.toHaveBeenCalled();

            // Mutate only cullFace and verify only cullFace driver call occurs
            manager.applyPipelineState({
                ...state,
                cullFace: false,
            });
            expect(gl.disable).toHaveBeenCalledWith(gl.CULL_FACE);
            expect(gl.enable).not.toHaveBeenCalled();
            expect(gl.depthMask).not.toHaveBeenCalled();
            expect(gl.depthFunc).not.toHaveBeenCalled();
            expect(gl.blendFunc).not.toHaveBeenCalled();
        });

        it("resetPipelineState clears the cached state so the next applyPipelineState reapplies all settings", () => {
            manager.setContext(gl);

            const state: PipelineState = {
                depthTest: true,
                depthWrite: true,
                blendMode: "alpha",
                cullFace: true,
            };

            manager.applyPipelineState(state);
            manager.resetPipelineState();
            vi.clearAllMocks();

            manager.applyPipelineState(state);

            expect(gl.enable).toHaveBeenCalledWith(gl.DEPTH_TEST);
            expect(gl.depthFunc).toHaveBeenCalledWith(gl.LEQUAL);
            expect(gl.depthMask).toHaveBeenCalledWith(true);
            expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
            expect(gl.blendFunc).toHaveBeenCalledWith(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            expect(gl.enable).toHaveBeenCalledWith(gl.CULL_FACE);
        });

        it("setDepthMask calls gl.depthMask and updates currentPipelineState.depthWrite if state is cached", () => {
            // Case 1: Uninitialized gl does not throw
            expect(() => manager.setDepthMask(true)).not.toThrow();

            // Case 2: gl present with cached state
            manager.setContext(gl);
            manager.applyPipelineState({
                depthTest: true,
                depthWrite: true,
                blendMode: "opaque",
                cullFace: false,
            });
            vi.clearAllMocks();

            manager.setDepthMask(false);
            expect(gl.depthMask).toHaveBeenCalledWith(false);

            // Re-applying pipeline state with depthWrite=false should skip gl.depthMask
            vi.clearAllMocks();
            manager.applyPipelineState({
                depthTest: true,
                depthWrite: false,
                blendMode: "opaque",
                cullFace: false,
            });
            expect(gl.depthMask).not.toHaveBeenCalled();

            // Case 3: gl present with no state cached yet
            manager.resetPipelineState();
            vi.clearAllMocks();
            manager.setDepthMask(true);
            expect(gl.depthMask).toHaveBeenCalledWith(true);
        });
    });

    describe("shader orchestration delegation", () => {
        it("getCurrentProgram delegates to shaders.activeProgram", () => {
            expect(manager.getCurrentProgram()).toBe(manager.shaders.activeProgram);
            expect(manager.getCurrentProgram()).toBeNull();

            const mockProgram = { __brand: "WebGLProgram", id: 99 } as unknown as WebGLProgram;
            vi.spyOn(manager.shaders, "activeProgram", "get").mockReturnValue(mockProgram);

            expect(manager.getCurrentProgram()).toBe(mockProgram);
        });

        it("getCurrentShader delegates to shaders.activeShader", () => {
            expect(manager.getCurrentShader()).toBe(manager.shaders.activeShader);
            expect(manager.getCurrentShader()).toBeNull();

            const mockShader = createMockShaderProgram("test_shader");
            vi.spyOn(manager.shaders, "activeShader", "get").mockReturnValue(mockShader);

            expect(manager.getCurrentShader()).toBe(mockShader);
        });

        it("useShader delegates to shaders.bind(shader)", () => {
            const bindSpy = vi.spyOn(manager.shaders, "bind").mockImplementation(() => {});
            const mockShader = createMockShaderProgram("bind_test");

            manager.useShader(mockShader);

            expect(bindSpy).toHaveBeenCalledWith(mockShader);

            manager.useShader(null);
            expect(bindSpy).toHaveBeenCalledWith(null);
        });

        it("useProgram delegates to shaders.bindProgram(program)", () => {
            const bindProgSpy = vi.spyOn(manager.shaders, "bindProgram").mockImplementation(() => {});
            const mockProgram = { __brand: "WebGLProgram", id: 77 } as unknown as WebGLProgram;

            manager.useProgram(mockProgram);

            expect(bindProgSpy).toHaveBeenCalledWith(mockProgram);

            manager.useProgram(null);
            expect(bindProgSpy).toHaveBeenCalledWith(null);
        });

        it("getOrCreateShader delegates to shaders.getOrCreate(key, options)", () => {
            const mockShader = createMockShaderProgram("mock_key");
            const getOrCreateSpy = vi
                .spyOn(manager.shaders, "getOrCreate")
                .mockReturnValue(mockShader as never);

            const options: ShaderProgramOptions = {
                vertSource: "void main() {}",
                fragSource: "void main() {}",
                label: "mock_label",
            };

            const result = manager.getOrCreateShader("test_key" as ShaderKey, options);

            expect(getOrCreateSpy).toHaveBeenCalledWith("test_key", options);
            expect(result).toBe(mockShader);
        });

        it("getShader delegates to shaders.get(key)", () => {
            const mockShader = createMockShaderProgram("get_test");
            const getSpy = vi.spyOn(manager.shaders, "get").mockReturnValue(mockShader as never);

            const result = manager.getShader("get_test" as ShaderKey);

            expect(getSpy).toHaveBeenCalledWith("get_test");
            expect(result).toBe(mockShader);

            getSpy.mockReturnValue(null);
            expect(manager.getShader("missing" as ShaderKey)).toBeNull();
        });
    });

    describe("texture orchestration delegation", () => {
        it("maxTextureUnits returns value from gl or default 16", () => {
            const freshManager = createTestContextManager();
            expect(freshManager.maxTextureUnits).toBe(16);

            const customGl = createMockWebGL2Context();
            vi.mocked(customGl.getParameter).mockImplementation((param: number) => {
                if (param === customGl.MAX_TEXTURE_IMAGE_UNITS) return 32;
                return 0;
            });
            freshManager.setContext(customGl);
            expect(freshManager.maxTextureUnits).toBe(32);

            // Fallback when getParameter returns 0 / falsy
            vi.mocked(customGl.getParameter).mockReturnValue(0);
            freshManager.setContext(customGl);
            expect(freshManager.maxTextureUnits).toBe(16);
        });

        it("getDefaultWhiteTexture delegates to textures.getFallbackHandle('white')", () => {
            const mockTexture = { __brand: "WebGLTexture", id: 101 } as unknown as WebGLTexture;
            const fallbackSpy = vi
                .spyOn(manager.textures, "getFallbackHandle")
                .mockReturnValue(mockTexture);

            const result = manager.getDefaultWhiteTexture();

            expect(fallbackSpy).toHaveBeenCalledWith("white");
            expect(result).toBe(mockTexture);
        });

        it("getDefaultBlackCubeTexture delegates to textures.getFallbackHandle('black_cube')", () => {
            const mockCubeTexture = { __brand: "WebGLTexture", id: 102 } as unknown as WebGLTexture;
            const fallbackSpy = vi
                .spyOn(manager.textures, "getFallbackHandle")
                .mockReturnValue(mockCubeTexture);

            const result = manager.getDefaultBlackCubeTexture();

            expect(fallbackSpy).toHaveBeenCalledWith("black_cube");
            expect(result).toBe(mockCubeTexture);
        });

        it("bindTexture delegates to textures.bindHandle(unit, texture)", () => {
            const bindSpy = vi.spyOn(manager.textures, "bindHandle").mockImplementation(() => {});
            const mockTexture = { __brand: "WebGLTexture", id: 201 } as unknown as WebGLTexture;

            manager.bindTexture(3, mockTexture);

            expect(bindSpy).toHaveBeenCalledWith(3, mockTexture);

            manager.bindTexture(0, null);
            expect(bindSpy).toHaveBeenCalledWith(0, null);
        });

        it("bindCubeTexture delegates to textures.bindCubeHandle(unit, texture)", () => {
            const bindCubeSpy = vi
                .spyOn(manager.textures, "bindCubeHandle")
                .mockImplementation(() => {});
            const mockTexture = { __brand: "WebGLTexture", id: 202 } as unknown as WebGLTexture;

            manager.bindCubeTexture(4, mockTexture);

            expect(bindCubeSpy).toHaveBeenCalledWith(4, mockTexture);

            manager.bindCubeTexture(1, null);
            expect(bindCubeSpy).toHaveBeenCalledWith(1, null);
        });
    });

    describe("destroy", () => {
        it("calls destroy() on all registered subsystems", () => {
            const shaderDestroySpy = vi.spyOn(manager.shaders, "destroy");
            const textureDestroySpy = vi.spyOn(manager.textures, "destroy");
            const geometryDestroySpy = vi.spyOn(manager.geometries, "destroy");

            const customSub: IContextSubsystem = {
                name: "custom_subsystem",
                restorationPriority: 90,
                attach: vi.fn(),
                detach: vi.fn(),
                onContextLost: vi.fn(),
                onContextRestored: vi.fn(),
                destroy: vi.fn(),
                getDiagnostics: vi.fn(() => ({
                    name: "custom_subsystem",
                    resourceCount: 0,
                    activeBindings: 0,
                })),
            };
            manager.registerSubsystem(customSub);

            manager.destroy();

            expect(shaderDestroySpy).toHaveBeenCalledTimes(1);
            expect(textureDestroySpy).toHaveBeenCalledTimes(1);
            expect(geometryDestroySpy).toHaveBeenCalledTimes(1);
            expect(customSub.destroy).toHaveBeenCalledTimes(1);
        });

        it("empties the internal subsystems list", () => {
            expect(manager.getSubsystem("shader")).toBe(manager.shaders);
            expect(manager.getSubsystem("texture")).toBe(manager.textures);
            expect(manager.getSubsystem("geometry")).toBe(manager.geometries);

            manager.destroy();

            expect(manager.getSubsystem("shader")).toBeNull();
            expect(manager.getSubsystem("texture")).toBeNull();
            expect(manager.getSubsystem("geometry")).toBeNull();
        });

        it("clears currentPipelineState and gl references to null", () => {
            manager.setContext(gl);
            manager.applyPipelineState({
                blendMode: "alpha",
                depthTest: true,
                depthWrite: true,
                cullFace: true,
            });

            expect(manager.getContext()).toBe(gl);

            manager.destroy();

            expect(manager.getContext()).toBeNull();

            // Calling applyPipelineState after destroy should not invoke GL calls
            vi.clearAllMocks();
            manager.applyPipelineState({
                blendMode: "additive",
                depthTest: false,
                depthWrite: false,
                cullFace: false,
            });
            expect(gl.enable).not.toHaveBeenCalled();
            expect(gl.disable).not.toHaveBeenCalled();
        });

        it("getDiagnostics returns empty object after destroy", () => {
            expect(Object.keys(manager.getDiagnostics()).length).toBeGreaterThan(0);

            manager.destroy();

            expect(manager.getDiagnostics()).toEqual({});
        });
    });
});
