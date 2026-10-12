import type { IShaderStage, ShaderStageOptions } from "./shader_stage_types";
import type { ShaderStageType } from "./shader_stage_constants";
import type { IWebGLContextManager } from "../core/context_manager_types";
import { compileShader } from "./shader_compiler";

/**
 * Abstract base class representing a compiled WebGL shader stage (Vertex or Fragment).
 * Implements IWebGLResource and manages the native WebGLShader handle.
 */
export abstract class ShaderStage<TStage extends ShaderStageType>
    implements IShaderStage<TStage> {
    public readonly stage: TStage;
    public readonly source: string;
    public readonly label: string;

    private _contextManager: IWebGLContextManager;
    private _shader: WebGLShader | null = null;
    private _infoLog: string | null = null;
    private _isDisposed: boolean = false;
    private readonly _onDisposeCallbacks: Set<() => void> = new Set();

    protected constructor(
        contextManager: IWebGLContextManager,
        stage: TStage,
        options: ShaderStageOptions
    ) {
        this._contextManager = contextManager;
        this.stage = stage;
        this.source = options.source;
        this.label = options.label ?? "ShaderStage";

        this.build();
    }

    public get isValid(): boolean {
        return this._shader !== null && !this._isDisposed;
    }

    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    public get infoLog(): string | null {
        return this._infoLog;
    }

    public getShader(): WebGLShader | null {
        return this._shader;
    }

    public onContextLost(): void {
        this._shader = null;
    }

    public onContextRestored(gl: WebGL2RenderingContext): void {
        if (this._isDisposed) return;
        this.onContextLost();
        this.build(gl);
    }

    public onDispose(callback: () => void): () => void {
        if (this._isDisposed) {
            callback();
            return () => {};
        }
        this._onDisposeCallbacks.add(callback);
        return () => {
            this._onDisposeCallbacks.delete(callback);
        };
    }

    public dispose(): void {
        if (this._isDisposed) return;
        this._isDisposed = true;

        const gl = this._contextManager.getContext();
        if (gl && !gl.isContextLost() && this._shader) {
            gl.deleteShader(this._shader);
        }
        this._shader = null;

        for (const callback of this._onDisposeCallbacks) {
            try {
                callback();
            } catch (err) {
                console.error(`[${this.label}] Error in onDispose callback:`, err);
            }
        }
        this._onDisposeCallbacks.clear();
    }

    private build(glContext?: WebGL2RenderingContext): boolean {
        const gl = glContext ?? this._contextManager.getContext();
        if (!gl || gl.isContextLost()) {
            this._shader = null;
            return false;
        }

        const shader = compileShader(gl, this.stage, this.source, this.label);
        this._shader = shader;
        this._infoLog = shader === null ? "Shader compilation failed" : null;

        return this._shader !== null;
    }
}
