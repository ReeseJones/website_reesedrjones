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

/**
 * Standalone WebGL program linking utility.
 * Attaches vertex and fragment shaders, links the program, detaches shaders,
 * verifies link status, and cleans up on failure without deleting the underlying shaders.
 */
export function linkProgram(
    gl: WebGL2RenderingContext,
    vs: WebGLShader,
    fs: WebGLShader,
    label = "ShaderProgram"
): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    // Detach shaders immediately after linking
    gl.detachShader(program, vs);
    gl.detachShader(program, fs);

    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        console.error(
            `[${label}] Program link failed: ${gl.getProgramInfoLog(program)}`
        );
        gl.deleteProgram(program);
        return null;
    }

    return program;
}
