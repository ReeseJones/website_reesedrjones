import type { ShaderProgram } from "../shaders/shader_program";
import type { ShaderProgramOptions } from "../shaders/shader_program_types";
import { VertexBuffer } from "../geometry/vertex_buffer";
import type { VertexLayoutSpec } from "../geometry/vertex_layout_types";
import type { IWebGLContextManager } from "./context_manager_types";
import type { PipelineState } from "../../scene/materials/material_types";
import type { ShaderKey } from "../shaders/shader_types";
import type { IContextSubsystem, SubsystemDiagnostics } from "./subsystem_types";
import { GeometryManager } from "../geometry/geometry_manager";
import { TextureManager } from "../textures/texture_manager";
import { ShaderManager } from "../shaders/shader_manager";

/**
 * Central WebGL GPU resource manager and microkernel coordinator.
 * Coordinates priority-based context recovery across registered subsystems (Shaders, Textures, Geometries),
 * tracks managed VertexBuffers via a request/release pattern, and caches pipeline state.
 */
export class WebGLContextManager implements IWebGLContextManager {
    public readonly shaders: ShaderManager;
    public readonly textures: TextureManager;
    public readonly geometries: GeometryManager;

    private readonly _subsystems: IContextSubsystem[] = [];
    private gl: WebGL2RenderingContext | null = null;
    private activeBuffers = new Set<VertexBuffer>();
    private currentPipelineState: PipelineState | null = null;
    private _maxTextureUnits: number = 16;

    constructor(gl?: WebGL2RenderingContext) {
        this.shaders = this.registerSubsystem(new ShaderManager(this));
        this.textures = this.registerSubsystem(new TextureManager(this));
        this.geometries = this.registerSubsystem(new GeometryManager(this));

        if (gl) {
            this.setContext(gl);
        }
    }

    // --- Backwards-Compatible Subsystem Aliases ---

    public get shaderManager(): ShaderManager {
        return this.shaders;
    }

    public get textureManager(): TextureManager {
        return this.textures;
    }

    public get geometryManager(): GeometryManager {
        return this.geometries;
    }

    // --- Microkernel Subsystem Management ---

    public registerSubsystem<T extends IContextSubsystem>(subsystem: T): T {
        this._subsystems.push(subsystem);
        return subsystem;
    }

    public getSubsystem<T extends IContextSubsystem>(name: string): T | null {
        return (this._subsystems.find((s) => s.name === name) as T) ?? null;
    }

    public getDiagnostics(): Record<string, SubsystemDiagnostics> {
        const diagnostics: Record<string, SubsystemDiagnostics> = {};
        for (const subsystem of this._subsystems) {
            diagnostics[subsystem.name] = subsystem.getDiagnostics();
        }
        return diagnostics;
    }

    // --- Context & State Lifecycle ---

    /**
     * Sets or updates the active WebGL2 rendering context.
     */
    public setContext(gl: WebGL2RenderingContext): void {
        this.gl = gl;
        this.currentPipelineState = null;
        this._maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 16;

        const sorted = [...this._subsystems].sort((a, b) => a.restorationPriority - b.restorationPriority);
        for (const sub of sorted) {
            sub.onContextRestored(gl);
        }
    }

    /**
     * Retrieves the current WebGL2 rendering context.
     */
    public getContext(): WebGL2RenderingContext | null {
        return this.gl;
    }

    /**
     * Retrieves the currently active WebGLProgram without querying the GPU.
     */
    public getCurrentProgram(): WebGLProgram | null {
        return this.shaders.activeProgram;
    }

    /**
     * Retrieves the currently active ShaderProgram instance, if any.
     */
    public getCurrentShader(): ShaderProgram<never> | null {
        return this.shaders.activeShader;
    }

    /**
     * Binds the specified ShaderProgram to the WebGL context with redundant-call skipping.
     */
    public useShader<TUniforms extends object = never>(shader: ShaderProgram<TUniforms> | null): void {
        this.shaders.bind(shader);
    }

    /**
     * Low-level bind for a raw WebGLProgram.
     */
    public useProgram(program: WebGLProgram | null): void {
        this.shaders.bindProgram(program);
    }

    /**
     * Factory & Registry: Retrieves a cached ShaderProgram or compiles and caches a new one.
     */
    public getOrCreateShader<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey,
        options: ShaderProgramOptions
    ): ShaderProgram<TUniforms> {
        return this.shaders.getOrCreate<TUniforms>(key, options);
    }

    /**
     * Registry Query: Retrieves an existing compiled ShaderProgram if registered.
     */
    public getShader<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey
    ): ShaderProgram<TUniforms> | null {
        return this.shaders.get<TUniforms>(key);
    }

    /**
     * Releases or disposes of a ShaderProgram.
     */
    public releaseShader<TUniforms extends object = Record<string, unknown>>(
        keyOrInstance: ShaderKey | ShaderProgram<TUniforms>
    ): void {
        this.shaders.dispose(keyOrInstance);
    }

    /**
     * Factory Request: Allocates a new managed VertexBuffer tracking VBO and VAO handles.
     */
    public createVertexBuffer<TUniforms extends object = Record<string, unknown>>(
        layout: VertexLayoutSpec,
        shader?: ShaderProgram<TUniforms> | WebGLProgram
    ): VertexBuffer {
        const buffer = new VertexBuffer(this, layout, shader);
        this.activeBuffers.add(buffer);
        return buffer;
    }

    /**
     * Release Pattern: Deletes GPU resources associated with a VertexBuffer.
     */
    public releaseVertexBuffer(buffer: VertexBuffer): void {
        if (this.activeBuffers.has(buffer)) {
            buffer.destroy();
            this.activeBuffers.delete(buffer);
        }
    }

    /**
     * Asserts desired WebGL pipeline state; skips redundant driver calls.
     */
    public applyPipelineState(state: PipelineState): void {
        const gl = this.gl;
        if (!gl) return;

        const current = this.currentPipelineState;

        if (!current || current.depthTest !== state.depthTest) {
            if (state.depthTest) {
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL);
            } else {
                gl.disable(gl.DEPTH_TEST);
            }
        }

        if (!current || current.depthWrite !== state.depthWrite) {
            gl.depthMask(state.depthWrite);
        }

        if (!current || current.blendMode !== state.blendMode) {
            if (state.blendMode === "opaque") {
                gl.disable(gl.BLEND);
            } else if (state.blendMode === "alpha") {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            } else if (state.blendMode === "additive") {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE);
            }
        }

        if (!current || current.cullFace !== state.cullFace) {
            if (state.cullFace) {
                gl.enable(gl.CULL_FACE);
            } else {
                gl.disable(gl.CULL_FACE);
            }
        }

        this.currentPipelineState = { ...state };
    }

    /**
     * Resets cached pipeline state to default or canvas baseline.
     */
    public resetPipelineState(): void {
        this.currentPipelineState = null;
    }

    /**
     * Forces depth mask true or false (e.g. before clearing depth buffer).
     */
    public setDepthMask(enabled: boolean): void {
        if (this.gl) {
            this.gl.depthMask(enabled);
        }
        if (this.currentPipelineState) {
            this.currentPipelineState.depthWrite = enabled;
        }
    }

    /**
     * Maximum hardware texture units supported in fragment shaders.
     */
    public get maxTextureUnits(): number {
        return this._maxTextureUnits;
    }

    /**
     * Retrieves the shared 1x1 solid white fallback texture handle.
     */
    public getDefaultWhiteTexture(): WebGLTexture | null {
        return this.textures.getFallbackHandle("white");
    }

    /**
     * Retrieves the shared 1x1 solid black fallback cubemap texture handle.
     */
    public getDefaultBlackCubeTexture(): WebGLTexture | null {
        return this.textures.getFallbackHandle("black_cube");
    }

    /**
     * Binds a WebGLTexture to a hardware texture unit with redundant call skipping.
     */
    public bindTexture(unit: number, texture: WebGLTexture | null): void {
        this.textures.bindHandle(unit, texture);
    }

    /**
     * Binds a WebGLTexture cubemap to a hardware texture unit with redundant call skipping.
     */
    public bindCubeTexture(unit: number, texture: WebGLTexture | null): void {
        this.textures.bindCubeHandle(unit, texture);
    }

    /**
     * Handlers invoked when a WebGL context lost event occurs.
     */
    public handleContextLost(): void {
        this.gl = null;
        this.currentPipelineState = null;
        for (const sub of this._subsystems) {
            sub.onContextLost();
        }
    }

    /**
     * Automated Priority-based Context Loss Recovery:
     * - Phase 1 (Priority 10): Shaders rebuild programs and uniform locations.
     * - Phase 2 (Priority 20): Textures recreate fallbacks and re-upload active textures.
     * - Phase 3 (Priority 30): Geometries rebind buffer layouts.
     */
    public handleContextRestored(newGl: WebGL2RenderingContext): void {
        this.gl = newGl;
        this.currentPipelineState = null;
        this._maxTextureUnits = newGl.getParameter(newGl.MAX_TEXTURE_IMAGE_UNITS) || 16;

        const sorted = [...this._subsystems].sort((a, b) => a.restorationPriority - b.restorationPriority);
        for (const sub of sorted) {
            sub.onContextRestored(newGl);
        }

        // Rebuild active VertexBuffers
        for (const buffer of this.activeBuffers.values()) {
            buffer.rebuild(newGl);
        }
    }

    /**
     * Disposes all subsystems, vertex buffers, and context references.
     */
    public destroy(): void {
        for (const sub of this._subsystems) {
            sub.destroy();
        }
        this._subsystems.length = 0;

        for (const buffer of this.activeBuffers.values()) {
            buffer.destroy();
        }
        this.activeBuffers.clear();

        this.currentPipelineState = null;
        this.gl = null;
    }
}
