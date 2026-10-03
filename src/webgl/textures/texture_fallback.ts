import type { IFallbackTextureRegistry, TextureFallbackType } from "./texture_manager_types";
import { createSolid2DTexture, createSolidCubeTexture } from "./texture_factory";

/**
 * Registry managing neutral 1x1 fallback WebGL textures.
 * Pre-allocates and maintains white, black, flat normal, and black cubemap singletons
 * so shaders never sample incomplete or unassigned texture units.
 */
export class FallbackTextureRegistry implements IFallbackTextureRegistry {
    private _fallbackWhite: WebGLTexture | null = null;
    private _fallbackBlack: WebGLTexture | null = null;
    private _fallbackFlatNormal: WebGLTexture | null = null;
    private _fallbackBlackCube: WebGLTexture | null = null;

    /**
     * Retrieves the GPU handle for a standard neutral fallback texture.
     */
    public get(type: TextureFallbackType): WebGLTexture | null {
        switch (type) {
            case "black":
                return this._fallbackBlack;
            case "flat_normal":
                return this._fallbackFlatNormal;
            case "black_cube":
                return this._fallbackBlackCube;
            case "white":
            default:
                return this._fallbackWhite;
        }
    }

    /**
     * Allocates or rebuilds all fallback texture singletons on the GPU.
     */
    public init(gl: WebGL2RenderingContext): void {
        this.destroy(gl);

        this._fallbackWhite = createSolid2DTexture(gl, 255, 255, 255, 255);
        this._fallbackBlack = createSolid2DTexture(gl, 0, 0, 0, 255);
        this._fallbackFlatNormal = createSolid2DTexture(gl, 128, 128, 255, 255);
        this._fallbackBlackCube = createSolidCubeTexture(gl, 0, 0, 0, 255);
    }

    /**
     * Clears all GPU handles when the WebGL context is lost without attempting gl.deleteTexture.
     */
    public onContextLost(): void {
        this._fallbackWhite = null;
        this._fallbackBlack = null;
        this._fallbackFlatNormal = null;
        this._fallbackBlackCube = null;
    }

    /**
     * Permanently deletes all fallback texture resources from GPU memory.
     */
    public destroy(gl?: WebGL2RenderingContext | null): void {
        if (gl && !gl.isContextLost()) {
            if (this._fallbackWhite) gl.deleteTexture(this._fallbackWhite);
            if (this._fallbackBlack) gl.deleteTexture(this._fallbackBlack);
            if (this._fallbackFlatNormal) gl.deleteTexture(this._fallbackFlatNormal);
            if (this._fallbackBlackCube) gl.deleteTexture(this._fallbackBlackCube);
        }

        this._fallbackWhite = null;
        this._fallbackBlack = null;
        this._fallbackFlatNormal = null;
        this._fallbackBlackCube = null;
    }
}
