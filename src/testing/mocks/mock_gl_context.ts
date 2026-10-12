import { vi } from "vitest";
 
/**
 * Creates a fully spy-wrapped WebGL2RenderingContext test fake for headless unit tests.
 */
export function createMockWebGL2Context(): WebGL2RenderingContext {
    let handleId = 0;

    const mock = {
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
        vertexAttribDivisor: vi.fn(),

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
        detachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn((_p, pname) => {
            if (pname === WebGL2RenderingContext.LINK_STATUS) return true;
            if (pname === WebGL2RenderingContext.ACTIVE_UNIFORMS) return 0;
            return true;
        }),
        getProgramInfoLog: vi.fn(() => null),
        getActiveUniform: vi.fn(() => null),
        useProgram: vi.fn(),
        getUniformLocation: vi.fn((_p, name) => ({ __brand: "WebGLUniformLocation", name } as unknown as WebGLUniformLocation)),
        getAttribLocation: vi.fn((_p, _name) => 0),

        // Uniform Setters
        uniform1i: vi.fn(),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform2fv: vi.fn(),
        uniform3fv: vi.fn(),
        uniform4f: vi.fn(),
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
        pixelStorei: vi.fn(),
        generateMipmap: vi.fn(),

        // Draw Calls
        drawArrays: vi.fn(),
        drawElements: vi.fn(),

        // Constants
        VERTEX_SHADER: WebGL2RenderingContext.VERTEX_SHADER,
        FRAGMENT_SHADER: WebGL2RenderingContext.FRAGMENT_SHADER,
        COMPILE_STATUS: WebGL2RenderingContext.COMPILE_STATUS,
        LINK_STATUS: WebGL2RenderingContext.LINK_STATUS,
        ACTIVE_UNIFORMS: WebGL2RenderingContext.ACTIVE_UNIFORMS,
        SAMPLER_2D: WebGL2RenderingContext.SAMPLER_2D,
        SAMPLER_CUBE: WebGL2RenderingContext.SAMPLER_CUBE,
        SAMPLER_2D_SHADOW: WebGL2RenderingContext.SAMPLER_2D_SHADOW,
        SAMPLER_2D_ARRAY: WebGL2RenderingContext.SAMPLER_2D_ARRAY,
        SAMPLER_3D: WebGL2RenderingContext.SAMPLER_3D,
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
        RGBA: WebGL2RenderingContext.RGBA,
        RGB: WebGL2RenderingContext.RGB,
        TEXTURE_MIN_FILTER: WebGL2RenderingContext.TEXTURE_MIN_FILTER,
        TEXTURE_MAG_FILTER: WebGL2RenderingContext.TEXTURE_MAG_FILTER,
        TEXTURE_WRAP_S: WebGL2RenderingContext.TEXTURE_WRAP_S,
        TEXTURE_WRAP_T: WebGL2RenderingContext.TEXTURE_WRAP_T,
        UNPACK_FLIP_Y_WEBGL: WebGL2RenderingContext.UNPACK_FLIP_Y_WEBGL,
        NEAREST: WebGL2RenderingContext.NEAREST,
        LINEAR: WebGL2RenderingContext.LINEAR,
        CLAMP_TO_EDGE: WebGL2RenderingContext.CLAMP_TO_EDGE,
        REPEAT: WebGL2RenderingContext.REPEAT,
        MIRRORED_REPEAT: WebGL2RenderingContext.MIRRORED_REPEAT,
        NEAREST_MIPMAP_NEAREST: WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST,
        LINEAR_MIPMAP_NEAREST: WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST,
        NEAREST_MIPMAP_LINEAR: WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR,
        LINEAR_MIPMAP_LINEAR: WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR,
        TEXTURE_CUBE_MAP_POSITIVE_X: WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X,
        TEXTURE_CUBE_MAP_NEGATIVE_X: WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
        TEXTURE_CUBE_MAP_POSITIVE_Y: WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
        TEXTURE_CUBE_MAP_NEGATIVE_Y: WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        TEXTURE_CUBE_MAP_POSITIVE_Z: WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,
        TEXTURE_CUBE_MAP_NEGATIVE_Z: WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
        MAX_TEXTURE_IMAGE_UNITS: WebGL2RenderingContext.MAX_TEXTURE_IMAGE_UNITS,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS,
    };

    return mock as unknown as WebGL2RenderingContext;
}
