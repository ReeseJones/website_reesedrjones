import type { ITexture, TextureOptions, TextureUnit } from "./texture_types";
import type { ICubeTexture } from "./cube_texture_types";
import type { IContextSubsystem, SubsystemDiagnostics } from "../core/subsystem_types";

/**
 * Standard neutral fallback texture archetypes.
 */
export type TextureFallbackType = "white" | "black" | "flat_normal" | "black_cube";

/**
 * Public interface for the WebGL Texture Fallback Registry.
 * Coordinates neutral 1x1 fallback singletons, context loss/restoration, and GPU memory cleanup.
 */
export interface IFallbackTextureRegistry {
    /**
     * Retrieves the GPU handle for a standard neutral fallback texture.
     */
    get(type: TextureFallbackType): WebGLTexture | null;

    /**
     * Initializes or rebuilds all fallback texture singletons on the GPU.
     */
    init(gl: WebGL2RenderingContext): void;

    /**
     * WebGL context lost lifecycle hook: clears all driver handles without deleting.
     */
    onContextLost(): void;

    /**
     * Permanently destroys all fallback texture GPU handles.
     */
    destroy(gl?: WebGL2RenderingContext | null): void;
}


/**
 * Public interface for the WebGL Texture Manager subsystem.
 * Coordinates 2D textures, cubemaps, 16-slot unit bindings, asset caching, and fallback singletons.
 */
export interface ITextureManager extends IContextSubsystem {
    /** Total number of unique 2D textures currently managed in memory */
    readonly textureCount: number;

    /** Total number of unique cubemaps currently managed in memory */
    readonly cubeTextureCount: number;

    /**
     * Retrieves an existing cached 2D texture by URL or creates, loads, and caches a new one.
     */
    getOrCreate(url: string, options?: Omit<TextureOptions, "label">): ITexture;

    /**
     * Retrieves a cached 2D texture by URL without creating a new one.
     */
    get(url: string): ITexture | null;

    /**
     * Checks if a texture for the given URL is currently cached.
     */
    has(url: string): boolean;

    /**
     * Binds a 2D texture or appropriate neutral fallback to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    bind(unit: TextureUnit | number, texture: ITexture | null | undefined, fallback?: TextureFallbackType): void;

    /**
     * Low-level bind of a raw WebGLTexture 2D handle to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    bindHandle(unit: TextureUnit | number, handle: WebGLTexture | null): void;

    /**
     * Binds a cubemap texture or neutral black cubemap fallback to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    bindCube(unit: TextureUnit | number, texture: ICubeTexture | null | undefined): void;

    /**
     * Low-level bind of a raw WebGLTexture cubemap handle to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    bindCubeHandle(unit: TextureUnit | number, handle: WebGLTexture | null): void;

    /**
     * Unbinds any texture currently active on the specified hardware unit.
     */
    unbind(unit: TextureUnit | number): void;

    /**
     * Unbinds all 16 hardware texture units.
     */
    unbindAll(): void;

    /**
     * Retrieves the GPU handle for a standard neutral fallback texture.
     */
    getFallbackHandle(type: TextureFallbackType): WebGLTexture | null;

    /**
     * Deterministic Disposal: Releases a texture from the cache and deletes its GPU handle.
     */
    dispose(textureOrUrl: ITexture | ICubeTexture | string): void;

    /**
     * Permanently destroys all managed textures, fallbacks, and caches.
     */
    destroy(): void;

    /**
     * Telemetry query returning active texture count and unit bindings.
     */
    getDiagnostics(): SubsystemDiagnostics;

    // --- Backwards-Compatible Aliases ---
    getOrCreateTexture?(url: string, options?: Omit<TextureOptions, "label">): ITexture;
    release?(textureOrUrl: ITexture | string): void;
}
