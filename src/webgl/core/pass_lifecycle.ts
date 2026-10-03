import type { RenderPassLifecycle } from "./pass_lifecycle_types";

/**
 * Guarantees strict execution order of WebGL resource creation across all rendering passes.
 * Used during both initial startup and WebGL context restoration (webglcontextrestored).
 *
 * @param gl Active WebGL2 rendering context
 * @param pass Render pass implementing RenderPassLifecycle
 * @returns True if initialization succeeded, false if shader compilation or program linking failed
 */
export function initializeRenderPass(
    gl: WebGL2RenderingContext,
    pass: RenderPassLifecycle
): boolean {
    if (!pass.buildShaders(gl)) {
        console.error("initializeRenderPass: Shader compilation or program linking failed.");
        return false;
    }
    pass.buildBuffers(gl);
    pass.configureLayout(gl);
    pass.uploadStaticUniforms(gl);
    return true;
}
