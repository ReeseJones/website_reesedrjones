import type { IMaterial } from "./material_types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type { ShaderProgram } from "../../webgl/shaders/shader_program";
import type { RenderContext } from "../core/renderable_types";
import { Mat4Index } from "../../maths/matrix_types";

const s_cameraPosition: [number, number, number] = [0, 0, 0];

/**
 * Binds material pipeline state, activates the shader program, binds all 2D and cubemap
 * textures, synchronizes Tier A frame/camera uniforms (once per frame per shader),
 * and uploads domain-specific material uniforms.
 */
export function applyMaterial(
    material: IMaterial,
    contextManager: IWebGLContextManager,
    renderContext?: RenderContext
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

    // 5. Synchronize Tier A Frame / Camera uniforms (uploaded once per shader per frame)
    if (renderContext && shader.lastFrameId !== renderContext.frameId) {
        const { camera, dimensions, time, frameId } = renderContext;
        s_cameraPosition[0] = camera.worldMatrix[Mat4Index.TranslationX];
        s_cameraPosition[1] = camera.worldMatrix[Mat4Index.TranslationY];
        s_cameraPosition[2] = camera.worldMatrix[Mat4Index.TranslationZ];

        shader.setMat4("u_viewProjectionMatrix", camera.viewProjectionMatrix);
        shader.setMat4("u_viewMatrix", camera.viewMatrix);
        shader.setMat4("u_projectionMatrix", camera.projectionMatrix);
        shader.setVec3("u_cameraPosition", s_cameraPosition);
        shader.setFloat("u_time", time);
        shader.setFloat("u_viewportHeight", dimensions.height);

        shader.lastFrameId = frameId;
    }

    // 6. Upload domain-specific material uniforms
    shader.setUniforms(material.getUniforms());

    return shader;
}
