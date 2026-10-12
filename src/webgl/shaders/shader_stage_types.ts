import type { IWebGLResource } from "../core/resource_types";
import type { VertexLayoutSpec } from "../geometry/vertex_layout_types";
import type {
    ShaderStageType,
    VertexStageType,
    FragmentStageType,
} from "./shader_stage_constants";

export type {
    ShaderStageType,
    VertexStageType,
    FragmentStageType,
};

export interface ShaderStageOptions {
    /** GLSL ES 3.00 source code */
    source: string;
    /** Debug label used in diagnostics */
    label?: string;
}

/**
 * Common contract for a single compiled GLSL stage wrapping one WebGLShader.
 */
export interface IShaderStage<TStage extends ShaderStageType = ShaderStageType>
    extends IWebGLResource {
    readonly stage: TStage;
    /** Retained after dispose so dependent programs can relink after context restoration. */
    readonly source: string;
    /** Driver compile log from the most recent failed compile, else null */
    readonly infoLog: string | null;
    readonly isDisposed: boolean;

    /** Native handle, or null if compile failed, context lost, or disposed */
    getShader(): WebGLShader | null;
    onDispose(callback: () => void): () => void;
}

export interface IVertexShader extends IShaderStage<VertexStageType> {
    /** Attribute layout lazily parsed from layout(location = N) in declarations */
    readonly vertexLayout: VertexLayoutSpec;
}

export interface IFragmentShader extends IShaderStage<FragmentStageType> {}
