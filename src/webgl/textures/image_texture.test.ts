import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ImageTexture } from "./image_texture";
import { TextureTarget, TextureUnit } from "./texture_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";

describe("ImageTexture", () => {
    let gl: WebGL2RenderingContext;

    beforeEach(() => {
        gl = createMockWebGL2Context();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor and options", () => {
        it("initializes with default options and 2D target when constructed with no arguments", () => {
            const texture = new ImageTexture();

            expect(texture.target).toBe(TextureTarget.Texture2D);
            expect(texture.label).toBe("ImageTexture");
            expect(texture.options.generateMipmaps).toBe(false);
            expect(texture.options.minFilter).toBe("linear");
            expect(texture.options.magFilter).toBe("linear");
            expect(texture.width).toBe(1);
            expect(texture.height).toBe(1);
            expect(texture.isLoaded).toBe(false);
            expect(texture.isValid).toBe(false);
            expect(texture.isDisposed).toBe(false);
        });

        it("defaults minFilter to linear_mipmap_linear when generateMipmaps is true", () => {
            const texture = new ImageTexture(undefined, { generateMipmaps: true });
            expect(texture.options.generateMipmaps).toBe(true);
            expect(texture.options.minFilter).toBe("linear_mipmap_linear");
        });

        it("initializes with URL string as first argument and custom options as second argument", () => {
            const texture = new ImageTexture("assets/test.png", {
                label: "CustomImage",
                wrapS: "repeat",
                wrapT: "repeat",
                generateMipmaps: false,
            });

            expect(texture.label).toBe("CustomImage");
            expect(texture.options.wrapS).toBe("repeat");
            expect(texture.options.wrapT).toBe("repeat");
            expect(texture.options.generateMipmaps).toBe(false);
            expect(texture.target).toBe(TextureTarget.Texture2D);
        });

        it("initializes directly from an HTMLCanvasElement source", () => {
            const mockCanvas = { width: 128, height: 64 } as unknown as HTMLCanvasElement;
            const texture = new ImageTexture(mockCanvas, { label: "CanvasTexture" });

            expect(texture.label).toBe("CanvasTexture");
            expect(texture.isLoaded).toBe(true);
        });
    });

    describe("init and fallback", () => {
        it("uploads 1x1 fallback pixel and applies NEAREST sampler when image is not yet loaded", () => {
            const texture = new ImageTexture("assets/deferred.png");
            texture.init(gl);

            expect(gl.createTexture).toHaveBeenCalledTimes(1);
            expect(texture.handle).not.toBeNull();
            expect(gl.bindTexture).toHaveBeenCalledWith(TextureTarget.Texture2D, texture.handle);
            expect(gl.texImage2D).toHaveBeenCalledWith(
                TextureTarget.Texture2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                expect.any(Uint8Array)
            );
            expect(gl.texParameteri).toHaveBeenCalledWith(TextureTarget.Texture2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            expect(gl.texParameteri).toHaveBeenCalledWith(TextureTarget.Texture2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        });

        it("uploads source immediately during init if source is already decoded canvas", () => {
            const mockCanvas = { width: 256, height: 128 } as unknown as HTMLCanvasElement;
            const texture = new ImageTexture(mockCanvas);
            texture.init(gl);

            expect(gl.texImage2D).toHaveBeenCalledWith(
                TextureTarget.Texture2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                mockCanvas
            );
            expect(texture.width).toBe(256);
            expect(texture.height).toBe(128);
            expect(gl.generateMipmap).not.toHaveBeenCalled();
        });

        it("generates mipmaps when generateMipmaps option is explicitly true", () => {
            const mockCanvas = { width: 256, height: 128 } as unknown as HTMLCanvasElement;
            const texture = new ImageTexture(mockCanvas, { generateMipmaps: true });
            texture.init(gl);

            expect(gl.generateMipmap).toHaveBeenCalledWith(TextureTarget.Texture2D);
        });
    });

    describe("bind and unbind", () => {
        it("binds to Color0 by default and unbinds cleanly", () => {
            const texture = new ImageTexture();
            texture.init(gl);

            texture.bind();
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Color0);
            expect(gl.bindTexture).toHaveBeenCalledWith(TextureTarget.Texture2D, texture.handle);

            texture.unbind();
            expect(gl.bindTexture).toHaveBeenCalledWith(TextureTarget.Texture2D, null);
        });

        it("binds to a specific TextureUnit slot", () => {
            const texture = new ImageTexture();
            texture.init(gl);

            texture.bind(TextureUnit.Normal);
            expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + TextureUnit.Normal);
            expect(gl.bindTexture).toHaveBeenCalledWith(TextureTarget.Texture2D, texture.handle);
        });
    });

    describe("updateFromSource", () => {
        it("re-uploads pixel data from canvas source when updateFromSource is invoked", () => {
            const mockCanvas = { width: 64, height: 64 } as unknown as HTMLCanvasElement;
            const texture = new ImageTexture(mockCanvas);
            texture.init(gl);
            vi.mocked(gl.texImage2D).mockClear();

            texture.updateFromSource();

            expect(gl.texImage2D).toHaveBeenCalledWith(
                TextureTarget.Texture2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                mockCanvas
            );
        });

        it("no-ops if texture is not initialized or gl is lost", () => {
            const mockCanvas = { width: 64, height: 64 } as unknown as HTMLCanvasElement;
            const texture = new ImageTexture(mockCanvas);

            expect(() => texture.updateFromSource()).not.toThrow();
            expect(gl.texImage2D).not.toHaveBeenCalled();
        });
    });

    describe("onLoad notifications", () => {
        it("invokes constructor onLoad option immediately if source is already decoded canvas", () => {
            const onLoadMock = vi.fn();
            const mockCanvas = { width: 64, height: 64 } as unknown as HTMLCanvasElement;
            new ImageTexture(mockCanvas, { onLoad: onLoadMock });

            expect(onLoadMock).toHaveBeenCalledTimes(1);
        });

        it("invokes onLoad listener immediately if texture is already loaded", () => {
            const mockCanvas = { width: 64, height: 64 } as unknown as HTMLCanvasElement;
            const texture = new ImageTexture(mockCanvas);
            const listener = vi.fn();

            const unsubscribe = texture.onLoad(listener);
            expect(listener).toHaveBeenCalledTimes(1);
            expect(typeof unsubscribe).toBe("function");
        });

        it("registers onLoad listener and triggers it upon async image decode", async () => {
            // Mock global Image if not present or spy on decode
            let triggerDecodeResolve: () => void = () => {};
            const mockDecode = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
                triggerDecodeResolve = resolve;
            }));

            const originalImage = globalThis.Image;
            class MockImage {
                public crossOrigin = "";
                public src = "";
                public decode = mockDecode;
                public width = 128;
                public height = 128;
            }
            // @ts-expect-error Mocking global image
            globalThis.Image = MockImage;

            try {
                const listener = vi.fn();
                const optionListener = vi.fn();
                const texture = new ImageTexture("test-url.png", { onLoad: optionListener });
                const unsubscribe = texture.onLoad(listener);

                expect(listener).not.toHaveBeenCalled();
                expect(optionListener).not.toHaveBeenCalled();

                // Trigger decode completion
                triggerDecodeResolve();
                await Promise.resolve(); // flush microtask

                expect(listener).toHaveBeenCalledTimes(1);
                expect(optionListener).toHaveBeenCalledTimes(1);

                unsubscribe();
            } finally {
                globalThis.Image = originalImage;
            }
        });

        it("allows unsubscribing before async load completes", async () => {
            let triggerDecodeResolve: () => void = () => {};
            const mockDecode = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
                triggerDecodeResolve = resolve;
            }));

            const originalImage = globalThis.Image;
            class MockImage {
                public crossOrigin = "";
                public src = "";
                public decode = mockDecode;
                public width = 128;
                public height = 128;
            }
            // @ts-expect-error Mocking global image
            globalThis.Image = MockImage;

            try {
                const listener = vi.fn();
                const texture = new ImageTexture("test-url.png");
                const unsubscribe = texture.onLoad(listener);

                unsubscribe();

                triggerDecodeResolve();
                await Promise.resolve();

                expect(listener).not.toHaveBeenCalled();
            } finally {
                globalThis.Image = originalImage;
            }
        });

        it("fires onUpdate listeners upon async image decode and GPU upload", async () => {
            let triggerDecodeResolve: () => void = () => {};
            const mockDecode = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
                triggerDecodeResolve = resolve;
            }));

            const originalImage = globalThis.Image;
            class MockImage {
                public crossOrigin = "";
                public src = "";
                public decode = mockDecode;
                public width = 128;
                public height = 128;
            }
            // @ts-expect-error Mocking global image
            globalThis.Image = MockImage;

            try {
                const updateListener = vi.fn();
                const texture = new ImageTexture("test-url.png");
                texture.init(gl);
                texture.onUpdate(updateListener);

                expect(updateListener).not.toHaveBeenCalled();

                triggerDecodeResolve();
                await Promise.resolve();

                expect(updateListener).toHaveBeenCalledTimes(1);
            } finally {
                globalThis.Image = originalImage;
            }
        });
    });

    describe("dispose", () => {
        it("releases GPU texture handle and marks loaded as false", () => {
            const mockCanvas = { width: 32, height: 32 } as unknown as HTMLCanvasElement;
            const texture = new ImageTexture(mockCanvas);
            texture.init(gl);

            expect(texture.isLoaded).toBe(true);
            expect(texture.isValid).toBe(true);

            texture.dispose();

            expect(texture.handle).toBeNull();
            expect(texture.isLoaded).toBe(false);
            expect(texture.isDisposed).toBe(true);
            expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
        });
    });

    describe("static factory methods", () => {
        it("fromUrl: constructs a new ImageTexture from URL string", () => {
            const texture = ImageTexture.fromUrl("textures/diffuse.png", { label: "Diffuse" });
            expect(texture).toBeInstanceOf(ImageTexture);
            expect(texture.label).toBe("Diffuse");
        });

        it("fromImage: constructs a new ImageTexture from HTMLImageElement", () => {
            const img = { width: 100, height: 100, src: "data:image/png;base64," } as unknown as HTMLImageElement;
            const texture = ImageTexture.fromImage(img);
            expect(texture).toBeInstanceOf(ImageTexture);
            expect(texture.isLoaded).toBe(true);
        });

        it("fromCanvas: constructs a new ImageTexture from HTMLCanvasElement", () => {
            const canvas = { width: 50, height: 50 } as unknown as HTMLCanvasElement;
            const texture = ImageTexture.fromCanvas(canvas);
            expect(texture).toBeInstanceOf(ImageTexture);
            expect(texture.isLoaded).toBe(true);
        });
    });
});
