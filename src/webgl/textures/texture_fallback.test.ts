import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FallbackTextureRegistry } from "./texture_fallback";
import { SolidColorTexture } from "./solid_color_texture";
import { SolidColorCubeTexture } from "./solid_color_cube_texture";
import type { TextureFallbackType } from "./texture_manager_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";

describe("FallbackTextureRegistry", () => {
    let registry: FallbackTextureRegistry;
    let gl: WebGL2RenderingContext;

    beforeEach(() => {
        gl = createMockWebGL2Context();
        registry = new FallbackTextureRegistry();
    });

    afterEach(() => {
        registry.destroy();
        vi.restoreAllMocks();
    });

    describe("initialization and uninitialized state", () => {
        it("returns null for all types before init is called via get()", () => {
            const types: TextureFallbackType[] = ["white", "black", "flat_normal", "black_cube"];
            for (const type of types) {
                expect(registry.get(type)).toBeNull();
            }
        });

        it("returns null for all types (and default white) before init is called via getTexture()", () => {
            const types: TextureFallbackType[] = ["white", "black", "flat_normal", "black_cube"];
            for (const type of types) {
                expect(registry.getTexture(type)).toBeNull();
            }
            expect(registry.getTexture()).toBeNull();
        });
    });

    describe("init", () => {
        it("allocates white, black, flat normal 2D solid textures and black solid cube texture", () => {
            registry.init(gl);

            const whiteTex = registry.getTexture("white") as SolidColorTexture;
            const blackTex = registry.getTexture("black") as SolidColorTexture;
            const flatNormalTex = registry.getTexture("flat_normal") as SolidColorTexture;
            const blackCubeTex = registry.getTexture("black_cube") as SolidColorCubeTexture;

            expect(whiteTex).toBeInstanceOf(SolidColorTexture);
            expect(whiteTex.pixelData).toEqual(new Uint8Array([255, 255, 255, 255]));

            expect(blackTex).toBeInstanceOf(SolidColorTexture);
            expect(blackTex.pixelData).toEqual(new Uint8Array([0, 0, 0, 255]));

            expect(flatNormalTex).toBeInstanceOf(SolidColorTexture);
            expect(flatNormalTex.pixelData).toEqual(new Uint8Array([128, 128, 255, 255]));

            expect(blackCubeTex).toBeInstanceOf(SolidColorCubeTexture);
            expect(blackCubeTex.pixelData).toEqual(new Uint8Array([0, 0, 0, 255]));

            // 4 textures created in total (3 2D textures + 1 cubemap)
            expect(gl.createTexture).toHaveBeenCalledTimes(4);
        });

        it("returns WebGLTexture handles for white, black, flat_normal, and black_cube from get(type)", () => {
            registry.init(gl);

            const whiteHandle = registry.get("white");
            const blackHandle = registry.get("black");
            const flatNormalHandle = registry.get("flat_normal");
            const blackCubeHandle = registry.get("black_cube");

            expect(whiteHandle).not.toBeNull();
            expect(blackHandle).not.toBeNull();
            expect(flatNormalHandle).not.toBeNull();
            expect(blackCubeHandle).not.toBeNull();

            // Verify they match the handles from getTexture()
            expect(whiteHandle).toBe(registry.getTexture("white")?.handle);
            expect(blackHandle).toBe(registry.getTexture("black")?.handle);
            expect(flatNormalHandle).toBe(registry.getTexture("flat_normal")?.handle);
            expect(blackCubeHandle).toBe(registry.getTexture("black_cube")?.handle);

            // Each handle should be unique
            const handles = new Set([whiteHandle, blackHandle, flatNormalHandle, blackCubeHandle]);
            expect(handles.size).toBe(4);
        });

        it("returns managed SolidColorTexture for white, black, flat_normal, and SolidColorCubeTexture for black_cube from getTexture(type)", () => {
            registry.init(gl);

            expect(registry.getTexture("white")).toBeInstanceOf(SolidColorTexture);
            expect(registry.getTexture("black")).toBeInstanceOf(SolidColorTexture);
            expect(registry.getTexture("flat_normal")).toBeInstanceOf(SolidColorTexture);
            expect(registry.getTexture("black_cube")).toBeInstanceOf(SolidColorCubeTexture);
        });

        it("falls back to white handle when get() is called with unknown type or default", () => {
            registry.init(gl);

            const whiteHandle = registry.get("white");
            expect(whiteHandle).not.toBeNull();

            // Unknown fallback type string
            const unknownHandle = registry.get("unknown_type" as TextureFallbackType);
            expect(unknownHandle).toBe(whiteHandle);
        });

        it("returns white SolidColorTexture when getTexture() is called with omitted argument or unknown type", () => {
            registry.init(gl);

            const whiteTexture = registry.getTexture("white");
            expect(whiteTexture).toBeInstanceOf(SolidColorTexture);

            // Default parameter (omitted)
            expect(registry.getTexture()).toBe(whiteTexture);

            // Unknown fallback type falls back to white
            expect(registry.getTexture("non_existent" as TextureFallbackType)).toBe(whiteTexture);
        });

        it("disposes previous textures before allocating new ones when init() is called a second time", () => {
            registry.init(gl);

            const oldWhite = registry.getTexture("white")!;
            const oldBlack = registry.getTexture("black")!;
            const oldFlatNormal = registry.getTexture("flat_normal")!;
            const oldBlackCube = registry.getTexture("black_cube")!;

            const oldWhiteHandle = oldWhite.handle;
            const oldBlackHandle = oldBlack.handle;
            const oldFlatNormalHandle = oldFlatNormal.handle;
            const oldBlackCubeHandle = oldBlackCube.handle;

            const spyWhiteDispose = vi.spyOn(oldWhite, "dispose");
            const spyBlackDispose = vi.spyOn(oldBlack, "dispose");
            const spyFlatNormalDispose = vi.spyOn(oldFlatNormal, "dispose");
            const spyBlackCubeDispose = vi.spyOn(oldBlackCube, "dispose");

            registry.init(gl);

            expect(spyWhiteDispose).toHaveBeenCalledTimes(1);
            expect(spyBlackDispose).toHaveBeenCalledTimes(1);
            expect(spyFlatNormalDispose).toHaveBeenCalledTimes(1);
            expect(spyBlackCubeDispose).toHaveBeenCalledTimes(1);

            expect(gl.deleteTexture).toHaveBeenCalledWith(oldWhiteHandle);
            expect(gl.deleteTexture).toHaveBeenCalledWith(oldBlackHandle);
            expect(gl.deleteTexture).toHaveBeenCalledWith(oldFlatNormalHandle);
            expect(gl.deleteTexture).toHaveBeenCalledWith(oldBlackCubeHandle);

            // Verify new textures are active and distinct from previous ones
            const newWhite = registry.getTexture("white")!;
            expect(newWhite).not.toBe(oldWhite);
            expect(newWhite.handle).not.toBe(oldWhiteHandle);
        });
    });

    describe("onContextLost", () => {
        it("propagates onContextLost() to all managed fallback textures and clears their handles", () => {
            registry.init(gl);

            const white = registry.getTexture("white")!;
            const black = registry.getTexture("black")!;
            const flatNormal = registry.getTexture("flat_normal")!;
            const blackCube = registry.getTexture("black_cube")!;

            const spyWhiteLost = vi.spyOn(white, "onContextLost");
            const spyBlackLost = vi.spyOn(black, "onContextLost");
            const spyFlatNormalLost = vi.spyOn(flatNormal, "onContextLost");
            const spyBlackCubeLost = vi.spyOn(blackCube, "onContextLost");

            registry.onContextLost();

            expect(spyWhiteLost).toHaveBeenCalledTimes(1);
            expect(spyBlackLost).toHaveBeenCalledTimes(1);
            expect(spyFlatNormalLost).toHaveBeenCalledTimes(1);
            expect(spyBlackCubeLost).toHaveBeenCalledTimes(1);

            // Verified via handle inspection: handles become null after context loss
            expect(registry.get("white")).toBeNull();
            expect(registry.get("black")).toBeNull();
            expect(registry.get("flat_normal")).toBeNull();
            expect(registry.get("black_cube")).toBeNull();

            // Texture instances are still retained by registry
            expect(registry.getTexture("white")).toBe(white);
            expect(registry.getTexture("black")).toBe(black);
            expect(registry.getTexture("flat_normal")).toBe(flatNormal);
            expect(registry.getTexture("black_cube")).toBe(blackCube);

            // Context loss must NOT call gl.deleteTexture
            expect(gl.deleteTexture).not.toHaveBeenCalled();
        });

        it("is safe to call onContextLost() when registry is uninitialized", () => {
            expect(() => registry.onContextLost()).not.toThrow();
        });
    });

    describe("destroy", () => {
        it("calls dispose() on all managed fallback textures and deletes GPU handles", () => {
            registry.init(gl);

            const white = registry.getTexture("white")!;
            const black = registry.getTexture("black")!;
            const flatNormal = registry.getTexture("flat_normal")!;
            const blackCube = registry.getTexture("black_cube")!;

            const whiteHandle = white.handle;
            const blackHandle = black.handle;
            const flatNormalHandle = flatNormal.handle;
            const blackCubeHandle = blackCube.handle;

            const spyWhiteDispose = vi.spyOn(white, "dispose");
            const spyBlackDispose = vi.spyOn(black, "dispose");
            const spyFlatNormalDispose = vi.spyOn(flatNormal, "dispose");
            const spyBlackCubeDispose = vi.spyOn(blackCube, "dispose");

            registry.destroy(gl);

            expect(spyWhiteDispose).toHaveBeenCalledTimes(1);
            expect(spyBlackDispose).toHaveBeenCalledTimes(1);
            expect(spyFlatNormalDispose).toHaveBeenCalledTimes(1);
            expect(spyBlackCubeDispose).toHaveBeenCalledTimes(1);

            expect(gl.deleteTexture).toHaveBeenCalledWith(whiteHandle);
            expect(gl.deleteTexture).toHaveBeenCalledWith(blackHandle);
            expect(gl.deleteTexture).toHaveBeenCalledWith(flatNormalHandle);
            expect(gl.deleteTexture).toHaveBeenCalledWith(blackCubeHandle);
        });

        it("resets all internal references to null", () => {
            registry.init(gl);

            registry.destroy();

            expect(registry.getTexture("white")).toBeNull();
            expect(registry.getTexture("black")).toBeNull();
            expect(registry.getTexture("flat_normal")).toBeNull();
            expect(registry.getTexture("black_cube")).toBeNull();
            expect(registry.getTexture()).toBeNull();
        });

        it("returns null for get() and getTexture() after destroy()", () => {
            registry.init(gl);

            registry.destroy();

            const types: TextureFallbackType[] = ["white", "black", "flat_normal", "black_cube"];
            for (const type of types) {
                expect(registry.get(type)).toBeNull();
                expect(registry.getTexture(type)).toBeNull();
            }
            expect(registry.getTexture()).toBeNull();
        });

        it("is idempotent: calling destroy() multiple times is safe and does not error", () => {
            registry.init(gl);

            expect(() => {
                registry.destroy();
                registry.destroy();
                registry.destroy();
            }).not.toThrow();

            expect(registry.get("white")).toBeNull();
            expect(registry.getTexture("white")).toBeNull();
        });
    });
});
