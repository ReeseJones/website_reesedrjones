import type { ShaderProgram } from "./shader_program";

export interface ShaderEntry<TUniforms extends object = Record<string, unknown>> {
    shader: ShaderProgram<TUniforms>;
    refCount: number;
}
