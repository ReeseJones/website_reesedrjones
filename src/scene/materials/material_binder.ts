import type { IMaterial } from "./material_types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type { ShaderProgram } from "../../webgl/shaders/shader_program";

/**
 * Binds material pipeline state, activates the shader program, binds all 2D and cubemap
 * textures, and uploads domain-specific material uniforms.
 */
export function applyMaterial(
    material: IMaterial,
    contextManager: IWebGLContextManager
): ShaderProgram {
    // 1. Assert rasterization and blend pipeline state
    contextManager.applyPipelineState(material.pipelineState);

    // 2. Activate shader program directly by key
    const shader = contextManager.shaders.bindKey(material.shaderKey);

    // 3. Bind 2D textures
    for (const [unit, texture] of material.getTextures().entries()) {
        if (texture) {
            contextManager.textures.bind(unit, texture);
        }
    }

    // 4. Bind cubemap textures
    for (const [unit, cubeTexture] of material.getCubeTextures().entries()) {
        if (cubeTexture) {
            contextManager.textures.bindCube(unit, cubeTexture);
        }
    }

    // 5. Upload domain-specific material uniforms
    shader.setUniforms(material.getUniforms());

    return shader;
}
