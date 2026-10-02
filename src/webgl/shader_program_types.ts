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
    | "mat4";


export interface ShaderProgramOptions {
    /** Vertex shader GLSL source code */
    vertSource: string;
    /** Fragment shader GLSL source code */
    fragSource: string;
    /** Debug label used in console log diagnostic messages */
    label?: string;
}

export interface CachedUniform {
    type: UniformType;
    value: number | number[] | Float32Array;
}
