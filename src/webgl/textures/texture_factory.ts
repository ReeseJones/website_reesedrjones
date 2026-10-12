import { SolidColorTexture } from "./solid_color_texture";
import { SolidColorCubeTexture } from "./solid_color_cube_texture";

/**
 * Creates and initializes a managed 1x1 solid-color 2D WebGL texture.
 *
 * @param gl Active WebGL2 rendering context.
 * @param r Red channel value (0-255).
 * @param g Green channel value (0-255).
 * @param b Blue channel value (0-255).
 * @param a Alpha channel value (0-255, defaults to 255).
 * @returns Initialized SolidColorTexture instance implementing ITexture.
 */
export function createSolid2DTexture(
    gl: WebGL2RenderingContext,
    r: number,
    g: number,
    b: number,
    a: number = 255
): SolidColorTexture {
    const texture = new SolidColorTexture(r, g, b, a);
    texture.init(gl);
    return texture;
}

/**
 * Creates and initializes a managed 1x1 solid-color cubemap WebGL texture across all 6 faces.
 *
 * @param gl Active WebGL2 rendering context.
 * @param r Red channel value (0-255).
 * @param g Green channel value (0-255).
 * @param b Blue channel value (0-255).
 * @param a Alpha channel value (0-255, defaults to 255).
 * @returns Initialized SolidColorCubeTexture instance implementing ICubeTexture.
 */
export function createSolidCubeTexture(
    gl: WebGL2RenderingContext,
    r: number,
    g: number,
    b: number,
    a: number = 255
): SolidColorCubeTexture {
    const texture = new SolidColorCubeTexture(r, g, b, a);
    texture.init(gl);
    return texture;
}
