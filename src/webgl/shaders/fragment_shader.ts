import type { IFragmentShader, ShaderStageOptions } from "./shader_stage_types";
import type { FragmentStageType } from "./shader_stage_constants";
import type { IWebGLContextManager } from "../core/context_manager_types";
import { ShaderStageType } from "./shader_stage_constants";
import { ShaderStage } from "./shader_stage";

/**
 * Concrete WebGL Fragment Shader stage wrapper.
 */
export class FragmentShader
    extends ShaderStage<FragmentStageType>
    implements IFragmentShader {
    constructor(
        contextManager: IWebGLContextManager,
        options: ShaderStageOptions
    ) {
        super(contextManager, ShaderStageType.Fragment, options);
    }
}
