import type {
    ShaderProgramOptions,
    CachedUniform,
} from "./shader_program_types";
import type { IWebGLContextManager } from "./context_manager_types";
import { compileShader } from "./shader_compiler";

/**
 * Robust WebGL2 Shader Program wrapper.
 * Manages GLSL shader compilation, link status checking, location caching, redundant upload elimination,
 * client-side uniform memory caching, and automated context restoration.
 */
export class ShaderProgram<TUniforms extends object = Record<string, unknown>> {
    public readonly label: string;
    public readonly vertSource: string;
    public readonly fragSource: string;

    private contextManager: IWebGLContextManager;
    private program: WebGLProgram | null = null;
    private uniformLocations = new Map<string, WebGLUniformLocation>();
    private uniformCache = new Map<string, CachedUniform>();

    private get gl(): WebGL2RenderingContext | null {
        return this.contextManager.getContext();
    }

    constructor(
        contextManager: IWebGLContextManager,
        options: ShaderProgramOptions
    ) {
        this.contextManager = contextManager;
        this.vertSource = options.vertSource;
        this.fragSource = options.fragSource;
        this.label = options.label ?? "ShaderProgram";

        this.build();
    }

    /**
     * Batch uploads a strongly typed dictionary of uniform values.
     *
     * **Context Binding:** Automatically binds the program to the active context via contextManager (`contextManager.useShader(this)`) before uploading.
     */
    public setUniforms(uniforms: Partial<TUniforms>): void {
        this.contextManager.useShader(this);
        for (const [name, val] of Object.entries(uniforms)) {
            if (val === undefined || val === null) continue;
            if (typeof val === "number") {
                this.setFloat(name, val);
            } else if (typeof val === "boolean") {
                this.setFloat(name, val ? 1.0 : 0.0);
            } else if (Array.isArray(val) || val instanceof Float32Array) {
                if (val.length === 2 && typeof val[0] === "number" && typeof val[1] === "number") {
                    this.setVec2(name, val[0], val[1]);
                } else if (
                    val.length === 3 &&
                    typeof val[0] === "number" &&
                    typeof val[1] === "number" &&
                    typeof val[2] === "number"
                ) {
                    this.setVec3(name, val[0], val[1], val[2]);
                } else if (
                    val.length === 4 &&
                    typeof val[0] === "number" &&
                    typeof val[1] === "number" &&
                    typeof val[2] === "number" &&
                    typeof val[3] === "number"
                ) {
                    this.setVec4(name, val[0], val[1], val[2], val[3]);
                } else if (val.length === 16) {
                    this.setMat4(name, val instanceof Float32Array ? val : new Float32Array(val as number[]));
                }
            }
        }
    }

    /**
     * Returns true if the GPU WebGLProgram is compiled, linked, and ready.
     */
    public isValid(): boolean {
        return this.program !== null;
    }

    /**
     * Gets the raw WebGLProgram handle.
     */
    public getProgram(): WebGLProgram | null {
        return this.program;
    }

    /**
     * Re-compiles GLSL sources, re-links the WebGLProgram, re-queries location handles,
     * and automatically re-uploads all client-side cached uniform values to the new GPU program.
     *
     * **Context Binding:** Re-binds program via `restoreCachedUniforms()` which invokes `contextManager.useShader()`.
     */
    public rebuild(): boolean {
        this.destroy();
        const success = this.build();
        if (success) {
            this.restoreCachedUniforms();
        }
        return success;
    }

    /**
     * Retrieves cached WebGLUniformLocation for a symbol name.
     *
     * **Context Binding:** Does NOT bind program. Queries location handle independently without altering binding.
     */
    public getUniformLocation(name: string): WebGLUniformLocation | null {
        if (!this.program) return null;
        if (!this.uniformLocations.has(name)) {
            const gl = this.gl;
            if (!gl) return null;
            const loc = gl.getUniformLocation(this.program, name);
            if (loc !== null) {
                this.uniformLocations.set(name, loc);
            } else {
                return null;
            }
        }
        return this.uniformLocations.get(name) ?? null;
    }

    // --- Uniform Setters with Client-Side Caching & Redundant Upload Guard ---

    /**
     * Uploads a float uniform value if changed.
     *
     * **Context Binding:** Does NOT bind program. Caller must ensure `contextManager.useShader(this)`
     * has been called prior to invoking.
     */
    public setFloat(name: string, value: number): void {
        const cached = this.uniformCache.get(name);
        if (cached && cached.value === value) return; // Skip redundant upload

        this.uniformCache.set(name, { type: "float", value });
        const loc = this.getUniformLocation(name);
        if (loc) {
            this.gl?.uniform1f(loc, value);
        }
    }

    /**
     * Uploads an integer uniform value if changed.
     *
     * **Context Binding:** Does NOT bind program. Caller must ensure `contextManager.useShader(this)`
     * has been called prior to invoking.
     */
    public setInt(name: string, value: number): void {
        const cached = this.uniformCache.get(name);
        if (cached && cached.value === value) return;

        this.uniformCache.set(name, { type: "int", value });
        const loc = this.getUniformLocation(name);
        if (loc) {
            this.gl?.uniform1i(loc, value);
        }
    }

    /**
     * Uploads a 2-component float vector uniform value if changed.
     *
     * **Context Binding:** Does NOT bind program. Caller must ensure `contextManager.useShader(this)`
     * has been called prior to invoking.
     */
    public setVec2(name: string, x: number, y: number): void {
        const value: [number, number] = [x, y];
        const cached = this.uniformCache.get(name);
        if (
            cached &&
            Array.isArray(cached.value) &&
            cached.value[0] === x &&
            cached.value[1] === y
        ) {
            return;
        }

        this.uniformCache.set(name, { type: "vec2", value });
        const loc = this.getUniformLocation(name);
        if (loc) {
            this.gl?.uniform2f(loc, x, y);
        }
    }

    /**
     * Uploads a 3-component float vector uniform value if changed.
     *
     * **Context Binding:** Does NOT bind program. Caller must ensure `contextManager.useShader(this)`
     * has been called prior to invoking.
     */
    public setVec3(
        name: string,
        xOrArray: number | [number, number, number] | Float32Array,
        y?: number,
        z?: number
    ): void {
        let val: [number, number, number];
        if (typeof xOrArray === "number") {
            val = [xOrArray, y ?? 0, z ?? 0];
        } else if (Array.isArray(xOrArray)) {
            val = [xOrArray[0], xOrArray[1], xOrArray[2]];
        } else {
            val = [xOrArray[0], xOrArray[1], xOrArray[2]];
        }

        const cached = this.uniformCache.get(name);
        if (
            cached &&
            Array.isArray(cached.value) &&
            cached.value[0] === val[0] &&
            cached.value[1] === val[1] &&
            cached.value[2] === val[2]
        ) {
            return;
        }

        this.uniformCache.set(name, { type: "vec3", value: val });
        const loc = this.getUniformLocation(name);
        if (loc) {
            this.gl?.uniform3fv(loc, val);
        }
    }

    /**
     * Uploads a 4-component float vector uniform value if changed.
     *
     * **Context Binding:** Does NOT bind program. Caller must ensure `contextManager.useShader(this)`
     * has been called prior to invoking.
     */
    public setVec4(
        name: string,
        x: number,
        y: number,
        z: number,
        w: number
    ): void {
        const val: [number, number, number, number] = [x, y, z, w];
        const cached = this.uniformCache.get(name);
        if (
            cached &&
            Array.isArray(cached.value) &&
            cached.value[0] === x &&
            cached.value[1] === y &&
            cached.value[2] === z &&
            cached.value[3] === w
        ) {
            return;
        }

        this.uniformCache.set(name, { type: "vec4", value: val });
        const loc = this.getUniformLocation(name);
        if (loc) {
            this.gl?.uniform4f(loc, x, y, z, w);
        }
    }

    /**
     * Uploads a 4x4 matrix uniform value.
     *
     * **Context Binding:** Does NOT bind program. Caller must ensure `contextManager.useShader(this)`
     * has been called prior to invoking.
     */
    public setMat4(name: string, data: Float32Array): void {
        this.uniformCache.set(name, { type: "mat4", value: new Float32Array(data) });
        const loc = this.getUniformLocation(name);
        if (loc) {
            this.gl?.uniformMatrix4fv(loc, false, data);
        }
    }

    /**
     * Deletes GPU program resources and clears location maps. Keeps uniformCache intact for potential restoration.
     */
    public destroy(): void {
        if (this.program) {
            const gl = this.gl;
            if (gl && !gl.isContextLost()) {
                gl.deleteProgram(this.program);
            }
            this.program = null;
        }
        this.uniformLocations.clear();
    }

    // --- Private Build & Recovery Helpers ---

    private build(): boolean {
        const gl = this.gl;
        if (!gl) return false;

        const vs = compileShader(gl, gl.VERTEX_SHADER, this.vertSource, this.label);
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, this.fragSource, this.label);
        if (!vs || !fs) return false;

        const program = gl.createProgram();
        if (!program) return false;

        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linked) {
            console.error(
                `[${this.label}] Program link failed: ${gl.getProgramInfoLog(program)}`
            );
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            gl.deleteProgram(program);
            return false;
        }

        // Shaders can be detached after successful link
        gl.detachShader(program, vs);
        gl.detachShader(program, fs);
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        this.program = program;

        // Auto-reflect and cache all active GLSL uniform locations directly from the GPU handle
        this.reflectActiveUniforms(gl);

        return true;
    }

    private reflectActiveUniforms(gl: WebGL2RenderingContext): void {
        if (!this.program) return;
        const count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const info = gl.getActiveUniform(this.program, i);
            if (info) {
                const cleanName = info.name.replace(/\[0\]$/, "");
                this.getUniformLocation(cleanName);
            }
        }
    }

    private restoreCachedUniforms(): void {
        if (!this.program) return;
        const gl = this.gl;
        if (!gl) return;
        this.contextManager.useShader(this);
        for (const [name, cached] of this.uniformCache.entries()) {
            const loc = this.getUniformLocation(name);
            if (!loc) continue;

            switch (cached.type) {
                case "float":
                    gl.uniform1f(loc, cached.value as number);
                    break;
                case "int":
                    gl.uniform1i(loc, cached.value as number);
                    break;
                case "vec2":
                    const v2 = cached.value as [number, number];
                    gl.uniform2f(loc, v2[0], v2[1]);
                    break;
                case "vec3":
                    gl.uniform3fv(loc, cached.value as number[]);
                    break;
                case "vec4":
                    const v4 = cached.value as [number, number, number, number];
                    gl.uniform4f(loc, v4[0], v4[1], v4[2], v4[3]);
                    break;
                case "mat4":
                    gl.uniformMatrix4fv(loc, false, cached.value as Float32Array);
                    break;
            }
        }
    }
}
