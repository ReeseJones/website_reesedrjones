import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CubeTexture } from "./cube_texture";
import { TextureTarget, TextureUnit } from "./texture_types";
import { GLCubeFace } from "../core/webgl_constants_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";

describe("CubeTexture", () => {
    let gl: WebGL2RenderingContext;

    const mockFaces = {
        posX: "faces/posx.png",
        negX: "faces/negx.png",
        posY: "faces/posy.png",
        negY: "faces/negy.png",
        posZ: "faces/posz.png",
        negZ: "faces/negz.png",
    };

    beforeEach(() => {
        gl = createMockWebGL2Context();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor and initial state", () => {
        it("initializes with TextureTarget.CubeMap and default sampler settings", () => {
            const cube = new CubeTexture({ faces: mockFaces, label: "SkyboxCube" });

            expect(cube.target).toBe(TextureTarget.CubeMap);
            expect(cube.label).toBe("SkyboxCube");
            expect(cube.handle).toBeNull();
            expect(cube.isReady).toBe(false);
            expect(cube.isLoaded).toBe(false);
            expect(cube.isDisposed).toBe(false);
            expect(cube.isValid).toBe(false);
            expect(cube.faces).toEqual(mockFaces);
        });

        it("accepts string filter options", () => {
            const cube = new CubeTexture({
                faces: mockFaces,
                minFilter: "linear",
                magFilter: "nearest",
                generateMipmaps: false,
            });

            expect(cube.options.minFilter).toBe("linear");
            expect(cube.options.magFilter).toBe("nearest");
            expect(cube.options.generateMipmaps).toBe(false);
        });
    });

    describe("init and GPU fallback allocation", () => {
        it("allocates GPU cubemap handle and seeds all 6 faces with black 1x1 pixels", () => {
            const cube = new CubeTexture({ faces: mockFaces });
            cube.init(gl);

            expect(gl.createTexture).toHaveBeenCalledTimes(1);
            expect(cube.handle).not.toBeNull();
            expect(cube.isValid).toBe(true);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, cube.handle);

            const expectedFaces = [
                GLCubeFace.PositiveX,
                GLCubeFace.NegativeX,
                GLCubeFace.PositiveY,
                GLCubeFace.NegativeY,
                GLCubeFace.PositiveZ,
                GLCubeFace.NegativeZ,
            ];

            for (const face of expectedFaces) {
                expect(gl.texImage2D).toHaveBeenCalledWith(
                    face,
                    0,
                    gl.RGBA,
                    1,
                    1,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    expect.any(Uint8Array)
                );
            }

            // Checks wrap parameters including WRAP_R
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        });
    });

    describe("bind and unbind", () => {
        it("binds to Color0 by default on TEXTURE_CUBE_MAP target and unbinds cleanly", () => {
            const cube = new CubeTexture({ faces: mockFaces });
            cube.init(gl);

            cube.bind();
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Color0);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, cube.handle);

            cube.unbind();
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, null);
        });

        it("binds to Environment slot (TextureUnit.Environment = 11)", () => {
            const cube = new CubeTexture({ faces: mockFaces });
            cube.init(gl);

            cube.bind(TextureUnit.Environment);
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Environment);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, cube.handle);
        });
    });

    describe("dispose and onDispose", () => {
        it("disposes texture handle and executes onDispose callback", () => {
            const cube = new CubeTexture({ faces: mockFaces });
            cube.init(gl);

            const callback = vi.fn();
            cube.onDispose(callback);

            cube.dispose();

            expect(cube.isDisposed).toBe(true);
            expect(cube.handle).toBeNull();
            expect(cube.isValid).toBe(false);
            expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe("context lost and restored", () => {
        it("clears handle on context loss and re-initializes on restoration", () => {
            const cube = new CubeTexture({ faces: mockFaces });
            cube.init(gl);
            const firstHandle = cube.handle;

            cube.onContextLost();
            expect(cube.handle).toBeNull();

            const restoredGl = createMockWebGL2Context();
            cube.onContextRestored(restoredGl);

            expect(cube.handle).not.toBeNull();
            expect(cube.handle).not.toBe(firstHandle);
            expect(restoredGl.createTexture).toHaveBeenCalledTimes(1);
        });
    });
});
