import type { IMaterial, MaterialOptions, PipelineState } from "./material_types";

/**
 * Base material class encapsulating shader selection, uniform parameters,
 * and WebGL rasterization pipeline state.
 */
export class Material implements IMaterial {
    protected _shaderKey: string;
    protected _pipelineState: PipelineState;
    protected readonly _uniforms: Map<string, unknown> = new Map();

    constructor(options: MaterialOptions) {
        this._shaderKey = options.shaderKey;
        this._pipelineState = {
            blendMode: options.pipelineState?.blendMode ?? "opaque",
            depthTest: options.pipelineState?.depthTest ?? true,
            depthWrite: options.pipelineState?.depthWrite ?? true,
            cullFace: options.pipelineState?.cullFace ?? true,
        };

        if (options.uniforms) {
            for (const [key, value] of Object.entries(options.uniforms)) {
                this._uniforms.set(key, value);
            }
        }
    }

    public get shaderKey(): string {
        return this._shaderKey;
    }

    public set shaderKey(key: string) {
        this._shaderKey = key;
    }

    public get pipelineState(): PipelineState {
        return this._pipelineState;
    }

    /**
     * Sets or updates an individual uniform value.
     */
    public setUniform(name: string, value: unknown): this {
        this._uniforms.set(name, value);
        return this;
    }

    /**
     * Sets multiple uniform values from a key-value record.
     */
    public setUniforms(uniforms: Record<string, unknown>): this {
        for (const [key, value] of Object.entries(uniforms)) {
            this._uniforms.set(key, value);
        }
        return this;
    }

    /**
     * Returns an immutable snapshot of all assigned uniform values.
     */
    public getUniforms(): Readonly<Record<string, unknown>> {
        return Object.fromEntries(this._uniforms.entries());
    }

    /**
     * Asserts WebGL blending, depth buffer mask/test, and backface culling states.
     */
    public applyPipelineState(gl: WebGL2RenderingContext): void {
        switch (this._pipelineState.blendMode) {
            case "additive":
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE);
                break;
            case "alpha":
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                break;
            case "opaque":
            default:
                gl.disable(gl.BLEND);
                break;
        }

        if (this._pipelineState.depthTest) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
        gl.depthMask(this._pipelineState.depthWrite);

        if (this._pipelineState.cullFace) {
            gl.enable(gl.CULL_FACE);
        } else {
            gl.disable(gl.CULL_FACE);
        }
    }
}
