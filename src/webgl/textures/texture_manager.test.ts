import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TextureManager } from "./texture_manager";
import { ImageTexture } from "./image_texture";
import { SubsystemRestorationPriority } from "../core/subsystem_types";
import { TextureUnit } from "./texture_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { createMockContextManager } from "../../testing/mocks/mock_context_manager";
import { createMockTexture, createMockCubeTexture } from "../../testing/mocks/mock_texture";

describe("TextureManager", () => {
    let gl: WebGL2RenderingContext;
    let cm: ReturnType<typeof createMockContextManager>;
    let textureManager: TextureManager;

    beforeEach(() => {
        gl = createMockWebGL2Context();
        cm = createMockContextManager(gl);
        textureManager = new TextureManager();
        textureManager.attach(cm);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("metadata and subsystem registration", () => {
        it("identifies as texture subsystem with Priority 20 (Texture)", () => {
            expect(textureManager.name).toBe("texture");
            expect(textureManager.restorationPriority).toBe(SubsystemRestorationPriority.Texture);
            expect(textureManager.textureCount).toBe(0);
            expect(textureManager.cubeTextureCount).toBe(0);
        });

        it("supports attach and detach lifecycle methods", () => {
            const fresh = new TextureManager();
            expect(fresh.getFallbackHandle("white")).toBeNull();
            fresh.attach(cm);
            expect(fresh.getFallbackHandle("white")).toBeDefined();
            fresh.detach();
        });
    });

    describe(".getOrCreate()", () => {
        it("creates, initializes, caches, and returns a new ImageTexture instance for URL", () => {
            const texture = textureManager.getOrCreate("assets/albedo.png");

            expect(texture).toBeInstanceOf(ImageTexture);
            expect(texture.isValid).toBe(true);
            expect(textureManager.textureCount).toBe(1);
            expect(textureManager.has("assets/albedo.png")).toBe(true);
            expect(textureManager.get("assets/albedo.png")).toBe(texture);
        });

        it("returns existing cached Texture on subsequent calls for same URL", () => {
            const texture1 = textureManager.getOrCreate("assets/albedo.png");
            const texture2 = textureManager.getOrCreate("assets/albedo.png");

            expect(texture1).toBe(texture2);
            expect(textureManager.textureCount).toBe(1);
        });

        it("automatically evicts texture from cache when texture.dispose() is called", () => {
            const texture = textureManager.getOrCreate("assets/albedo.png");
            expect(textureManager.textureCount).toBe(1);
            expect(textureManager.has("assets/albedo.png")).toBe(true);

            texture.dispose();

            expect(textureManager.textureCount).toBe(0);
            expect(textureManager.has("assets/albedo.png")).toBe(false);
            expect(textureManager.get("assets/albedo.png")).toBeNull();
        });

        it("auto-unbinds texture handle across bound units when texture is disposed", () => {
            const texture = textureManager.getOrCreate("assets/albedo.png");
            textureManager.bind(TextureUnit.Color1, texture);

            expect((textureManager as any)._boundTextures.get(TextureUnit.Color1)).toBe(texture.handle);

            texture.dispose();

            expect((textureManager as any)._boundTextures.get(TextureUnit.Color1)).toBeNull();
        });
    });

    describe(".get() and .has()", () => {
        it("get returns null and has returns false for uncached URLs", () => {
            expect(textureManager.has("assets/missing.png")).toBe(false);
            expect(textureManager.get("assets/missing.png")).toBeNull();
        });

        it("get returns cached instance and has returns true for cached URLs", () => {
            const texture = textureManager.getOrCreate("assets/normal.png");
            expect(textureManager.has("assets/normal.png")).toBe(true);
            expect(textureManager.get("assets/normal.png")).toBe(texture);
        });
    });

    describe(".bind()", () => {
        it("binds a 2D texture to specified unit and activates corresponding texture unit when changing unit", () => {
            const fakeHandle = gl.createTexture();
            const mockTex = createMockTexture("test-tex", { handle: fakeHandle });
            textureManager.bind(TextureUnit.Color1, mockTex);

            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Color1);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, fakeHandle);
        });

        it("initializes texture if texture.handle is null upon bind", () => {
            const fakeHandle = gl.createTexture();
            const mockTex = createMockTexture("uninit-tex");
            (mockTex as any).handle = null;
            const initSpy = vi.spyOn(mockTex, "init").mockImplementation(() => {
                (mockTex as any).handle = fakeHandle;
            });

            textureManager.bind(TextureUnit.Color1, mockTex);

            expect(initSpy).toHaveBeenCalled();
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, fakeHandle);
        });

        it("binds neutral fallback (default 'white') if texture is null or undefined", () => {
            textureManager.bind(TextureUnit.Color1, null);

            const whiteFallback = textureManager.getFallbackHandle("white");
            expect(whiteFallback).not.toBeNull();
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Color1);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, whiteFallback);
        });

        it("binds specified fallback archetype when provided (e.g. 'flat_normal')", () => {
            textureManager.bind(TextureUnit.Normal, undefined, "flat_normal");

            const flatNormalFallback = textureManager.getFallbackHandle("flat_normal");
            expect(flatNormalFallback).not.toBeNull();
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Normal);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, flatNormalFallback);
        });

        it("skips redundant driver calls when binding the same texture to the same unit", () => {
            const fakeHandle = gl.createTexture();
            const mockTex = createMockTexture("test-tex", { handle: fakeHandle });
            textureManager.bind(TextureUnit.Color1, mockTex);

            vi.mocked(gl.bindTexture).mockClear();
            vi.mocked(gl.activeTexture).mockClear();

            textureManager.bind(TextureUnit.Color1, mockTex);

            expect(gl.bindTexture).not.toHaveBeenCalled();
            expect(gl.activeTexture).not.toHaveBeenCalled();
        });

        it("subscribes to onDispose of external bound texture to unbind upon disposal", () => {
            const fakeHandle = gl.createTexture();
            let disposeCb: (() => void) | undefined;
            const mockTex = createMockTexture("external-tex", {
                handle: fakeHandle,
                onDispose: vi.fn((cb) => {
                    disposeCb = cb;
                    return () => {};
                }),
                dispose: vi.fn(() => {
                    disposeCb?.();
                }),
            });
            textureManager.bind(TextureUnit.Color1, mockTex);

            expect((textureManager as any)._boundTextures.get(TextureUnit.Color1)).toBe(fakeHandle);

            mockTex.dispose();

            expect((textureManager as any)._boundTextures.get(TextureUnit.Color1)).toBeNull();
        });
    });

    describe(".bindHandle()", () => {
        it("binds raw WebGLTexture 2D handle to texture unit with redundant call skipping", () => {
            const fakeHandle = {} as WebGLTexture;

            textureManager.bindHandle(TextureUnit.Color1, fakeHandle);

            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Color1);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, fakeHandle);

            vi.mocked(gl.bindTexture).mockClear();
            textureManager.bindHandle(TextureUnit.Color1, fakeHandle);
            expect(gl.bindTexture).not.toHaveBeenCalled();
        });
    });

    describe(".bindCube()", () => {
        it("binds cubemap texture to specified unit", () => {
            const fakeCubeHandle = gl.createTexture();
            const mockCube = createMockCubeTexture("cube-sky", { handle: fakeCubeHandle });
            textureManager.bindCube(TextureUnit.Environment, mockCube);

            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Environment);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, fakeCubeHandle);
        });

        it("binds 'black_cube' fallback when cubemap texture is null or undefined", () => {
            textureManager.bindCube(TextureUnit.Environment, null);

            const blackCubeFallback = textureManager.getFallbackHandle("black_cube");
            expect(blackCubeFallback).not.toBeNull();
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, blackCubeFallback);
        });

        it("skips redundant call if cubemap is already bound to that unit", () => {
            const fakeCubeHandle = gl.createTexture();
            const mockCube = createMockCubeTexture("cube-sky", { handle: fakeCubeHandle });
            textureManager.bindCube(TextureUnit.Environment, mockCube);

            vi.mocked(gl.bindTexture).mockClear();
            textureManager.bindCube(TextureUnit.Environment, mockCube);

            expect(gl.bindTexture).not.toHaveBeenCalled();
        });

        it("subscribes to onDispose of bound cube texture to unbind upon disposal", () => {
            const fakeCubeHandle = gl.createTexture();
            let disposeCb: (() => void) | undefined;
            const mockCube = createMockCubeTexture("cube-sky", {
                handle: fakeCubeHandle,
                onDispose: vi.fn((cb) => {
                    disposeCb = cb;
                    return () => {};
                }),
                dispose: vi.fn(() => {
                    disposeCb?.();
                }),
            });
            textureManager.bindCube(TextureUnit.Environment, mockCube);

            expect((textureManager as any)._boundCubeTextures.get(TextureUnit.Environment)).toBe(fakeCubeHandle);

            mockCube.dispose();

            expect((textureManager as any)._boundCubeTextures.get(TextureUnit.Environment)).toBeNull();
        });
    });

    describe(".bindCubeHandle()", () => {
        it("binds raw WebGLTexture cubemap handle with redundant call skipping", () => {
            const fakeCubeHandle = {} as WebGLTexture;

            textureManager.bindCubeHandle(TextureUnit.Environment, fakeCubeHandle);

            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Environment);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, fakeCubeHandle);

            vi.mocked(gl.bindTexture).mockClear();
            textureManager.bindCubeHandle(TextureUnit.Environment, fakeCubeHandle);
            expect(gl.bindTexture).not.toHaveBeenCalled();
        });
    });

    describe(".unbind()", () => {
        it("unbinds 2D and cubemap textures from specified unit", () => {
            const mockTex = createMockTexture("test-tex");
            textureManager.bind(TextureUnit.Color1, mockTex);

            textureManager.unbind(TextureUnit.Color1);

            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Color1);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, null);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, null);
            expect((textureManager as any)._boundTextures.get(TextureUnit.Color1)).toBeNull();
            expect((textureManager as any)._boundCubeTextures.get(TextureUnit.Color1)).toBeNull();
        });

        it("is safe to call when unit was not bound", () => {
            expect(() => textureManager.unbind(TextureUnit.ShadowMap)).not.toThrow();
        });
    });

    describe(".unbindAll()", () => {
        it("unbinds all active units across maxTextureUnits", () => {
            const mockTex0 = createMockTexture("tex0");
            const mockTex1 = createMockTexture("tex1");

            textureManager.bind(TextureUnit.Color0, mockTex0);
            textureManager.bind(TextureUnit.Color1, mockTex1);

            textureManager.unbindAll();

            expect((textureManager as any)._boundTextures.get(TextureUnit.Color0)).toBeNull();
            expect((textureManager as any)._boundTextures.get(TextureUnit.Color1)).toBeNull();
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, null);
        });
    });

    describe(".getFallbackHandle()", () => {
        it("returns non-null GPU handles for all fallback types", () => {
            expect(textureManager.getFallbackHandle("white")).not.toBeNull();
            expect(textureManager.getFallbackHandle("black")).not.toBeNull();
            expect(textureManager.getFallbackHandle("flat_normal")).not.toBeNull();
            expect(textureManager.getFallbackHandle("black_cube")).not.toBeNull();
        });
    });

    describe(".onContextLost() and .onContextRestored()", () => {
        it("onContextLost forwards context loss to cached textures and fallbacks and clears bindings", () => {
            const tex = textureManager.getOrCreate("assets/tex.png");
            const lostSpy = vi.spyOn(tex, "onContextLost");

            textureManager.bind(TextureUnit.Color0, tex);
            textureManager.onContextLost();

            expect(lostSpy).toHaveBeenCalledTimes(1);
            expect(textureManager.getDiagnostics().activeBindings).toBe(0);
        });

        it("onContextRestored restores fallbacks and forwards to cached textures", () => {
            const tex = textureManager.getOrCreate("assets/tex.png");
            const restoredSpy = vi.spyOn(tex, "onContextRestored");

            const newGl = createMockWebGL2Context();
            textureManager.onContextRestored(newGl);

            expect(restoredSpy).toHaveBeenCalledWith(newGl);
            expect(textureManager.getFallbackHandle("white")).not.toBeNull();
        });
    });

    describe(".destroy()", () => {
        it("destroys fallbacks, disposes all cached textures, and clears registry and bindings", () => {
            const tex1 = textureManager.getOrCreate("assets/tex1.png");
            const tex2 = textureManager.getOrCreate("assets/tex2.png");
            const disposeSpy1 = vi.spyOn(tex1, "dispose");
            const disposeSpy2 = vi.spyOn(tex2, "dispose");

            textureManager.bind(TextureUnit.Color0, tex1);
            textureManager.destroy();

            expect(disposeSpy1).toHaveBeenCalledTimes(1);
            expect(disposeSpy2).toHaveBeenCalledTimes(1);
            expect(textureManager.textureCount).toBe(0);
            expect(textureManager.getDiagnostics().activeBindings).toBe(0);
        });
    });

    describe(".getDiagnostics()", () => {
        it("accurately reports cache size and active unit binding count", () => {
            const initialDiag = textureManager.getDiagnostics();
            expect(initialDiag.name).toBe("texture");
            expect(initialDiag.resourceCount).toBe(0);
            expect(initialDiag.activeBindings).toBe(0);

            const tex = textureManager.getOrCreate("assets/tex.png");
            textureManager.bind(TextureUnit.Color0, tex);

            const activeDiag = textureManager.getDiagnostics();
            expect(activeDiag.resourceCount).toBe(1);
            expect(activeDiag.activeBindings).toBe(1);
        });
    });
});
