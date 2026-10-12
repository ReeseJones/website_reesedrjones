import type { IVertexShader, ShaderStageOptions } from "./shader_stage_types";
import type { VertexStageType } from "./shader_stage_constants";
import type { IWebGLContextManager } from "../core/context_manager_types";
import type { VertexLayoutSpec } from "../geometry/vertex_layout_types";
import { ShaderStageType } from "./shader_stage_constants";
import { ShaderStage } from "./shader_stage";
import { parseVertexLayoutFromGLSL } from "../geometry/vertex_layout";

/**
 * Concrete WebGL Vertex Shader stage wrapper.
 * Provides reflection of vertex attribute layout directly from GLSL declaration.
 */
export class VertexShader
    extends ShaderStage<VertexStageType>
    implements IVertexShader {
    private _vertexLayout: VertexLayoutSpec | null = null;

    constructor(
        contextManager: IWebGLContextManager,
        options: ShaderStageOptions
    ) {
        super(contextManager, ShaderStageType.Vertex, options);
    }

    public get vertexLayout(): VertexLayoutSpec {
        if (!this._vertexLayout) {
            this._vertexLayout = parseVertexLayoutFromGLSL(this.source);
        }
        return this._vertexLayout;
    }
}
