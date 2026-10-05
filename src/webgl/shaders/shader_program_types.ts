import type { IWebGLResource } from "../core/resource_types";

export type UniformValue =
    | number
    | boolean
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | Float32Array
    | number[];

export type UniformRecord = Record<string, UniformValue>;

export type UniformType =
    | "float"
    | "int"
    | "vec2"
    | "vec3"
    | "vec4"
    | "mat3"
    | "mat4";

export interface ShaderProgramOptions {
    /** Vertex shader GLSL source code */
    vertSource: string;
    /** Fragment shader GLSL source code */
    fragSource: string;
    /** Debug label used in console log diagnostic messages */
    label?: string;
    /** Explicit sampler uniform name to TextureUnit/integer mapping overrides */
    samplers?: Record<string, number>;
}

export interface CachedUniform {
    type: UniformType;
    value: number | number[] | Float32Array;
}

/**
 * Universal interface for managed GPU Shader Program wrappers in WebGL2.
 */
export interface IShaderProgram<TUniforms extends object = Record<string, unknown>>
    extends IWebGLResource {
    readonly label: string;
    readonly vertSource: string;
    readonly fragSource: string;
    readonly isValid: boolean;

    /** Gets the underlying WebGLProgram GPU handle, or null if context lost or disposed */
    getProgram(): WebGLProgram | null;

    /** Batch uploads a typed dictionary of uniforms with binding validation */
    setUniforms(uniforms: Partial<TUniforms>): void;

    /** Uniform upload setters with caching */
    setFloat(name: string, value: number): void;
    setInt(name: string, value: number): void;
    setVec2(name: string, x: number, y: number): void;
    setVec3(name: string, xOrArray: number | [number, number, number] | Float32Array, y?: number, z?: number): void;
    setVec4(name: string, xOrArray: number | [number, number, number, number] | Float32Array, y?: number, z?: number, w?: number): void;
    setMat3(name: string, data: Float32Array | number[]): void;
    setMat4(name: string, data: Float32Array | number[]): void;

    /** Queries cached uniform location */
    getUniformLocation(name: string): WebGLUniformLocation | null;

    /** WebGL context lost lifecycle hook */
    onContextLost(): void;

    /** WebGL context restored lifecycle hook */
    onContextRestored(gl: WebGL2RenderingContext): void;

    /** Deterministic disposal: frees GPU program handle and notifies listeners */
    dispose(): void;
}
