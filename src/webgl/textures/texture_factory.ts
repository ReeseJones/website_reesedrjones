/**
 * Standalone WebGL2 texture creation utilities.
 * Generates single-pixel solid color 2D and cubemap WebGL textures with clamp-to-edge
 * wrapping and nearest-neighbor sampling.
 */

/**
 * Creates a 1x1 solid-color 2D WebGL texture.
 *
 * @param gl Active WebGL2 rendering context.
 * @param r Red channel value (0-255).
 * @param g Green channel value (0-255).
 * @param b Blue channel value (0-255).
 * @param a Alpha channel value (0-255).
 * @returns WebGLTexture handle or null if allocation failed.
 */
export function createSolid2DTexture(
    gl: WebGL2RenderingContext,
    r: number,
    g: number,
    b: number,
    a: number
): WebGLTexture | null {
    const tex = gl.createTexture();
    if (!tex) return null;

    gl.bindTexture(gl.TEXTURE_2D, tex);
    const pixel = new Uint8Array([r, g, b, a]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return tex;
}

/**
 * Creates a 1x1 solid-color cubemap WebGL texture across all 6 faces.
 *
 * @param gl Active WebGL2 rendering context.
 * @param r Red channel value (0-255).
 * @param g Green channel value (0-255).
 * @param b Blue channel value (0-255).
 * @param a Alpha channel value (0-255).
 * @returns WebGLTexture cubemap handle or null if allocation failed.
 */
export function createSolidCubeTexture(
    gl: WebGL2RenderingContext,
    r: number,
    g: number,
    b: number,
    a: number
): WebGLTexture | null {
    const tex = gl.createTexture();
    if (!tex) return null;

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
    const pixel = new Uint8Array([r, g, b, a]);
    const targets = [
        gl.TEXTURE_CUBE_MAP_POSITIVE_X,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    ];

    for (const target of targets) {
        gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    }

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

    return tex;
}
