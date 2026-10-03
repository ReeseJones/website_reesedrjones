/**
 * Standalone GLSL shader compilation utility.
 * Compiles a WebGL vertex or fragment shader from source code, emits descriptive diagnostics
 * upon compilation failures, and cleans up invalidated GPU shader handles.
 */
export function compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string,
    label = "ShaderProgram"
): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        const typeName = type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT";
        console.error(
            `[${label}] ${typeName} shader compile failed: ${gl.getShaderInfoLog(shader)}`
        );
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}
