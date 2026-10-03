import type { Mock } from "vitest";

/**
 * Interface representing a spy-wrapped WebGL2RenderingContext test fake.
 */
export interface IMockWebGL2RenderingContext {
    // Context State
    isContextLost: Mock<() => boolean>;
    viewport: Mock<(x: number, y: number, width: number, height: number) => void>;
    clearColor: Mock<(r: number, g: number, b: number, a: number) => void>;
    clear: Mock<(mask: number) => void>;
    enable: Mock<(cap: number) => void>;
    disable: Mock<(cap: number) => void>;
    depthFunc: Mock<(func: number) => void>;
    depthMask: Mock<(flag: boolean) => void>;
    cullFace: Mock<(mode: number) => void>;
    blendFunc: Mock<(sfactor: number, dfactor: number) => void>;
    blendEquation: Mock<(mode: number) => void>;
    getParameter: Mock<(pname: number) => unknown>;

    // Buffers & VAOs
    createBuffer: Mock<() => WebGLBuffer | null>;
    deleteBuffer: Mock<(buffer: WebGLBuffer | null) => void>;
    bindBuffer: Mock<(target: number, buffer: WebGLBuffer | null) => void>;
    bufferData: Mock<(target: number, data: BufferSource | null, usage: number) => void>;
    bufferSubData: Mock<(target: number, offset: number, data: BufferSource) => void>;
    createVertexArray: Mock<() => WebGLVertexArrayObject | null>;
    deleteVertexArray: Mock<(vao: WebGLVertexArrayObject | null) => void>;
    bindVertexArray: Mock<(vao: WebGLVertexArrayObject | null) => void>;
    enableVertexAttribArray: Mock<(index: number) => void>;
    vertexAttribPointer: Mock<
        (index: number, size: number, type: number, normalized: boolean, stride: number, offset: number) => void
    >;

    // Shaders & Programs
    createShader: Mock<(type: number) => WebGLShader | null>;
    deleteShader: Mock<(shader: WebGLShader | null) => void>;
    shaderSource: Mock<(shader: WebGLShader, source: string) => void>;
    compileShader: Mock<(shader: WebGLShader) => void>;
    getShaderParameter: Mock<(shader: WebGLShader, pname: number) => unknown>;
    getShaderInfoLog: Mock<(shader: WebGLShader) => string | null>;
    createProgram: Mock<() => WebGLProgram | null>;
    deleteProgram: Mock<(program: WebGLProgram | null) => void>;
    attachShader: Mock<(program: WebGLProgram, shader: WebGLShader) => void>;
    linkProgram: Mock<(program: WebGLProgram) => void>;
    getProgramParameter: Mock<(program: WebGLProgram, pname: number) => unknown>;
    getProgramInfoLog: Mock<(program: WebGLProgram) => string | null>;
    useProgram: Mock<(program: WebGLProgram | null) => void>;
    getUniformLocation: Mock<(program: WebGLProgram, name: string) => WebGLUniformLocation | null>;
    getAttribLocation: Mock<(program: WebGLProgram, name: string) => number>;

    // Uniform Setters
    uniform1i: Mock<(location: WebGLUniformLocation | null, v0: number) => void>;
    uniform1f: Mock<(location: WebGLUniformLocation | null, v0: number) => void>;
    uniform2fv: Mock<(location: WebGLUniformLocation | null, v: Float32Array | number[]) => void>;
    uniform3fv: Mock<(location: WebGLUniformLocation | null, v: Float32Array | number[]) => void>;
    uniform4fv: Mock<(location: WebGLUniformLocation | null, v: Float32Array | number[]) => void>;
    uniformMatrix3fv: Mock<(location: WebGLUniformLocation | null, transpose: boolean, data: Float32Array | number[]) => void>;
    uniformMatrix4fv: Mock<(location: WebGLUniformLocation | null, transpose: boolean, data: Float32Array | number[]) => void>;

    // Textures
    createTexture: Mock<() => WebGLTexture | null>;
    deleteTexture: Mock<(texture: WebGLTexture | null) => void>;
    bindTexture: Mock<(target: number, texture: WebGLTexture | null) => void>;
    activeTexture: Mock<(texture: number) => void>;
    texImage2D: Mock<(...args: unknown[]) => void>;
    texParameteri: Mock<(target: number, pname: number, param: number) => void>;
    generateMipmap: Mock<(target: number) => void>;

    // Draw Calls
    drawArrays: Mock<(mode: number, first: number, count: number) => void>;
    drawElements: Mock<(mode: number, count: number, type: number, offset: number) => void>;

    // Constants
    readonly ARRAY_BUFFER: number;
    readonly ELEMENT_ARRAY_BUFFER: number;
    readonly STATIC_DRAW: number;
    readonly DYNAMIC_DRAW: number;
    readonly STREAM_DRAW: number;
    readonly FLOAT: number;
    readonly UNSIGNED_SHORT: number;
    readonly UNSIGNED_INT: number;
    readonly UNSIGNED_BYTE: number;
    readonly TRIANGLES: number;
    readonly POINTS: number;
    readonly LINES: number;
    readonly LINE_STRIP: number;
    readonly TEXTURE_2D: number;
    readonly TEXTURE_CUBE_MAP: number;
    readonly TEXTURE0: number;
    readonly DEPTH_TEST: number;
    readonly BLEND: number;
    readonly CULL_FACE: number;
    readonly ONE: number;
    readonly ZERO: number;
    readonly SRC_ALPHA: number;
    readonly ONE_MINUS_SRC_ALPHA: number;
    readonly LESS: number;
    readonly LEQUAL: number;
    readonly EQUAL: number;
    readonly BACK: number;
    readonly FRONT: number;
    readonly MAX_TEXTURE_IMAGE_UNITS: number;
    readonly MAX_COMBINED_TEXTURE_IMAGE_UNITS: number;
}
