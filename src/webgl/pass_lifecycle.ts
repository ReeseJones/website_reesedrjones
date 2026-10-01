/**
 * Contract specifying the strict 4-stage dependency ordering required to initialize or
 * restore a WebGL render pass:
 * 1. buildShaders: Compile GLSL sources & link WebGLPrograms
 * 2. buildBuffers: Allocate GPU VBO buffers and upload geometry array data
 * 3. configureLayout: Bind VAOs and set vertex attribute pointers using layout specifications
 * 4. uploadStaticUniforms: Set initial static parameters on active shader programs
 */
export interface RenderPassLifecycle {
    /** Stage 1: Compile GLSL shaders and link WebGLProgram instances */
    buildShaders(gl: WebGL2RenderingContext): boolean;

    /** Stage 2: Create GPU VBO buffers and upload geometry array data */
    buildBuffers(gl: WebGL2RenderingContext): void;

    /** Stage 3: Bind VAOs and configure vertex attribute pointers using VertexLayoutSpec */
    configureLayout(gl: WebGL2RenderingContext): void;

    /** Stage 4: Set initial static uniforms on active shader programs */
    uploadStaticUniforms(gl: WebGL2RenderingContext): void;
}

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
