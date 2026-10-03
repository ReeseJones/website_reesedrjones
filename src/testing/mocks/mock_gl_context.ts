import { vi } from "vitest";
import type { IMockWebGL2RenderingContext } from "./mock_gl_context_types";

/**
 * Creates a fully spy-wrapped WebGL2RenderingContext test fake for headless unit tests.
 */
export function createMockWebGL2Context(): WebGL2RenderingContext & IMockWebGL2RenderingContext {
    let handleId = 0;

    const mock: IMockWebGL2RenderingContext = {
        // Context State
        isContextLost: vi.fn(() => false),
        viewport: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        depthFunc: vi.fn(),
        depthMask: vi.fn(),
        cullFace: vi.fn(),
        blendFunc: vi.fn(),
        blendEquation: vi.fn(),
        getParameter: vi.fn((pname: number) => {
            if (pname === WebGL2RenderingContext.MAX_TEXTURE_IMAGE_UNITS) return 16;
            if (pname === WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS) return 32;
            return 0;
        }),

        // Buffers & VAOs
        createBuffer: vi.fn(() => ({ __brand: "WebGLBuffer", id: ++handleId } as unknown as WebGLBuffer)),
        deleteBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        bufferSubData: vi.fn(),
        createVertexArray: vi.fn(
            () => ({ __brand: "WebGLVertexArrayObject", id: ++handleId } as unknown as WebGLVertexArrayObject)
        ),
        deleteVertexArray: vi.fn(),
        bindVertexArray: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),

        // Shaders & Programs
        createShader: vi.fn(() => ({ __brand: "WebGLShader", id: ++handleId } as unknown as WebGLShader)),
        deleteShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        getShaderInfoLog: vi.fn(() => null),
        createProgram: vi.fn(() => ({ __brand: "WebGLProgram", id: ++handleId } as unknown as WebGLProgram)),
        deleteProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => true),
        getProgramInfoLog: vi.fn(() => null),
        useProgram: vi.fn(),
        getUniformLocation: vi.fn((_p, name) => ({ __brand: "WebGLUniformLocation", name } as unknown as WebGLUniformLocation)),
        getAttribLocation: vi.fn((_p, _name) => 0),

        // Uniform Setters
        uniform1i: vi.fn(),
        uniform1f: vi.fn(),
        uniform2fv: vi.fn(),
        uniform3fv: vi.fn(),
        uniform4fv: vi.fn(),
        uniformMatrix3fv: vi.fn(),
        uniformMatrix4fv: vi.fn(),

        // Textures
        createTexture: vi.fn(() => ({ __brand: "WebGLTexture", id: ++handleId } as unknown as WebGLTexture)),
        deleteTexture: vi.fn(),
        bindTexture: vi.fn(),
        activeTexture: vi.fn(),
        texImage2D: vi.fn(),
        texParameteri: vi.fn(),
        generateMipmap: vi.fn(),

        // Draw Calls
        drawArrays: vi.fn(),
        drawElements: vi.fn(),

        // Constants
        ARRAY_BUFFER: WebGL2RenderingContext.ARRAY_BUFFER,
        ELEMENT_ARRAY_BUFFER: WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER,
        STATIC_DRAW: WebGL2RenderingContext.STATIC_DRAW,
        DYNAMIC_DRAW: WebGL2RenderingContext.DYNAMIC_DRAW,
        STREAM_DRAW: WebGL2RenderingContext.STREAM_DRAW,
        FLOAT: WebGL2RenderingContext.FLOAT,
        UNSIGNED_SHORT: WebGL2RenderingContext.UNSIGNED_SHORT,
        UNSIGNED_INT: WebGL2RenderingContext.UNSIGNED_INT,
        UNSIGNED_BYTE: WebGL2RenderingContext.UNSIGNED_BYTE,
        TRIANGLES: WebGL2RenderingContext.TRIANGLES,
        POINTS: WebGL2RenderingContext.POINTS,
        LINES: WebGL2RenderingContext.LINES,
        LINE_STRIP: WebGL2RenderingContext.LINE_STRIP,
        TEXTURE_2D: WebGL2RenderingContext.TEXTURE_2D,
        TEXTURE_CUBE_MAP: WebGL2RenderingContext.TEXTURE_CUBE_MAP,
        TEXTURE0: WebGL2RenderingContext.TEXTURE0,
        DEPTH_TEST: WebGL2RenderingContext.DEPTH_TEST,
        BLEND: WebGL2RenderingContext.BLEND,
        CULL_FACE: WebGL2RenderingContext.CULL_FACE,
        ONE: WebGL2RenderingContext.ONE,
        ZERO: WebGL2RenderingContext.ZERO,
        SRC_ALPHA: WebGL2RenderingContext.SRC_ALPHA,
        ONE_MINUS_SRC_ALPHA: WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA,
        LESS: WebGL2RenderingContext.LESS,
        LEQUAL: WebGL2RenderingContext.LEQUAL,
        EQUAL: WebGL2RenderingContext.EQUAL,
        BACK: WebGL2RenderingContext.BACK,
        FRONT: WebGL2RenderingContext.FRONT,
        MAX_TEXTURE_IMAGE_UNITS: WebGL2RenderingContext.MAX_TEXTURE_IMAGE_UNITS,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS,
    };

    return mock as unknown as WebGL2RenderingContext & IMockWebGL2RenderingContext;
}
