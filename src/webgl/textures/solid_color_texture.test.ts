import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SolidColorTexture } from "./solid_color_texture";
import { SolidColorCubeTexture } from "./solid_color_cube_texture";
import { TextureTarget, TextureUnit } from "./texture_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";

describe("SolidColorTexture", () => {
    let gl: WebGL2RenderingContext;

    beforeEach(() => {
        gl = createMockWebGL2Context();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor and initial properties", () => {
        it("defaults to white [255, 255, 255, 255] when no arguments provided", () => {
            const texture = new SolidColorTexture();

            expect(texture.pixelData).toEqual(new Uint8Array([255, 255, 255, 255]));
        });

        it("accepts custom r, g, b, a values", () => {
            const texture = new SolidColorTexture(100, 150, 200, 128);

            expect(texture.pixelData).toEqual(new Uint8Array([100, 150, 200, 128]));
        });

        it("width is 1, height is 1, isLoaded is true", () => {
            const texture = new SolidColorTexture();

            expect(texture.width).toBe(1);
            expect(texture.height).toBe(1);
            expect(texture.isLoaded).toBe(true);
            expect(texture.isDisposed).toBe(false);
            expect(texture.handle).toBeNull();
        });

        it("target is gl.TEXTURE_2D", () => {
            const texture = new SolidColorTexture();

            expect(texture.target).toBe(TextureTarget.Texture2D);
        });

        it("options default to nearest filtering and clamp_to_edge wrapping", () => {
            const texture = new SolidColorTexture();

            expect(texture.label).toBe("SolidColorTexture");
            expect(texture.options.minFilter).toBe("nearest");
            expect(texture.options.magFilter).toBe("nearest");
            expect(texture.options.wrapS).toBe("clamp_to_edge");
            expect(texture.options.wrapT).toBe("clamp_to_edge");
            expect(texture.options.generateMipmaps).toBe(false);
            expect(texture.options.flipY).toBe(false);
            expect(texture.options.target).toBe(TextureTarget.Texture2D);
        });

        it("merges custom options while preserving texture target", () => {
            const texture = new SolidColorTexture(255, 255, 255, 255, {
                label: "CustomSolidColor",
                wrapS: "repeat",
            });

            expect(texture.label).toBe("CustomSolidColor");
            expect(texture.options.wrapS).toBe("repeat");
            expect(texture.target).toBe(TextureTarget.Texture2D);
        });
    });

    describe("pixelData and setColor", () => {
        it("pixelData returns Uint8Array matching current color", () => {
            const texture = new SolidColorTexture(10, 20, 30, 40);

            const data = texture.pixelData;
            expect(data).toBeInstanceOf(Uint8Array);
            expect(data.length).toBe(4);
            expect(Array.from(data)).toEqual([10, 20, 30, 40]);
        });

        it("setColor updates pixelData", () => {
            const texture = new SolidColorTexture();

            texture.setColor(12, 34, 56, 78);
            expect(Array.from(texture.pixelData)).toEqual([12, 34, 56, 78]);

            // Test fallback default alpha = 255 when 4th parameter omitted
            texture.setColor(90, 80, 70);
            expect(Array.from(texture.pixelData)).toEqual([90, 80, 70, 255]);
        });

        it("setColor re-uploads to GPU when texture is initialized and active", () => {
            const texture = new SolidColorTexture();
            texture.init(gl);

            vi.mocked(gl.bindTexture).mockClear();
            vi.mocked(gl.texImage2D).mockClear();

            texture.setColor(255, 0, 128, 200);

            expect(gl.bindTexture).toHaveBeenNthCalledWith(1, WebGL2RenderingContext.TEXTURE_2D, texture.handle);
            expect(gl.texImage2D).toHaveBeenCalledWith(
                WebGL2RenderingContext.TEXTURE_2D,
                0,
                WebGL2RenderingContext.RGBA,
                1,
                1,
                0,
                WebGL2RenderingContext.RGBA,
                WebGL2RenderingContext.UNSIGNED_BYTE,
                texture.pixelData
            );
            expect(gl.bindTexture).toHaveBeenNthCalledWith(2, WebGL2RenderingContext.TEXTURE_2D, null);
        });

        it("setColor does not attempt GPU upload if texture has not been initialized", () => {
            const texture = new SolidColorTexture();

            texture.setColor(10, 20, 30, 40);

            expect(gl.texImage2D).not.toHaveBeenCalled();
            expect(gl.bindTexture).not.toHaveBeenCalled();
        });

        it("setColor does not attempt GPU upload if WebGL context is lost", () => {
            const texture = new SolidColorTexture();
            texture.init(gl);

            vi.mocked(gl.isContextLost).mockReturnValue(true);
            vi.mocked(gl.texImage2D).mockClear();
            vi.mocked(gl.bindTexture).mockClear();

            texture.setColor(10, 20, 30, 40);

            expect(gl.texImage2D).not.toHaveBeenCalled();
            expect(gl.bindTexture).not.toHaveBeenCalled();
        });
    });

    describe("GPU upload and binding", () => {
        it("init allocates handle and uploads 1x1 RGBA pixel via gl.texImage2D", () => {
            const texture = new SolidColorTexture(255, 128, 0, 255);
            texture.init(gl);

            expect(gl.createTexture).toHaveBeenCalledTimes(1);
            expect(texture.handle).not.toBeNull();
            expect(gl.bindTexture).toHaveBeenNthCalledWith(1, WebGL2RenderingContext.TEXTURE_2D, texture.handle);

            expect(gl.texParameteri).toHaveBeenCalledWith(
                WebGL2RenderingContext.TEXTURE_2D,
                WebGL2RenderingContext.TEXTURE_WRAP_S,
                WebGL2RenderingContext.CLAMP_TO_EDGE
            );
            expect(gl.texParameteri).toHaveBeenCalledWith(
                WebGL2RenderingContext.TEXTURE_2D,
                WebGL2RenderingContext.TEXTURE_WRAP_T,
                WebGL2RenderingContext.CLAMP_TO_EDGE
            );
            expect(gl.texParameteri).toHaveBeenCalledWith(
                WebGL2RenderingContext.TEXTURE_2D,
                WebGL2RenderingContext.TEXTURE_MIN_FILTER,
                WebGL2RenderingContext.NEAREST
            );
            expect(gl.texParameteri).toHaveBeenCalledWith(
                WebGL2RenderingContext.TEXTURE_2D,
                WebGL2RenderingContext.TEXTURE_MAG_FILTER,
                WebGL2RenderingContext.NEAREST
            );

            expect(gl.texImage2D).toHaveBeenCalledWith(
                WebGL2RenderingContext.TEXTURE_2D,
                0,
                WebGL2RenderingContext.RGBA,
                1,
                1,
                0,
                WebGL2RenderingContext.RGBA,
                WebGL2RenderingContext.UNSIGNED_BYTE,
                texture.pixelData
            );

            expect(gl.bindTexture).toHaveBeenNthCalledWith(2, WebGL2RenderingContext.TEXTURE_2D, null);
        });

        it("bind activates unit and binds to gl.TEXTURE_2D", () => {
            const texture = new SolidColorTexture();
            texture.init(gl);

            texture.bind();
            expect(gl.activeTexture).toHaveBeenCalledWith(WebGL2RenderingContext.TEXTURE0 + TextureUnit.Color0);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(WebGL2RenderingContext.TEXTURE_2D, texture.handle);

            texture.bind(TextureUnit.Normal);
            expect(gl.activeTexture).toHaveBeenCalledWith(WebGL2RenderingContext.TEXTURE0 + TextureUnit.Normal);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(WebGL2RenderingContext.TEXTURE_2D, texture.handle);
        });

        it("unbind activates unit and binds null to gl.TEXTURE_2D", () => {
            const texture = new SolidColorTexture();
            texture.init(gl);

            texture.unbind();
            expect(gl.activeTexture).toHaveBeenCalledWith(WebGL2RenderingContext.TEXTURE0 + TextureUnit.Color0);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(WebGL2RenderingContext.TEXTURE_2D, null);

            texture.unbind(TextureUnit.Emissive);
            expect(gl.activeTexture).toHaveBeenCalledWith(WebGL2RenderingContext.TEXTURE0 + TextureUnit.Emissive);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(WebGL2RenderingContext.TEXTURE_2D, null);
        });
    });

    describe("lifecycle", () => {
        it("dispose frees GPU texture handle and marks isDisposed = true", () => {
            const texture = new SolidColorTexture();
            texture.init(gl);
            const handle = texture.handle;

            const onDisposeListener = vi.fn();
            texture.onDispose(onDisposeListener);

            expect(texture.isDisposed).toBe(false);

            texture.dispose();

            expect(texture.isDisposed).toBe(true);
            expect(texture.handle).toBeNull();
            expect(gl.deleteTexture).toHaveBeenCalledWith(handle);
            expect(onDisposeListener).toHaveBeenCalledTimes(1);
        });

        it("dispose is idempotent and safe to call multiple times", () => {
            const texture = new SolidColorTexture();
            texture.init(gl);
            const onDisposeListener = vi.fn();
            texture.onDispose(onDisposeListener);

            texture.dispose();
            expect(onDisposeListener).toHaveBeenCalledTimes(1);
            expect(gl.deleteTexture).toHaveBeenCalledTimes(1);

            texture.dispose();
            expect(onDisposeListener).toHaveBeenCalledTimes(1);
            expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
        });

        it("destroy deletes handle without invoking onDispose callbacks", () => {
            const texture = new SolidColorTexture();
            texture.init(gl);
            const handle = texture.handle;
            const onDisposeListener = vi.fn();
            texture.onDispose(onDisposeListener);

            texture.destroy();

            expect(gl.deleteTexture).toHaveBeenCalledWith(handle);
            expect(texture.handle).toBeNull();
            expect(onDisposeListener).not.toHaveBeenCalled();
        });
    });
});

describe("SolidColorCubeTexture", () => {
    let gl: WebGL2RenderingContext;

    const EXPECTED_CUBE_FACES = [
        WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X,
        WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
        WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
        WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,
        WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    ];

    beforeEach(() => {
        gl = createMockWebGL2Context();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor and initial properties", () => {
        it("defaults to black [0, 0, 0, 255]", () => {
            const texture = new SolidColorCubeTexture();

            expect(texture.pixelData).toEqual(new Uint8Array([0, 0, 0, 255]));
        });

        it("accepts custom r, g, b, a values", () => {
            const texture = new SolidColorCubeTexture(64, 128, 192, 255);

            expect(texture.pixelData).toEqual(new Uint8Array([64, 128, 192, 255]));
        });

        it("target is gl.TEXTURE_CUBE_MAP", () => {
            const texture = new SolidColorCubeTexture();

            expect(texture.target).toBe(TextureTarget.CubeMap);
        });

        it("width is 1, height is 1, isLoaded is true, isReady is true, isDestroyed is false", () => {
            const texture = new SolidColorCubeTexture();

            expect(texture.width).toBe(1);
            expect(texture.height).toBe(1);
            expect(texture.isLoaded).toBe(true);
            expect(texture.isReady).toBe(true);
            expect(texture.isDisposed).toBe(false);
            expect(texture.isDestroyed).toBe(false);
            expect(texture.handle).toBeNull();
            expect(texture.label).toBe("SolidColorCubeTexture");
        });

        it("options default to nearest filtering and clamp_to_edge wrapping", () => {
            const texture = new SolidColorCubeTexture();

            expect(texture.options.minFilter).toBe("nearest");
            expect(texture.options.magFilter).toBe("nearest");
            expect(texture.options.wrapS).toBe("clamp_to_edge");
            expect(texture.options.wrapT).toBe("clamp_to_edge");
            expect(texture.options.generateMipmaps).toBe(false);
            expect(texture.options.flipY).toBe(false);
            expect(texture.options.target).toBe(TextureTarget.CubeMap);
        });

        it("faces returns dummy faces record with empty strings", () => {
            const texture = new SolidColorCubeTexture();

            expect(texture.faces).toEqual({
                posX: "",
                negX: "",
                posY: "",
                negY: "",
                posZ: "",
                negZ: "",
            });
        });

        it("load() resolves immediately", async () => {
            const texture = new SolidColorCubeTexture();

            const loadPromise = texture.load();
            await expect(loadPromise).resolves.toBeUndefined();
            expect(texture.isReady).toBe(true);
        });
    });

    describe("upload to 6 cubemap faces", () => {
        it("init uploads 1x1 RGBA to all 6 cubemap face targets (TEXTURE_CUBE_MAP_POSITIVE_X through NEGATIVE_Z)", () => {
            const texture = new SolidColorCubeTexture(50, 100, 150, 200);
            texture.init(gl);

            expect(gl.createTexture).toHaveBeenCalledTimes(1);
            expect(texture.handle).not.toBeNull();
            expect(gl.bindTexture).toHaveBeenNthCalledWith(1, WebGL2RenderingContext.TEXTURE_CUBE_MAP, texture.handle);

            expect(gl.texImage2D).toHaveBeenCalledTimes(6);
            for (let i = 0; i < EXPECTED_CUBE_FACES.length; i++) {
                expect(gl.texImage2D).toHaveBeenNthCalledWith(
                    i + 1,
                    EXPECTED_CUBE_FACES[i],
                    0,
                    WebGL2RenderingContext.RGBA,
                    1,
                    1,
                    0,
                    WebGL2RenderingContext.RGBA,
                    WebGL2RenderingContext.UNSIGNED_BYTE,
                    texture.pixelData
                );
            }

            expect(gl.bindTexture).toHaveBeenNthCalledWith(2, WebGL2RenderingContext.TEXTURE_CUBE_MAP, null);
        });

        it("setColor updates pixelData and re-uploads to all 6 faces if active", () => {
            const texture = new SolidColorCubeTexture();
            texture.init(gl);

            vi.mocked(gl.bindTexture).mockClear();
            vi.mocked(gl.texImage2D).mockClear();

            texture.setColor(10, 20, 30, 40);

            expect(Array.from(texture.pixelData)).toEqual([10, 20, 30, 40]);
            expect(gl.bindTexture).toHaveBeenNthCalledWith(1, WebGL2RenderingContext.TEXTURE_CUBE_MAP, texture.handle);
            expect(gl.texImage2D).toHaveBeenCalledTimes(6);
            for (let i = 0; i < EXPECTED_CUBE_FACES.length; i++) {
                expect(gl.texImage2D).toHaveBeenNthCalledWith(
                    i + 1,
                    EXPECTED_CUBE_FACES[i],
                    0,
                    WebGL2RenderingContext.RGBA,
                    1,
                    1,
                    0,
                    WebGL2RenderingContext.RGBA,
                    WebGL2RenderingContext.UNSIGNED_BYTE,
                    texture.pixelData
                );
            }
            expect(gl.bindTexture).toHaveBeenNthCalledWith(2, WebGL2RenderingContext.TEXTURE_CUBE_MAP, null);
        });

        it("setColor does not re-upload if uninitialized", () => {
            const texture = new SolidColorCubeTexture();

            texture.setColor(1, 2, 3, 4);

            expect(Array.from(texture.pixelData)).toEqual([1, 2, 3, 4]);
            expect(gl.texImage2D).not.toHaveBeenCalled();
            expect(gl.bindTexture).not.toHaveBeenCalled();
        });

        it("setColor does not re-upload if context is lost", () => {
            const texture = new SolidColorCubeTexture();
            texture.init(gl);

            vi.mocked(gl.isContextLost).mockReturnValue(true);
            vi.mocked(gl.bindTexture).mockClear();
            vi.mocked(gl.texImage2D).mockClear();

            texture.setColor(1, 2, 3, 4);

            expect(gl.texImage2D).not.toHaveBeenCalled();
            expect(gl.bindTexture).not.toHaveBeenCalled();
        });

        it("bind activates unit and binds to gl.TEXTURE_CUBE_MAP", () => {
            const texture = new SolidColorCubeTexture();
            texture.init(gl);

            texture.bind(TextureUnit.Environment);
            expect(gl.activeTexture).toHaveBeenCalledWith(WebGL2RenderingContext.TEXTURE0 + TextureUnit.Environment);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(WebGL2RenderingContext.TEXTURE_CUBE_MAP, texture.handle);
        });

        it("unbind activates unit and binds null to gl.TEXTURE_CUBE_MAP", () => {
            const texture = new SolidColorCubeTexture();
            texture.init(gl);

            texture.unbind(TextureUnit.Environment);
            expect(gl.activeTexture).toHaveBeenCalledWith(WebGL2RenderingContext.TEXTURE0 + TextureUnit.Environment);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(WebGL2RenderingContext.TEXTURE_CUBE_MAP, null);
        });
    });

    describe("lifecycle", () => {
        it("dispose marks isDestroyed = true, deletes handle", () => {
            const texture = new SolidColorCubeTexture();
            texture.init(gl);
            const handle = texture.handle;

            const onDisposeListener = vi.fn();
            texture.onDispose(onDisposeListener);

            expect(texture.isDestroyed).toBe(false);
            expect(texture.isDisposed).toBe(false);

            texture.dispose();

            expect(texture.isDestroyed).toBe(true);
            expect(texture.isDisposed).toBe(true);
            expect(texture.handle).toBeNull();
            expect(gl.deleteTexture).toHaveBeenCalledWith(handle);
            expect(onDisposeListener).toHaveBeenCalledTimes(1);
        });

        it("dispose is idempotent and safe to call repeatedly", () => {
            const texture = new SolidColorCubeTexture();
            texture.init(gl);
            const onDisposeListener = vi.fn();
            texture.onDispose(onDisposeListener);

            texture.dispose();
            expect(onDisposeListener).toHaveBeenCalledTimes(1);
            expect(gl.deleteTexture).toHaveBeenCalledTimes(1);

            texture.dispose();
            expect(onDisposeListener).toHaveBeenCalledTimes(1);
            expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
        });
    });
});
