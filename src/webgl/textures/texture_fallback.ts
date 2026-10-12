import type { IFallbackTextureRegistry, TextureFallbackType } from "./texture_manager_types";
import { createSolid2DTexture, createSolidCubeTexture } from "./texture_factory";
import type { SolidColorTexture } from "./solid_color_texture";
import type { SolidColorCubeTexture } from "./solid_color_cube_texture";

/**
 * Registry managing neutral 1x1 fallback WebGL textures.
 * Pre-allocates and maintains managed white, black, flat normal, and black cubemap instances
 * so shaders never sample incomplete or unassigned texture units.
 */
export class FallbackTextureRegistry implements IFallbackTextureRegistry {
    private _fallbackWhite: SolidColorTexture | null = null;
    private _fallbackBlack: SolidColorTexture | null = null;
    private _fallbackFlatNormal: SolidColorTexture | null = null;
    private _fallbackBlackCube: SolidColorCubeTexture | null = null;

    /**
     * Retrieves the GPU handle for a standard neutral fallback texture.
     */
    public get(type: TextureFallbackType): WebGLTexture | null {
        switch (type) {
            case "black":
                return this._fallbackBlack?.handle ?? null;
            case "flat_normal":
                return this._fallbackFlatNormal?.handle ?? null;
            case "black_cube":
                return this._fallbackBlackCube?.handle ?? null;
            case "white":
            default:
                return this._fallbackWhite?.handle ?? null;
        }
    }

    /**
     * Retrieves the managed texture instance for a standard neutral fallback texture.
     */
    public getTexture(type: TextureFallbackType = "white"): SolidColorTexture | SolidColorCubeTexture | null {
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
        this.destroy();

        this._fallbackWhite = createSolid2DTexture(gl, 255, 255, 255, 255);
        this._fallbackBlack = createSolid2DTexture(gl, 0, 0, 0, 255);
        this._fallbackFlatNormal = createSolid2DTexture(gl, 128, 128, 255, 255);
        this._fallbackBlackCube = createSolidCubeTexture(gl, 0, 0, 0, 255);
    }

    /**
     * Propagates context loss to all managed fallback textures without deleting handles.
     */
    public onContextLost(): void {
        this._fallbackWhite?.onContextLost();
        this._fallbackBlack?.onContextLost();
        this._fallbackFlatNormal?.onContextLost();
        this._fallbackBlackCube?.onContextLost();
    }

    /**
     * Permanently disposes of all fallback texture instances and their GPU handles.
     */
    public destroy(_gl?: WebGL2RenderingContext | null): void {
        this._fallbackWhite?.dispose();
        this._fallbackBlack?.dispose();
        this._fallbackFlatNormal?.dispose();
        this._fallbackBlackCube?.dispose();

        this._fallbackWhite = null;
        this._fallbackBlack = null;
        this._fallbackFlatNormal = null;
        this._fallbackBlackCube = null;
    }
}
