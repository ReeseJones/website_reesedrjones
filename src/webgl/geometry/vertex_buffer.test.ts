import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VertexBuffer } from "./vertex_buffer";
import type { VertexLayoutSpec } from "./vertex_layout_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { createMockContextManager } from "../../testing/mocks/mock_context_manager";

describe("VertexBuffer", () => {
    let gl: WebGL2RenderingContext;
    const testLayout: VertexLayoutSpec = {
        attributes: [
            { nameOrLocation: 0, description: "position", size: 3 },
            { nameOrLocation: 1, description: "uv", size: 2 },
        ],
    };

    beforeEach(() => {
        gl = createMockWebGL2Context();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor", () => {
        it("constructs successfully and stores layout and label", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout, "CustomVBO");

            expect(buffer.layout).toBe(testLayout);
            expect(buffer.label).toBe("CustomVBO");
            expect((buffer as any).contextManager).toBe(cm);
        });

        it("defaults label to 'VertexBuffer' if not provided", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);

            expect(buffer.label).toBe("VertexBuffer");
        });

        it("initializes usage to WebGL2RenderingContext.STATIC_DRAW", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);

            expect((buffer as any).usage).toBe(WebGL2RenderingContext.STATIC_DRAW);
        });

        it("creates VBO and VAO and configures VAO via configureVAO when context is active and not lost", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);

            expect(gl.createBuffer).toHaveBeenCalledTimes(1);
            expect(gl.createVertexArray).toHaveBeenCalledTimes(1);

            const vaoHandle = (buffer as any).vao;
            const vboHandle = (buffer as any).vbo;
            expect(vaoHandle).toBeTruthy();
            expect(vboHandle).toBeTruthy();

            expect(gl.bindVertexArray).toHaveBeenCalledWith(vaoHandle);
            expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, vboHandle);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(0);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(1);
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(0, 3, gl.FLOAT, false, 20, 0);
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(1, 2, gl.FLOAT, false, 20, 12);
            expect(gl.bindVertexArray).toHaveBeenLastCalledWith(null);
            expect(gl.bindBuffer).toHaveBeenLastCalledWith(gl.ARRAY_BUFFER, null);
        });

        it("skips GPU resource creation when context is not available or isContextLost() is true", () => {
            const cmNull = createMockContextManager(null as unknown as WebGL2RenderingContext);
            vi.mocked(cmNull.getContext).mockReturnValue(null);

            const bufferNull = new VertexBuffer(cmNull, testLayout);
            expect((bufferNull as any).vbo).toBeNull();
            expect((bufferNull as any).vao).toBeNull();
            expect(bufferNull.isValid).toBe(false);

            const glLost = createMockWebGL2Context();
            vi.mocked(glLost.isContextLost).mockReturnValue(true);
            const cmLost = createMockContextManager(glLost);

            const bufferLost = new VertexBuffer(cmLost, testLayout);
            expect(glLost.createBuffer).not.toHaveBeenCalled();
            expect(glLost.createVertexArray).not.toHaveBeenCalled();
            expect((bufferLost as any).vbo).toBeNull();
            expect((bufferLost as any).vao).toBeNull();
            expect(bufferLost.isValid).toBe(false);
        });
    });

    describe(".isValid", () => {
        it("returns true when VBO and VAO are created and not disposed", () => {
            const cm = createMockContextManager(gl);
            const validBuffer = new VertexBuffer(cm, testLayout);
            expect(validBuffer.isValid).toBe(true);
        });

        it("returns false when context is null, lost, or after disposal", () => {
            const cmNull = createMockContextManager(null as unknown as WebGL2RenderingContext);
            vi.mocked(cmNull.getContext).mockReturnValue(null);
            const invalidBuffer = new VertexBuffer(cmNull, testLayout);
            expect(invalidBuffer.isValid).toBe(false);

            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            buffer.dispose();
            expect(buffer.isValid).toBe(false);
        });
    });

    describe(".isDisposed", () => {
        it("starts false and becomes true after dispose()", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            expect(buffer.isDisposed).toBe(false);

            buffer.dispose();
            expect(buffer.isDisposed).toBe(true);
        });
    });

    describe(".init()", () => {
        it("allocates GPU resources if not already allocated", () => {
            const cm = createMockContextManager(null as unknown as WebGL2RenderingContext);
            vi.mocked(cm.getContext).mockReturnValue(null);

            const buffer = new VertexBuffer(cm, testLayout);
            expect(buffer.isValid).toBe(false);

            vi.mocked(cm.getContext).mockReturnValue(gl);
            buffer.init();

            expect(gl.createBuffer).toHaveBeenCalledTimes(1);
            expect(gl.createVertexArray).toHaveBeenCalledTimes(1);
            expect(buffer.isValid).toBe(true);
        });

        it("no-op if GPU resources already allocated", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            expect(gl.createBuffer).toHaveBeenCalledTimes(1);
            expect(gl.createVertexArray).toHaveBeenCalledTimes(1);

            buffer.init();
            expect(gl.createBuffer).toHaveBeenCalledTimes(1);
            expect(gl.createVertexArray).toHaveBeenCalledTimes(1);
        });

        it("resets usage to gl.STATIC_DRAW if context is available", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            (buffer as any).usage = gl.DYNAMIC_DRAW;

            buffer.init();
            expect((buffer as any).usage).toBe(gl.STATIC_DRAW);
        });
    });

    describe(".setData()", () => {
        it("stores data in cpuData cache", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            const data = new Float32Array([1, 2, 3, 4, 5]);

            buffer.setData(data);
            expect((buffer as any).cpuData).toBe(data);
        });

        it("updates usage if provided (e.g. gl.DYNAMIC_DRAW)", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            const data = new Float32Array([1, 2, 3]);

            buffer.setData(data, gl.DYNAMIC_DRAW);
            expect((buffer as any).usage).toBe(gl.DYNAMIC_DRAW);
        });

        it("uploads data to GPU: binds VBO, calls gl.bufferData(ARRAY_BUFFER, data, usage), unbinds VBO", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            const data = new Float32Array([10, 20, 30]);

            const callOrder: string[] = [];
            vi.mocked(gl.bindBuffer).mockImplementation((_target, b) => {
                callOrder.push(`bindBuffer:${b ? "vbo" : "null"}`);
            });
            vi.mocked(gl.bufferData).mockImplementation(() => {
                callOrder.push("bufferData");
            });

            buffer.setData(data, gl.STREAM_DRAW);

            expect(callOrder).toEqual(["bindBuffer:vbo", "bufferData", "bindBuffer:null"]);
            expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
        });

        it("skips GPU upload when context is lost or VBO is null, while safely caching cpuData", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            vi.mocked(gl.isContextLost).mockReturnValue(true);
            vi.mocked(gl.bufferData).mockClear();

            const dataA = new Float32Array([1, 2, 3]);
            buffer.setData(dataA);

            expect(gl.bufferData).not.toHaveBeenCalled();
            expect((buffer as any).cpuData).toBe(dataA);

            const cmNull = createMockContextManager(null as unknown as WebGL2RenderingContext);
            vi.mocked(cmNull.getContext).mockReturnValue(null);
            const bufferNull = new VertexBuffer(cmNull, testLayout);

            const dataB = new Float32Array([4, 5, 6]);
            bufferNull.setData(dataB);

            expect((bufferNull as any).cpuData).toBe(dataB);
        });
    });

    describe(".bind() and .unbind()", () => {
        it("bind calls gl.bindVertexArray with vao handle", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            const vaoHandle = (buffer as any).vao;

            vi.mocked(gl.bindVertexArray).mockClear();
            buffer.bind();

            expect(gl.bindVertexArray).toHaveBeenCalledTimes(1);
            expect(gl.bindVertexArray).toHaveBeenCalledWith(vaoHandle);
        });

        it("bind skips call if context is lost or vao is null", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            vi.mocked(gl.isContextLost).mockReturnValue(true);
            vi.mocked(gl.bindVertexArray).mockClear();

            buffer.bind();
            expect(gl.bindVertexArray).not.toHaveBeenCalled();

            const cmNull = createMockContextManager(null as unknown as WebGL2RenderingContext);
            vi.mocked(cmNull.getContext).mockReturnValue(null);
            const bufferNull = new VertexBuffer(cmNull, testLayout);

            bufferNull.bind();
            expect(gl.bindVertexArray).not.toHaveBeenCalled();
        });

        it("unbind calls gl.bindVertexArray(null)", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);

            vi.mocked(gl.bindVertexArray).mockClear();
            buffer.unbind();

            expect(gl.bindVertexArray).toHaveBeenCalledTimes(1);
            expect(gl.bindVertexArray).toHaveBeenCalledWith(null);
        });

        it("unbind skips call if context is lost", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);

            vi.mocked(gl.isContextLost).mockReturnValue(true);
            vi.mocked(gl.bindVertexArray).mockClear();

            buffer.unbind();
            expect(gl.bindVertexArray).not.toHaveBeenCalled();
        });
    });

    describe(".onContextLost()", () => {
        it("invalidates vbo and vao handles without calling driver delete methods", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            expect(buffer.isValid).toBe(true);

            buffer.onContextLost();

            expect(buffer.isValid).toBe(false);
            expect((buffer as any).vbo).toBeNull();
            expect((buffer as any).vao).toBeNull();
            expect(gl.deleteBuffer).not.toHaveBeenCalled();
            expect(gl.deleteVertexArray).not.toHaveBeenCalled();
        });
    });

    describe(".onContextRestored()", () => {
        it("recreates GPU handles and re-uploads cached cpuData", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            const data = new Float32Array([1, 2, 3, 4]);
            buffer.setData(data, gl.DYNAMIC_DRAW);

            buffer.onContextLost();
            expect(buffer.isValid).toBe(false);

            const restoredGl = createMockWebGL2Context();
            vi.mocked(restoredGl.bufferData).mockClear();

            buffer.onContextRestored(restoredGl);

            expect(buffer.isValid).toBe(true);
            expect(restoredGl.createBuffer).toHaveBeenCalledTimes(1);
            expect(restoredGl.createVertexArray).toHaveBeenCalledTimes(1);
            expect(restoredGl.bufferData).toHaveBeenCalledWith(
                restoredGl.ARRAY_BUFFER,
                data,
                restoredGl.DYNAMIC_DRAW
            );
        });

        it("does nothing if buffer is already disposed", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            buffer.dispose();

            const restoredGl = createMockWebGL2Context();
            buffer.onContextRestored(restoredGl);

            expect(buffer.isValid).toBe(false);
            expect(restoredGl.createBuffer).not.toHaveBeenCalled();
        });
    });

    describe(".onDispose()", () => {
        it("registers callback invoked when dispose() is called", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            const callback = vi.fn();

            buffer.onDispose(callback);
            expect(callback).not.toHaveBeenCalled();

            buffer.dispose();
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it("returns an unsubscribe function that unregisters the callback", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            const callback = vi.fn();

            const unsubscribe = buffer.onDispose(callback);
            unsubscribe();

            buffer.dispose();
            expect(callback).not.toHaveBeenCalled();
        });

        it("invokes callback immediately if already disposed", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            buffer.dispose();

            const callback = vi.fn();
            buffer.onDispose(callback);
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe(".dispose()", () => {
        it("frees GPU buffer and VAO handles and unbinds from context", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            const vbo = (buffer as any).vbo;
            const vao = (buffer as any).vao;

            buffer.dispose();

            expect(gl.bindVertexArray).toHaveBeenCalledWith(null);
            expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, null);
            expect(gl.deleteBuffer).toHaveBeenCalledWith(vbo);
            expect(gl.deleteVertexArray).toHaveBeenCalledWith(vao);
            expect((buffer as any).vbo).toBeNull();
            expect((buffer as any).vao).toBeNull();
            expect((buffer as any).cpuData).toBeNull();
            expect(buffer.isValid).toBe(false);
            expect(buffer.isDisposed).toBe(true);
        });

        it("does not call delete methods if gl.isContextLost() is true", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);

            vi.mocked(gl.isContextLost).mockReturnValue(true);
            buffer.dispose();

            expect(gl.deleteBuffer).not.toHaveBeenCalled();
            expect(gl.deleteVertexArray).not.toHaveBeenCalled();
            expect(buffer.isDisposed).toBe(true);
        });

        it("is idempotent: calling dispose multiple times does not throw or delete twice", () => {
            const cm = createMockContextManager(gl);
            const buffer = new VertexBuffer(cm, testLayout);
            const callback = vi.fn();
            buffer.onDispose(callback);

            buffer.dispose();
            expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
            expect(gl.deleteVertexArray).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledTimes(1);

            expect(() => buffer.dispose()).not.toThrow();
            expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
            expect(gl.deleteVertexArray).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(buffer.isValid).toBe(false);
        });
    });
});
