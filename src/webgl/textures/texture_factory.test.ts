import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSolid2DTexture, createSolidCubeTexture } from "./texture_factory";
import { SolidColorTexture } from "./solid_color_texture";
import { SolidColorCubeTexture } from "./solid_color_cube_texture";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";

describe("texture_factory", () => {
    let gl: WebGL2RenderingContext;

    beforeEach(() => {
        gl = createMockWebGL2Context();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("createSolid2DTexture", () => {
        it("allocates texture, binds to gl.TEXTURE_2D, uploads 1x1 RGBA pixel data with expected Uint8Array values [r, g, b, a]", () => {
            const r = 120;
            const g = 60;
            const b = 30;
            const a = 255;

            const tex = createSolid2DTexture(gl, r, g, b, a);

            expect(tex).toBeInstanceOf(SolidColorTexture);
            expect(tex.handle).not.toBeNull();
            expect(tex.isLoaded).toBe(true);
            expect(gl.createTexture).toHaveBeenCalledTimes(1);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, tex.handle);
            expect(gl.texImage2D).toHaveBeenCalledWith(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([r, g, b, a])
            );
        });

        it("configures texture parameters: NEAREST min/mag filters and CLAMP_TO_EDGE wrapS/wrapT", () => {
            const tex = createSolid2DTexture(gl, 100, 150, 200, 255);

            expect(tex.handle).not.toBeNull();
            expect(gl.texParameteri).toHaveBeenCalledTimes(4);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        });

        it("unbinds gl.TEXTURE_2D (binds null) and returns the managed SolidColorTexture instance", () => {
            const tex = createSolid2DTexture(gl, 10, 20, 30, 40);

            expect(tex).toBeInstanceOf(SolidColorTexture);
            expect(gl.bindTexture).toHaveBeenCalledTimes(2);
            expect(gl.bindTexture).toHaveBeenNthCalledWith(1, gl.TEXTURE_2D, tex.handle);
            expect(gl.bindTexture).toHaveBeenNthCalledWith(2, gl.TEXTURE_2D, null);
        });

        it("returns SolidColorTexture with null handle if gl.createTexture returns null without performing further gl operations", () => {
            vi.mocked(gl.createTexture).mockReturnValue(null as unknown as WebGLTexture);

            const tex = createSolid2DTexture(gl, 255, 0, 0, 255);

            expect(tex).toBeInstanceOf(SolidColorTexture);
            expect(tex.handle).toBeNull();
            expect(gl.createTexture).toHaveBeenCalledTimes(1);
            expect(gl.bindTexture).not.toHaveBeenCalled();
            expect(gl.texImage2D).not.toHaveBeenCalled();
            expect(gl.texParameteri).not.toHaveBeenCalled();
        });

        it("handles extreme color channels (e.g. [0, 0, 0, 0], [255, 255, 255, 255])", () => {
            const minTex = createSolid2DTexture(gl, 0, 0, 0, 0);
            expect(minTex.handle).not.toBeNull();
            expect(gl.texImage2D).toHaveBeenLastCalledWith(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 0, 0])
            );

            const maxTex = createSolid2DTexture(gl, 255, 255, 255, 255);
            expect(maxTex.handle).not.toBeNull();
            expect(gl.texImage2D).toHaveBeenLastCalledWith(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([255, 255, 255, 255])
            );
        });

        it("implements IDisposable: calling dispose deletes GPU texture handle", () => {
            const tex = createSolid2DTexture(gl, 255, 255, 255, 255);
            const rawHandle = tex.handle;
            expect(rawHandle).not.toBeNull();
            expect(tex.isDisposed).toBe(false);

            tex.dispose();

            expect(tex.isDisposed).toBe(true);
            expect(tex.handle).toBeNull();
            expect(gl.deleteTexture).toHaveBeenCalledWith(rawHandle);
        });
    });

    describe("createSolidCubeTexture", () => {
        it("allocates texture, binds to gl.TEXTURE_CUBE_MAP", () => {
            const tex = createSolidCubeTexture(gl, 64, 128, 192, 255);

            expect(tex).toBeInstanceOf(SolidColorCubeTexture);
            expect(tex.handle).not.toBeNull();
            expect(gl.createTexture).toHaveBeenCalledTimes(1);
            expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, tex.handle);
        });

        it("uploads 1x1 RGBA pixel data to all 6 cubemap faces", () => {
            const r = 200;
            const g = 100;
            const b = 50;
            const a = 255;
            const expectedPixel = new Uint8Array([r, g, b, a]);

            const tex = createSolidCubeTexture(gl, r, g, b, a);
            expect(tex.handle).not.toBeNull();

            const expectedFaces = [
                gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            ];

            expect(gl.texImage2D).toHaveBeenCalledTimes(6);
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
                    expectedPixel
                );
            }
        });

        it("configures cubemap texture parameters: NEAREST min/mag filters and CLAMP_TO_EDGE wrapS/wrapT/wrapR on gl.TEXTURE_CUBE_MAP", () => {
            const tex = createSolidCubeTexture(gl, 10, 20, 30, 40);

            expect(tex.handle).not.toBeNull();
            expect(gl.texParameteri).toHaveBeenCalledTimes(5);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        });

        it("unbinds gl.TEXTURE_CUBE_MAP (binds null) and returns the managed SolidColorCubeTexture instance", () => {
            const tex = createSolidCubeTexture(gl, 1, 2, 3, 4);

            expect(tex).toBeInstanceOf(SolidColorCubeTexture);
            expect(gl.bindTexture).toHaveBeenCalledTimes(2);
            expect(gl.bindTexture).toHaveBeenNthCalledWith(1, gl.TEXTURE_CUBE_MAP, tex.handle);
            expect(gl.bindTexture).toHaveBeenNthCalledWith(2, gl.TEXTURE_CUBE_MAP, null);
        });

        it("returns SolidColorCubeTexture with null handle if gl.createTexture returns null without performing further gl operations", () => {
            vi.mocked(gl.createTexture).mockReturnValue(null as unknown as WebGLTexture);

            const tex = createSolidCubeTexture(gl, 0, 255, 0, 255);

            expect(tex).toBeInstanceOf(SolidColorCubeTexture);
            expect(tex.handle).toBeNull();
            expect(gl.createTexture).toHaveBeenCalledTimes(1);
            expect(gl.bindTexture).not.toHaveBeenCalled();
            expect(gl.texImage2D).not.toHaveBeenCalled();
            expect(gl.texParameteri).not.toHaveBeenCalled();
        });

        it("handles extreme color channels (e.g. [0, 0, 0, 0], [255, 255, 255, 255])", () => {
            const minTex = createSolidCubeTexture(gl, 0, 0, 0, 0);
            expect(minTex.handle).not.toBeNull();
            expect(gl.texImage2D).toHaveBeenCalledWith(
                gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 0, 0])
            );

            const maxTex = createSolidCubeTexture(gl, 255, 255, 255, 255);
            expect(maxTex.handle).not.toBeNull();
            expect(gl.texImage2D).toHaveBeenCalledWith(
                gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([255, 255, 255, 255])
            );
        });

        it("implements IDisposable: calling dispose deletes GPU cubemap handle", () => {
            const tex = createSolidCubeTexture(gl, 0, 0, 0, 255);
            const rawHandle = tex.handle;
            expect(rawHandle).not.toBeNull();
            expect(tex.isDisposed).toBe(false);

            tex.dispose();

            expect(tex.isDisposed).toBe(true);
            expect(tex.handle).toBeNull();
            expect(gl.deleteTexture).toHaveBeenCalledWith(rawHandle);
        });
    });
});
