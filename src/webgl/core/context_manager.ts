import type { ShaderProgram } from "../shaders/shader_program";
import type { ShaderProgramOptions } from "../shaders/shader_program_types";
import type { IWebGLContextManager, WebGLContextManagerSubsystems } from "./context_manager_types";
import { BlendMode, type PipelineState } from "../../scene/materials/material_types";
import type { ShaderKey } from "../shaders/shader_types";
import type { IContextSubsystem, SubsystemDiagnostics } from "./subsystem_types";
import type { IGeometryManager } from "../geometry/geometry_manager_types";
import type { ITextureManager } from "../textures/texture_manager_types";
import type { IShaderManager } from "../shaders/shader_manager_types";

/**
 * Central WebGL GPU resource manager and microkernel coordinator.
 * Coordinates priority-based context recovery across registered subsystems (Shaders, Textures, Geometries),
 * and caches pipeline state.
 */
export class WebGLContextManager implements IWebGLContextManager {
    public readonly shaders: IShaderManager;
    public readonly textures: ITextureManager;
    public readonly geometries: IGeometryManager;

    private readonly _subsystems: IContextSubsystem[] = [];
    private gl: WebGL2RenderingContext | null = null;
    private currentPipelineState: PipelineState | null = null;
    private _maxTextureUnits: number = 16;

    constructor(subsystems: WebGLContextManagerSubsystems) {
        this.shaders = this.registerSubsystem(subsystems.shaders);
        this.textures = this.registerSubsystem(subsystems.textures);
        this.geometries = this.registerSubsystem(subsystems.geometries);
    }

    // --- Microkernel Subsystem Management ---

    public registerSubsystem<T extends IContextSubsystem>(subsystem: T): T {
        subsystem.attach(this);
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
            switch (state.blendMode) {
                case BlendMode.Opaque:
                    gl.disable(gl.BLEND);
                    break;
                case BlendMode.Alpha:
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                    break;
                case BlendMode.Additive:
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.ONE, gl.ONE);
                    break;
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
    }

    /**
     * Disposes all subsystems and context references.
     */
    public destroy(): void {
        for (const sub of this._subsystems) {
            sub.destroy();
        }
        this._subsystems.length = 0;

        this.currentPipelineState = null;
        this.gl = null;
    }
}
