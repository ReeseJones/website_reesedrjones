import type { ShaderProgram } from "./shader_program";
import type { VertexShader } from "./vertex_shader";
import type { FragmentShader } from "./fragment_shader";
import type {
    ShaderKey,
    ShaderUniformsOf,
    VertexShaderKey,
    FragmentShaderKey,
    ShaderStageDef,
    ShaderProgramDef,
} from "./shader_types";
import type { IShaderManager } from "./shader_manager_types";
import type { IWebGLContextManager } from "../core/context_manager_types";
import { SubsystemRestorationPriority, type SubsystemDiagnostics } from "../core/subsystem_types";
import { ShaderProgram as ShaderProgramImpl } from "./shader_program";
import { VertexShader as VertexShaderImpl } from "./vertex_shader";
import { FragmentShader as FragmentShaderImpl } from "./fragment_shader";
import {
    VERTEX_SHADER_DEFS,
    FRAGMENT_SHADER_DEFS,
    SHADER_PROGRAM_DEFS,
} from "./shader_registry";

/**
 * Subsystem managing reusable GLSL vertex and fragment shader stages,
 * shader programs, location caching, redundant driver call elimination,
 * and automated Phase 1 context restoration.
 */
export class ShaderManager implements IShaderManager {
    public readonly name = "shader";
    public readonly restorationPriority = SubsystemRestorationPriority.Shader;

    private _contextManager: IWebGLContextManager | null = null;
    private readonly _vertexShaders = new Map<VertexShaderKey, VertexShader>();
    private readonly _fragmentShaders = new Map<FragmentShaderKey, FragmentShader>();
    private readonly _programs = new Map<ShaderKey, ShaderProgram<never>>();

    private _currentShader: ShaderProgram<never> | null = null;
    private _currentProgram: WebGLProgram | null = null;

    constructor() {}

    /**
     * Hook invoked when the subsystem is attached to an IWebGLContextManager coordinator.
     */
    public attach(contextManager: IWebGLContextManager): void {
        this._contextManager = contextManager;
    }

    /**
     * Optional hook invoked when the subsystem is detached or replaced.
     */
    public detach(): void {
        this._contextManager = null;
    }

    public get activeShader(): ShaderProgram<never> | null {
        return this._currentShader;
    }

    public get activeProgram(): WebGLProgram | null {
        return this._currentProgram;
    }

    public get programCount(): number {
        return this._programs.size;
    }

    public get vertexShaderCount(): number {
        return this._vertexShaders.size;
    }

    public get fragmentShaderCount(): number {
        return this._fragmentShaders.size;
    }

    /**
     * Factory & Registry: Retrieves an existing cached VertexShader or compiles and caches a new one.
     */
    public getOrCreateVertexShader(
        key: VertexShaderKey,
        def?: ShaderStageDef
    ): VertexShader {
        let vs = this._vertexShaders.get(key);
        if (!vs) {
            if (!this._contextManager) {
                throw new Error(`[ShaderManager] Cannot compile vertex shader '${key}' before subsystem is attached to WebGLContextManager.`);
            }
            const gl = this._contextManager.getContext();
            if (!gl) {
                throw new Error(`[ShaderManager] Cannot compile vertex shader '${key}' before WebGL context is initialized.`);
            }

            const stageDef = def ?? VERTEX_SHADER_DEFS[key];
            if (!stageDef) {
                throw new Error(`[ShaderManager] Unknown vertex shader key '${key}' and no stage definition provided.`);
            }

            vs = new VertexShaderImpl(this._contextManager, {
                source: stageDef.source,
                label: stageDef.label ?? key,
            });

            vs.onDispose(() => {
                this._vertexShaders.delete(key);
            });

            this._vertexShaders.set(key, vs);
        }
        return vs;
    }

    /**
     * Factory & Registry: Retrieves an existing cached FragmentShader or compiles and caches a new one.
     */
    public getOrCreateFragmentShader(
        key: FragmentShaderKey,
        def?: ShaderStageDef
    ): FragmentShader {
        let fs = this._fragmentShaders.get(key);
        if (!fs) {
            if (!this._contextManager) {
                throw new Error(`[ShaderManager] Cannot compile fragment shader '${key}' before subsystem is attached to WebGLContextManager.`);
            }
            const gl = this._contextManager.getContext();
            if (!gl) {
                throw new Error(`[ShaderManager] Cannot compile fragment shader '${key}' before WebGL context is initialized.`);
            }

            const stageDef = def ?? FRAGMENT_SHADER_DEFS[key];
            if (!stageDef) {
                throw new Error(`[ShaderManager] Unknown fragment shader key '${key}' and no stage definition provided.`);
            }

            fs = new FragmentShaderImpl(this._contextManager, {
                source: stageDef.source,
                label: stageDef.label ?? key,
            });

            fs.onDispose(() => {
                this._fragmentShaders.delete(key);
            });

            this._fragmentShaders.set(key, fs);
        }
        return fs;
    }

    /**
     * Registry Query: Retrieves an existing compiled VertexShader if registered.
     */
    public getVertexShader(key: VertexShaderKey): VertexShader | null {
        return this._vertexShaders.get(key) ?? null;
    }

    /**
     * Registry Query: Retrieves an existing compiled FragmentShader if registered.
     */
    public getFragmentShader(key: FragmentShaderKey): FragmentShader | null {
        return this._fragmentShaders.get(key) ?? null;
    }

    /**
     * Factory & Registry: Retrieves an existing cached ShaderProgram or links and caches a new one.
     */
    public getOrCreate<K extends ShaderKey>(
        key: K,
        def?: ShaderProgramDef<K>
    ): ShaderProgram<ShaderUniformsOf<K>> {
        let program = this._programs.get(key);
        if (!program) {
            if (!this._contextManager) {
                throw new Error(`[ShaderManager] Cannot link shader program '${key}' before subsystem is attached to WebGLContextManager.`);
            }
            const gl = this._contextManager.getContext();
            if (!gl) {
                throw new Error(`[ShaderManager] Cannot link shader program '${key}' before WebGL context is initialized.`);
            }

            const progDef = def ?? (SHADER_PROGRAM_DEFS[key] as ShaderProgramDef<K>);
            if (!progDef) {
                throw new Error(`[ShaderManager] Unknown shader program key '${key}' and no program definition provided.`);
            }

            const vertex = this.getOrCreateVertexShader(progDef.vertex);
            const fragment = this.getOrCreateFragmentShader(progDef.fragment);

            const createdProgram = new ShaderProgramImpl<never>(this._contextManager, {
                vertex,
                fragment,
                label: progDef.label ?? key,
                samplers: progDef.samplers,
            });

            createdProgram.onDispose(() => {
                if (this._currentShader === createdProgram) {
                    this.unbind();
                }
                this._programs.delete(key);
            });

            this._programs.set(key, createdProgram);
            program = createdProgram;
        }
        return program as unknown as ShaderProgram<ShaderUniformsOf<K>>;
    }

    /**
     * Registry Query: Retrieves an existing compiled ShaderProgram if registered.
     */
    public get<K extends ShaderKey>(
        key: K
    ): ShaderProgram<ShaderUniformsOf<K>> | null {
        const program = this._programs.get(key);
        return program ? (program as unknown as ShaderProgram<ShaderUniformsOf<K>>) : null;
    }

    /**
     * Checks if a shader program with the given key is currently registered.
     */
    public has(key: ShaderKey): boolean {
        return this._programs.has(key);
    }

    /**
     * Binds the specified ShaderProgram to the WebGL context with redundant-call skipping.
     */
    public bind<TUniforms extends object = never>(shader: ShaderProgram<TUniforms> | null): void {
        if (this._currentShader === (shader as unknown as ShaderProgram<never>)) {
            return;
        }

        const programHandle = shader ? shader.getProgram() : null;
        if (this._currentProgram !== programHandle) {
            const gl = this._contextManager?.getContext() ?? null;
            if (gl) {
                gl.useProgram(programHandle);
            }
            this._currentProgram = programHandle;
        }
        this._currentShader = shader as unknown as ShaderProgram<never>;
    }

    /**
     * Activates a ShaderProgram by canonical key, lazily compiling stages and linking programs if needed.
     * Infers the strongly-typed uniform interface for the shader program.
     */
    public bindKey<K extends ShaderKey>(key: K): ShaderProgram<ShaderUniformsOf<K>> {
        let program = this.get<K>(key);
        if (!program && key in SHADER_PROGRAM_DEFS) {
            program = this.getOrCreate<K>(key);
        }
        if (!program) {
            throw new Error(`[ShaderManager] Shader program '${key}' is not registered with WebGLContextManager.`);
        }
        this.bind(program);
        return program;
    }

    /**
     * Low-level bind for a raw WebGLProgram with redundant-call skipping.
     */
    public bindProgram(program: WebGLProgram | null): void {
        if (this._currentProgram === program) {
            return;
        }

        const gl = this._contextManager?.getContext() ?? null;
        if (gl) {
            gl.useProgram(program);
        }
        this._currentProgram = program;
        this._currentShader = null;
    }

    /**
     * Unbinds the currently active shader program.
     */
    public unbind(): void {
        this.bindProgram(null);
    }

    /**
     * WebGL context lost lifecycle hook: forwards context loss to all registered stages and programs.
     */
    public onContextLost(): void {
        this._currentProgram = null;
        this._currentShader = null;

        for (const vs of this._vertexShaders.values()) {
            vs.onContextLost();
        }
        for (const fs of this._fragmentShaders.values()) {
            fs.onContextLost();
        }
        for (const program of this._programs.values()) {
            program.onContextLost();
        }
    }

    /**
     * Automated Phase 1 Context Restoration:
     * Restores stages first (vertex, then fragment) before relinking programs and restoring uniforms.
     */
    public onContextRestored(gl: WebGL2RenderingContext): void {
        this._currentProgram = null;
        this._currentShader = null;

        // 1. Restore all vertex shader stages
        for (const vs of this._vertexShaders.values()) {
            vs.onContextRestored(gl);
        }

        // 2. Restore all fragment shader stages
        for (const fs of this._fragmentShaders.values()) {
            fs.onContextRestored(gl);
        }

        // 3. Relink programs and restore uniforms
        for (const program of this._programs.values()) {
            program.onContextRestored(gl);
        }
    }

    /**
     * Disposes all registered shader programs and stages, clearing internal caches.
     */
    public destroy(): void {
        this.unbind();

        // 1. Dispose programs
        for (const program of Array.from(this._programs.values())) {
            program.dispose();
        }
        this._programs.clear();

        // 2. Dispose fragment stages
        for (const fs of Array.from(this._fragmentShaders.values())) {
            fs.dispose();
        }
        this._fragmentShaders.clear();

        // 3. Dispose vertex stages
        for (const vs of Array.from(this._vertexShaders.values())) {
            vs.dispose();
        }
        this._vertexShaders.clear();

        this._contextManager = null;
    }

    /**
     * Telemetry query returning active counts and binding state.
     */
    public getDiagnostics(): SubsystemDiagnostics {
        const invalidStages: string[] = [];
        for (const vs of this._vertexShaders.values()) {
            if (!vs.isValid) invalidStages.push(vs.label);
        }
        for (const fs of this._fragmentShaders.values()) {
            if (!fs.isValid) invalidStages.push(fs.label);
        }

        return {
            name: this.name,
            resourceCount: this._programs.size + this._vertexShaders.size + this._fragmentShaders.size,
            activeBindings: this._currentShader ? 1 : 0,
            details: {
                programCount: this._programs.size,
                vertexShaderCount: this._vertexShaders.size,
                fragmentShaderCount: this._fragmentShaders.size,
                invalidStages,
                currentShaderLabel: this._currentShader?.label ?? null,
            },
        };
    }
}
