import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BaseTexture, resolveWrapMode, resolveFilterMode } from "./base_texture";
import type { BaseTextureOptions } from "./base_texture_types";
import { TextureTarget, TextureUnit, type TextureFilter, type TextureWrap } from "./texture_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";

/**
 * Concrete subclass of BaseTexture to enable instantiation and verification
 * of abstract base texture lifecycle and GPU binding behaviors.
 */
class TestTexture extends BaseTexture {
    public uploadCallCount = 0;
    public lastUploadGl: WebGL2RenderingContext | null = null;

    constructor(options: BaseTextureOptions = {}) {
        super(options);
    }

    public setDimensions(width: number, height: number): void {
        this._width = width;
        this._height = height;
    }

    public setLoaded(loaded: boolean): void {
        this._isLoaded = loaded;
    }

    protected uploadGPU(gl: WebGL2RenderingContext): void {
        this.uploadCallCount++;
        this.lastUploadGl = gl;
    }
}

describe("BaseTexture", () => {
    let gl: WebGL2RenderingContext;

    beforeEach(() => {
        gl = createMockWebGL2Context();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor and initial state", () => {
        it("initializes with sensible default configuration options and WebGL constants", () => {
            const texture = new TestTexture();

            expect(texture.label).toBe("BaseTexture");
            expect(texture.target).toBe(TextureTarget.Texture2D);
            expect(texture.options).toEqual({
                wrapS: "clamp_to_edge",
                wrapT: "clamp_to_edge",
                minFilter: "linear_mipmap_linear",
                magFilter: "linear",
                flipY: true,
                generateMipmaps: false,
                label: undefined,
                target: TextureTarget.Texture2D,
            });
        });

        it("initializes with custom configuration options when provided", () => {
            const options: BaseTextureOptions = {
                label: "CustomTexture",
                target: TextureTarget.CubeMap,
                wrapS: "repeat",
                wrapT: "mirrored_repeat",
                minFilter: "nearest_mipmap_nearest",
                magFilter: "nearest",
                flipY: false,
                generateMipmaps: true,
            };

            const texture = new TestTexture(options);

            expect(texture.label).toBe("CustomTexture");
            expect(texture.target).toBe(TextureTarget.CubeMap);
            expect(texture.options).toEqual({
                label: "CustomTexture",
                target: TextureTarget.CubeMap,
                wrapS: "repeat",
                wrapT: "mirrored_repeat",
                minFilter: "nearest_mipmap_nearest",
                magFilter: "nearest",
                flipY: false,
                generateMipmaps: true,
            });
        });

        it("initializes public state properties with expected defaults before initialization", () => {
            const texture = new TestTexture();

            expect(texture.handle).toBeNull();
            expect(texture.width).toBe(1);
            expect(texture.height).toBe(1);
            expect(texture.isLoaded).toBe(false);
            expect(texture.isDisposed).toBe(false);
            expect(texture.isValid).toBe(false);
        });

        it("allows subclasses to update dimensions and loaded state", () => {
            const texture = new TestTexture();
            texture.setDimensions(512, 256);
            texture.setLoaded(true);

            expect(texture.width).toBe(512);
            expect(texture.height).toBe(256);
            expect(texture.isLoaded).toBe(true);
        });
    });

    describe("init", () => {
        it("allocates WebGLTexture, binds, configures sampler parameters, invokes uploadGPU, and unbinds target", () => {
            const texture = new TestTexture({
                wrapS: "repeat",
                wrapT: "mirrored_repeat",
                minFilter: "nearest_mipmap_linear",
                magFilter: "nearest",
            });

            texture.init(gl);

            expect(gl.createTexture).toHaveBeenCalledTimes(1);
            expect(texture.handle).not.toBeNull();
            expect(gl.bindTexture).toHaveBeenNthCalledWith(1, texture.target, texture.handle);

            expect(gl.texParameteri).toHaveBeenCalledWith(texture.target, gl.TEXTURE_WRAP_S, gl.REPEAT);
            expect(gl.texParameteri).toHaveBeenCalledWith(texture.target, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
            expect(gl.texParameteri).toHaveBeenCalledWith(texture.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
            expect(gl.texParameteri).toHaveBeenCalledWith(texture.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            expect(texture.uploadCallCount).toBe(1);
            expect(texture.lastUploadGl).toBe(gl);

            expect(gl.bindTexture).toHaveBeenNthCalledWith(2, texture.target, null);
        });

        it("cleans up existing handle before re-allocating if init is called multiple times", () => {
            const texture = new TestTexture();
            texture.init(gl);
            const firstHandle = texture.handle;
            expect(firstHandle).not.toBeNull();

            texture.init(gl);
            const secondHandle = texture.handle;

            expect(gl.deleteTexture).toHaveBeenCalledWith(firstHandle);
            expect(secondHandle).not.toBeNull();
            expect(secondHandle).not.toBe(firstHandle);
            expect(gl.createTexture).toHaveBeenCalledTimes(2);
            expect(texture.uploadCallCount).toBe(2);
        });

        it("returns gracefully without error when gl.createTexture returns null", () => {
            vi.mocked(gl.createTexture).mockReturnValue(null as unknown as WebGLTexture);
            const texture = new TestTexture();

            texture.init(gl);

            expect(texture.handle).toBeNull();
            expect(texture.uploadCallCount).toBe(0);
            expect(gl.bindTexture).not.toHaveBeenCalled();
            expect(gl.texParameteri).not.toHaveBeenCalled();
        });
    });

    describe("bind and unbind", () => {
        it("bind: activates unit and binds texture handle to target using default unit Color0", () => {
            const texture = new TestTexture();
            texture.init(gl);

            texture.bind();

            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Color0);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(texture.target, texture.handle);
        });

        it("bind: activates specified texture unit when passed as TextureUnit enum or integer", () => {
            const texture = new TestTexture();
            texture.init(gl);

            texture.bind(TextureUnit.Normal);
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Normal);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(texture.target, texture.handle);

            texture.bind(5);
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + 5);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(texture.target, texture.handle);
        });

        it("bind: no-op if texture has not been initialized or handle is null", () => {
            const texture = new TestTexture();

            texture.bind(TextureUnit.Color0);

            expect(gl.activeTexture).not.toHaveBeenCalled();
            expect(gl.bindTexture).not.toHaveBeenCalled();
        });

        it("bind: no-op if gl context is missing or disposed", () => {
            const texture = new TestTexture();
            texture.init(gl);
            texture.dispose();

            texture.bind();

            expect(gl.activeTexture).not.toHaveBeenCalled();
        });

        it("unbind: activates unit and binds null to target using default unit Color0", () => {
            const texture = new TestTexture();
            texture.init(gl);

            texture.unbind();

            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Color0);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(texture.target, null);
        });

        it("unbind: activates specified texture unit when passed as TextureUnit enum or integer", () => {
            const texture = new TestTexture();
            texture.init(gl);

            texture.unbind(TextureUnit.ShadowMap);
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.ShadowMap);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(texture.target, null);

            texture.unbind(3);
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + 3);
            expect(gl.bindTexture).toHaveBeenLastCalledWith(texture.target, null);
        });

        it("unbind: no-op if gl context is null", () => {
            const texture = new TestTexture();

            texture.unbind(TextureUnit.Color0);

            expect(gl.activeTexture).not.toHaveBeenCalled();
            expect(gl.bindTexture).not.toHaveBeenCalled();
        });
    });

    describe("dispose and onDispose", () => {
        it("dispose: deletes WebGLTexture handle and nullifies handle and gl references", () => {
            const texture = new TestTexture();
            texture.init(gl);
            const rawHandle = texture.handle;
            expect(rawHandle).not.toBeNull();
            expect(texture.isValid).toBe(true);

            texture.dispose();

            expect(gl.deleteTexture).toHaveBeenCalledWith(rawHandle);
            expect(texture.handle).toBeNull();
            expect(texture.isValid).toBe(false);
            expect(texture.isDisposed).toBe(true);
        });

        it("dispose: does not call gl.deleteTexture if context is lost", () => {
            const texture = new TestTexture();
            texture.init(gl);

            vi.mocked(gl.isContextLost).mockReturnValue(true);
            texture.dispose();

            expect(gl.deleteTexture).not.toHaveBeenCalled();
            expect(texture.handle).toBeNull();
            expect(texture.isValid).toBe(false);
            expect(texture.isDisposed).toBe(true);
        });

        it("dispose: is safe to call when handle and gl are already null", () => {
            const texture = new TestTexture();

            expect(() => texture.dispose()).not.toThrow();
            expect(texture.handle).toBeNull();
            expect(gl.deleteTexture).not.toHaveBeenCalled();
            expect(texture.isDisposed).toBe(true);
        });

        it("dispose: sets isDisposed to true and notifies onDispose callbacks", () => {
            const texture = new TestTexture();
            texture.init(gl);
            const rawHandle = texture.handle;

            const callback1 = vi.fn();
            const callback2 = vi.fn();
            texture.onDispose(callback1);
            texture.onDispose(callback2);

            expect(texture.isDisposed).toBe(false);

            texture.dispose();

            expect(texture.isDisposed).toBe(true);
            expect(texture.handle).toBeNull();
            expect(gl.deleteTexture).toHaveBeenCalledWith(rawHandle);
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        it("dispose: is idempotent and does not invoke onDispose callbacks repeatedly", () => {
            const texture = new TestTexture();
            texture.init(gl);

            const callback = vi.fn();
            texture.onDispose(callback);

            texture.dispose();
            expect(callback).toHaveBeenCalledTimes(1);

            texture.dispose();
            expect(callback).toHaveBeenCalledTimes(1);
            expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
        });

        it("onDispose: returns an unsubscribe function that unregisters the callback", () => {
            const texture = new TestTexture();
            texture.init(gl);

            const callback = vi.fn();
            const unsubscribe = texture.onDispose(callback);
            unsubscribe();

            texture.dispose();
            expect(callback).not.toHaveBeenCalled();
        });

        it("onDispose: invokes callback immediately if the texture is already disposed", () => {
            const texture = new TestTexture();
            texture.dispose();
            expect(texture.isDisposed).toBe(true);

            const callback = vi.fn();
            texture.onDispose(callback);

            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe("context lost and restored", () => {
        it("onContextLost: clears handle and gl references without deleting GPU texture", () => {
            const texture = new TestTexture();
            texture.init(gl);
            expect(texture.handle).not.toBeNull();

            texture.onContextLost();

            expect(texture.handle).toBeNull();
            expect(gl.deleteTexture).not.toHaveBeenCalled();
        });

        it("onContextRestored: re-runs init with the restored gl context and allocates a new handle", () => {
            const texture = new TestTexture();
            texture.init(gl);
            const firstHandle = texture.handle;

            texture.onContextLost();
            expect(texture.handle).toBeNull();

            const restoredGl = createMockWebGL2Context();
            texture.onContextRestored(restoredGl);

            expect(restoredGl.createTexture).toHaveBeenCalledTimes(1);
            expect(texture.handle).not.toBeNull();
            expect(texture.handle).not.toBe(firstHandle);
            expect(texture.uploadCallCount).toBe(2);
        });
    });

    describe("updateFromSource", () => {
        it("executes without error on base class (safe default no-op for subclasses to override)", () => {
            const texture = new TestTexture();
            expect(() => texture.updateFromSource()).not.toThrow();
        });
    });

    describe("resolveWrapMode and resolveFilterMode", () => {
        describe("resolveWrapMode", () => {
            it("maps 'clamp_to_edge' to gl.CLAMP_TO_EDGE", () => {
                expect(resolveWrapMode(gl, "clamp_to_edge")).toBe(gl.CLAMP_TO_EDGE);
            });

            it("maps 'repeat' to gl.REPEAT", () => {
                expect(resolveWrapMode(gl, "repeat")).toBe(gl.REPEAT);
            });

            it("maps 'mirrored_repeat' to gl.MIRRORED_REPEAT", () => {
                expect(resolveWrapMode(gl, "mirrored_repeat")).toBe(gl.MIRRORED_REPEAT);
            });

            it("defaults to gl.CLAMP_TO_EDGE for unrecognized wrap strings", () => {
                expect(resolveWrapMode(gl, "invalid_wrap" as TextureWrap)).toBe(gl.CLAMP_TO_EDGE);
            });
        });

        describe("resolveFilterMode", () => {
            it("maps 'nearest' to gl.NEAREST", () => {
                expect(resolveFilterMode(gl, "nearest")).toBe(gl.NEAREST);
            });

            it("maps 'linear' to gl.LINEAR", () => {
                expect(resolveFilterMode(gl, "linear")).toBe(gl.LINEAR);
            });

            it("maps 'nearest_mipmap_nearest' to gl.NEAREST_MIPMAP_NEAREST", () => {
                expect(resolveFilterMode(gl, "nearest_mipmap_nearest")).toBe(gl.NEAREST_MIPMAP_NEAREST);
            });

            it("maps 'linear_mipmap_nearest' to gl.LINEAR_MIPMAP_NEAREST", () => {
                expect(resolveFilterMode(gl, "linear_mipmap_nearest")).toBe(gl.LINEAR_MIPMAP_NEAREST);
            });

            it("maps 'nearest_mipmap_linear' to gl.NEAREST_MIPMAP_LINEAR", () => {
                expect(resolveFilterMode(gl, "nearest_mipmap_linear")).toBe(gl.NEAREST_MIPMAP_LINEAR);
            });

            it("maps 'linear_mipmap_linear' to gl.LINEAR_MIPMAP_LINEAR", () => {
                expect(resolveFilterMode(gl, "linear_mipmap_linear")).toBe(gl.LINEAR_MIPMAP_LINEAR);
            });

            it("defaults to gl.LINEAR_MIPMAP_LINEAR for unrecognized filter strings", () => {
                expect(resolveFilterMode(gl, "invalid_filter" as TextureFilter)).toBe(gl.LINEAR_MIPMAP_LINEAR);
            });
        });
    });

    describe("TextureTarget enum", () => {
        it("maps all targets to exact WebGL2 constants", () => {
            expect(TextureTarget.Texture2D).toBe(WebGL2RenderingContext.TEXTURE_2D);
            expect(TextureTarget.CubeMap).toBe(WebGL2RenderingContext.TEXTURE_CUBE_MAP);
            expect(TextureTarget.Texture3D).toBe(WebGL2RenderingContext.TEXTURE_3D);
            expect(TextureTarget.Texture2DArray).toBe(WebGL2RenderingContext.TEXTURE_2D_ARRAY);
        });
    });
});
