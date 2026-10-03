import type { IWebGLContextManager } from "../core/context_manager_types";
import type { ITexture, TextureOptions, TextureUnit } from "./texture_types";
import type { ICubeTexture } from "./cube_texture_types";
import type { ITextureManager, TextureFallbackType } from "./texture_manager_types";
import { SubsystemRestorationPriority, type SubsystemDiagnostics } from "../core/subsystem_types";
import { Texture } from "./texture";
import { FallbackTextureRegistry } from "./texture_fallback";

/**
 * Manages 2D and cubemap texture resources, URL asset caching and deduplication,
 * 16-slot hardware unit state deduplication, and standard neutral fallback singletons.
 */
export class TextureManager implements ITextureManager {
    public readonly name = "texture";
    public readonly restorationPriority = SubsystemRestorationPriority.Texture;

    private readonly _contextManager: IWebGLContextManager;
    private _gl: WebGL2RenderingContext | null = null;
    private readonly _urlCache: Map<string, ITexture> = new Map();
    private readonly _boundTextures: Map<number, WebGLTexture | null> = new Map();
    private readonly _boundCubeTextures: Map<number, WebGLTexture | null> = new Map();
    private readonly _fallbacks: FallbackTextureRegistry = new FallbackTextureRegistry();
    private readonly _disposalSubscribers: WeakSet<object> = new WeakSet();
    private _activeUnit: number = 0;

    constructor(contextManager: IWebGLContextManager) {
        this._contextManager = contextManager;
    }

    public get textureCount(): number {
        return this._urlCache.size;
    }

    public get cubeTextureCount(): number {
        return 0;
    }

    /**
     * Retrieves an existing cached 2D texture by URL or creates, loads, and caches a new one.
     */
    public getOrCreate(url: string, options?: Omit<TextureOptions, "label">): ITexture {
        const cached = this._urlCache.get(url);
        if (cached) {
            return cached;
        }

        const texture = new Texture(url, options);
        const gl = this._gl ?? this._contextManager.getContext();
        if (gl) {
            texture.init(gl);
        }

        this._disposalSubscribers.add(texture);
        texture.onDispose(() => this.dispose(texture));
        this._urlCache.set(url, texture);
        return texture;
    }

    /**
     * Retrieves a cached 2D texture by URL without creating a new one.
     */
    public get(url: string): ITexture | null {
        return this._urlCache.get(url) ?? null;
    }

    /**
     * Checks if a texture for the given URL is currently cached.
     */
    public has(url: string): boolean {
        return this._urlCache.has(url);
    }

    /**
     * Binds a 2D texture or appropriate neutral fallback to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    public bind(
        unit: TextureUnit | number,
        texture: ITexture | null | undefined,
        fallback: TextureFallbackType = "white"
    ): void {
        const gl = this._getGLContext();

        if (texture) {
            if (!texture.handle) {
                texture.init(gl);
            }
            if (typeof texture.onDispose === "function" && !this._disposalSubscribers.has(texture)) {
                this._disposalSubscribers.add(texture);
                texture.onDispose(() => this.dispose(texture));
            }
        }

        const handle = texture?.handle ?? this.getFallbackHandle(fallback);
        this.bindHandle(unit, handle);
    }

    /**
     * Low-level bind of a raw WebGLTexture 2D handle to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    public bindHandle(unit: TextureUnit | number, handle: WebGLTexture | null): void {
        const gl = this._getGLContext();

        if (this._boundTextures.get(unit) === handle) {
            return;
        }

        if (this._activeUnit !== unit) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            this._activeUnit = unit;
        }

        gl.bindTexture(gl.TEXTURE_2D, handle);
        this._boundTextures.set(unit, handle);
    }

    /**
     * Binds a cubemap texture or neutral black cubemap fallback to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    public bindCube(unit: TextureUnit | number, texture: ICubeTexture | null | undefined): void {
        const gl = this._getGLContext();

        if (texture) {
            if (!texture.handle) {
                texture.init(gl);
            }
            if (typeof texture.onDispose === "function" && !this._disposalSubscribers.has(texture)) {
                this._disposalSubscribers.add(texture);
                texture.onDispose(() => this.dispose(texture));
            }
        }

        const handle = texture?.handle ?? this.getFallbackHandle("black_cube");
        this.bindCubeHandle(unit, handle);
    }

    /**
     * Low-level bind of a raw WebGLTexture cubemap handle to a hardware texture unit.
     * Skips redundant driver calls if already bound to that unit.
     */
    public bindCubeHandle(unit: TextureUnit | number, handle: WebGLTexture | null): void {
        const gl = this._getGLContext();

        if (this._boundCubeTextures.get(unit) === handle) {
            return;
        }

        if (this._activeUnit !== unit) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            this._activeUnit = unit;
        }

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, handle);
        this._boundCubeTextures.set(unit, handle);
    }

    /**
     * Unbinds any texture currently active on the specified hardware unit.
     */
    public unbind(unit: TextureUnit | number): void {
        const gl = this._gl ?? this._contextManager.getContext();
        if (!gl) return;

        if (this._boundTextures.has(unit) || this._boundCubeTextures.has(unit)) {
            if (this._activeUnit !== unit) {
                gl.activeTexture(gl.TEXTURE0 + unit);
                this._activeUnit = unit;
            }
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
            this._boundTextures.set(unit, null);
            this._boundCubeTextures.set(unit, null);
        }
    }

    /**
     * Unbinds all 16 hardware texture units.
     */
    public unbindAll(): void {
        const gl = this._gl ?? this._contextManager.getContext();
        if (!gl) return;

        const maxUnits = this._contextManager.maxTextureUnits;
        for (let unit = 0; unit < maxUnits; unit++) {
            if (this._boundTextures.get(unit) || this._boundCubeTextures.get(unit)) {
                this.unbind(unit);
            }
        }
    }

    /**
     * Retrieves the GPU handle for a standard neutral fallback texture.
     */
    public getFallbackHandle(type: TextureFallbackType): WebGLTexture | null {
        let handle = this._fallbacks.get(type);
        if (!handle) {
            const gl = this._gl ?? this._contextManager.getContext();
            if (gl && !gl.isContextLost()) {
                this._fallbacks.init(gl);
                handle = this._fallbacks.get(type);
            }
        }
        return handle;
    }

    /**
     * Deterministic Disposal: Releases a texture from the cache and deletes its GPU handle.
     */
    public dispose(textureOrUrl: ITexture | ICubeTexture | string): void {
        let targetKey: string | null = null;
        let targetTex: ITexture | ICubeTexture | null = null;

        if (typeof textureOrUrl === "string") {
            targetKey = textureOrUrl;
            targetTex = this._urlCache.get(targetKey) ?? null;
        } else {
            targetTex = textureOrUrl;
            for (const [key, val] of this._urlCache.entries()) {
                if (val === targetTex) {
                    targetKey = key;
                    break;
                }
            }
        }

        if (targetTex) {
            const handle = targetTex.handle;
            if (handle) {
                for (const [u, h] of this._boundTextures.entries()) {
                    if (h === handle) this._boundTextures.set(u, null);
                }
                for (const [u, h] of this._boundCubeTextures.entries()) {
                    if (h === handle) this._boundCubeTextures.set(u, null);
                }
            }
            targetTex.destroy();
        }

        if (targetKey) {
            this._urlCache.delete(targetKey);
        }
    }

    /**
     * WebGL context lost lifecycle hook: clears all driver handles without deleting.
     */
    public onContextLost(): void {
        this._activeUnit = 0;
        this._boundTextures.clear();
        this._boundCubeTextures.clear();
        this._fallbacks.onContextLost();
        this._gl = null;

        for (const tex of this._urlCache.values()) {
            tex.onContextLost();
        }
    }

    /**
     * WebGL context restored lifecycle hook: rebuilds fallbacks and re-uploads active textures.
     */
    public onContextRestored(gl: WebGL2RenderingContext): void {
        this._gl = gl;
        this._activeUnit = 0;
        this._boundTextures.clear();
        this._boundCubeTextures.clear();

        this._fallbacks.init(gl);

        for (const tex of this._urlCache.values()) {
            tex.onContextRestored(gl);
        }
    }

    /**
     * Permanently destroys all managed textures, fallbacks, and caches.
     */
    public destroy(): void {
        const gl = this._gl ?? this._contextManager.getContext();
        this._fallbacks.destroy(gl);

        for (const tex of this._urlCache.values()) {
            tex.destroy();
        }

        this._urlCache.clear();
        this._boundTextures.clear();
        this._boundCubeTextures.clear();
        this._activeUnit = 0;
        this._gl = null;
    }

    /**
     * Telemetry query returning active texture count and unit bindings.
     */
    public getDiagnostics(): SubsystemDiagnostics {
        return {
            name: this.name,
            resourceCount: this._urlCache.size,
            activeBindings: this._boundTextures.size + this._boundCubeTextures.size,
        };
    }

    // --- Backwards-Compatible Aliases ---

    public getOrCreateTexture(url: string, options?: Omit<TextureOptions, "label">): ITexture {
        return this.getOrCreate(url, options);
    }

    public release(textureOrUrl: ITexture | string): void {
        this.dispose(textureOrUrl);
    }

    // --- Private Helpers ---

    private _getGLContext(): WebGL2RenderingContext {
        const gl = this._gl ?? this._contextManager.getContext();
        if (!gl) {
            throw new Error("[TextureManager] Cannot perform texture operations without an active WebGL2 context.");
        }
        return gl;
    }
}

