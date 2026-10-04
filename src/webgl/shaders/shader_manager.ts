import type { ShaderProgram } from "./shader_program";
import type { ShaderProgramOptions } from "./shader_program_types";
import type { ShaderKey, ShaderUniformsOf } from "./shader_types";
import type { IShaderManager } from "./shader_manager_types";
import type { IWebGLContextManager } from "../core/context_manager_types";
import { SubsystemRestorationPriority, type SubsystemDiagnostics } from "../core/subsystem_types";
import { ShaderProgram as ShaderProgramImpl } from "./shader_program";
import galaxyPinprickVert from "../../galaxy_backdrop/shaders/galaxy_pinprick.vert";
import galaxyPinprickFrag from "../../galaxy_backdrop/shaders/galaxy_pinprick.frag";
import galaxyOrbVert from "../../galaxy_backdrop/shaders/galaxy_orb.vert";
import galaxyOrbFrag from "../../galaxy_backdrop/shaders/galaxy_orb.frag";
import galacticCloudVert from "../../galaxy_backdrop/shaders/galactic_cloud.vert";
import galacticCloudFrag from "../../galaxy_backdrop/shaders/galactic_cloud.frag";
import unlitVert from "../../scene/shaders/unlit.vert";
import unlitFrag from "../../scene/shaders/unlit.frag";
import skyboxVert from "../../scene/shaders/skybox.vert";
import skyboxFrag from "../../scene/shaders/skybox.frag";

const STANDARD_SHADER_DEFS: Record<ShaderKey, ShaderProgramOptions> = {
    galaxy_pinprick: {
        vertSource: galaxyPinprickVert,
        fragSource: galaxyPinprickFrag,
        label: "galaxy_pinprick",
    },
    galaxy_orb: {
        vertSource: galaxyOrbVert,
        fragSource: galaxyOrbFrag,
        label: "galaxy_orb",
    },
    galactic_cloud: {
        vertSource: galacticCloudVert,
        fragSource: galacticCloudFrag,
        label: "galactic_cloud",
    },
    unlit: {
        vertSource: unlitVert,
        fragSource: unlitFrag,
        label: "unlit",
    },
    skybox: {
        vertSource: skyboxVert,
        fragSource: skyboxFrag,
        label: "skybox",
    },
};

/**
 * Subsystem managing GLSL shader programs, location caching, redundant driver call elimination,
 * and automated Phase 1 context restoration.
 */
export class ShaderManager implements IShaderManager {
    public readonly name = "shader";
    public readonly restorationPriority = SubsystemRestorationPriority.Shader;

    private readonly _contextManager: IWebGLContextManager;
    private readonly _registry = new Map<ShaderKey, ShaderProgram<never>>();
    private _currentShader: ShaderProgram<never> | null = null;
    private _currentProgram: WebGLProgram | null = null;

    constructor(contextManager: IWebGLContextManager) {
        this._contextManager = contextManager;
    }

    public get activeShader(): ShaderProgram<never> | null {
        return this._currentShader;
    }

    public get activeProgram(): WebGLProgram | null {
        return this._currentProgram;
    }

    public get shaderCount(): number {
        return this._registry.size;
    }

    /**
     * Factory & Registry: Retrieves an existing cached ShaderProgram or compiles and caches a new one.
     */
    public getOrCreate<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey,
        options: ShaderProgramOptions
    ): ShaderProgram<TUniforms> {
        let shader = this._registry.get(key);
        if (!shader) {
            const gl = this._contextManager.getContext();
            if (!gl) {
                throw new Error(`[ShaderManager] Cannot compile shader '${key}' before WebGL context is initialized.`);
            }
            shader = new ShaderProgramImpl<never>(this._contextManager, options);
            this._registry.set(key, shader);
        }
        return shader as unknown as ShaderProgram<TUniforms>;
    }

    /**
     * Registry Query: Retrieves an existing compiled ShaderProgram if registered.
     */
    public get<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey
    ): ShaderProgram<TUniforms> | null {
        const shader = this._registry.get(key);
        return shader ? (shader as unknown as ShaderProgram<TUniforms>) : null;
    }

    /**
     * Checks if a shader with the given key is currently registered.
     */
    public has(key: ShaderKey): boolean {
        return this._registry.has(key);
    }

    /**
     * Deterministic Disposal: Destroys the specified ShaderProgram and frees GPU driver handles.
     */
    public dispose<TUniforms extends object = Record<string, unknown>>(
        keyOrInstance: ShaderKey | ShaderProgram<TUniforms>
    ): void {
        let targetKey: ShaderKey | null = null;
        let targetShader: ShaderProgram<never> | null = null;

        if (typeof keyOrInstance === "string") {
            targetKey = keyOrInstance;
            targetShader = this._registry.get(targetKey) ?? null;
        } else {
            targetShader = keyOrInstance as unknown as ShaderProgram<never>;
            for (const [k, s] of this._registry.entries()) {
                if (s === targetShader) {
                    targetKey = k;
                    break;
                }
            }
        }

        if (targetShader) {
            if (this._currentShader === targetShader) {
                this.unbind();
            }
            targetShader.destroy();
        }

        if (targetKey) {
            this._registry.delete(targetKey);
        }
    }

    /**
     * Binds the specified ShaderProgram to the WebGL context with redundant-call skipping.
     */
    public bind<TUniforms extends object = never>(shader: ShaderProgram<TUniforms> | null): void {
        if (this._currentShader === (shader as unknown as ShaderProgram<never>)) {
            return;
        }

        const program = shader ? shader.getProgram() : null;
        if (this._currentProgram !== program) {
            const gl = this._contextManager.getContext();
            if (gl) {
                gl.useProgram(program);
            }
            this._currentProgram = program;
        }
        this._currentShader = shader as unknown as ShaderProgram<never>;
    }

    /**
     * Activates a ShaderProgram by canonical key, lazily compiling standard shaders if needed.
     * Infers the strongly-typed uniform interface for the shader program.
     */
    public bindKey<K extends ShaderKey>(key: K): ShaderProgram<ShaderUniformsOf<K>> {
        let shader = this.get<ShaderUniformsOf<K>>(key);
        if (!shader && key in STANDARD_SHADER_DEFS) {
            shader = this.getOrCreate<ShaderUniformsOf<K>>(key, STANDARD_SHADER_DEFS[key]);
        }
        if (!shader) {
            throw new Error(`[ShaderManager] Shader '${key}' is not registered with WebGLContextManager.`);
        }
        this.bind(shader);
        return shader;
    }

    /**
     * Low-level bind for a raw WebGLProgram with redundant-call skipping.
     */
    public bindProgram(program: WebGLProgram | null): void {
        if (this._currentProgram === program) {
            return;
        }

        const gl = this._contextManager.getContext();
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
     * WebGL context lost lifecycle hook: marks GPU programs as invalidated without deleting.
     */
    public onContextLost(): void {
        this._currentProgram = null;
        this._currentShader = null;
        for (const shader of this._registry.values()) {
            shader.destroy();
        }
    }

    /**
     * Automated Phase 1 Context Restoration:
     * Re-compiles all registered shaders and restores cached uniform locations.
     */
    public onContextRestored(_gl: WebGL2RenderingContext): void {
        this._currentProgram = null;
        this._currentShader = null;
        for (const shader of this._registry.values()) {
            shader.rebuild();
        }
    }

    /**
     * Disposes all registered shader programs and clears internal caches.
     */
    public destroy(): void {
        this._currentProgram = null;
        this._currentShader = null;
        for (const shader of this._registry.values()) {
            shader.destroy();
        }
        this._registry.clear();
    }

    /**
     * Telemetry query returning active shader count and binding state.
     */
    public getDiagnostics(): SubsystemDiagnostics {
        return {
            name: this.name,
            resourceCount: this._registry.size,
            activeBindings: this._currentShader ? 1 : 0,
            details: {
                currentShaderLabel: this._currentShader?.label ?? null,
            },
        };
    }

    // --- Backwards-Compatible Aliases ---

    public useShader<TUniforms extends object = never>(shader: ShaderProgram<TUniforms> | null): void {
        this.bind(shader);
    }

    public useProgram(program: WebGLProgram | null): void {
        this.bindProgram(program);
    }

    public getOrCreateShader<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey,
        options: ShaderProgramOptions
    ): ShaderProgram<TUniforms> {
        return this.getOrCreate<TUniforms>(key, options);
    }

    public getShader<TUniforms extends object = Record<string, unknown>>(
        key: ShaderKey
    ): ShaderProgram<TUniforms> | null {
        return this.get<TUniforms>(key);
    }

    public releaseShader<TUniforms extends object = Record<string, unknown>>(
        keyOrInstance: ShaderKey | ShaderProgram<TUniforms>
    ): void {
        this.dispose(keyOrInstance);
    }
}
