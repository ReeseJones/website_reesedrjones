export type UniformType =
    | "float"
    | "int"
    | "vec2"
    | "vec3"
    | "vec4"
    | "mat4";

export interface UniformDeclaration {
    /** Exact GLSL uniform symbol name in shader source (e.g. "u_time") */
    name: string;
    /** Uniform data type */
    type: UniformType;
    /** Description explaining the uniform's purpose */
    description: string;
}

export interface ShaderProgramOptions {
    /** Vertex shader GLSL source code */
    vertSource: string;
    /** Fragment shader GLSL source code */
    fragSource: string;
    /** Optional array of declared uniform specifications for documentation and validation */
    declaredUniforms?: UniformDeclaration[];
    /** Debug label used in console log diagnostic messages */
    label?: string;
}

interface CachedUniform {
    type: UniformType;
    value: number | number[] | Float32Array;
}

/**
 * Robust WebGL2 Shader Program wrapper.
 * Manages GLSL shader compilation, link status checking, location caching, redundant upload elimination,
 * client-side uniform memory caching, and automated context restoration.
 */
export class ShaderProgram {
    public readonly label: string;
    public readonly vertSource: string;
    public readonly fragSource: string;
    public readonly declaredUniforms: readonly UniformDeclaration[];

    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private uniformLocations = new Map<string, WebGLUniformLocation>();
    private uniformCache = new Map<string, CachedUniform>();

    constructor(gl: WebGL2RenderingContext, options: ShaderProgramOptions) {
        this.gl = gl;
        this.vertSource = options.vertSource;
        this.fragSource = options.fragSource;
        this.declaredUniforms = options.declaredUniforms ?? [];
        this.label = options.label ?? "ShaderProgram";

        this.build();
    }

    /**
     * Binds the underlying GPU program (gl.useProgram).
     */
    public use(): void {
        if (this.program) {
            this.gl.useProgram(this.program);
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
     */
    public rebuild(gl: WebGL2RenderingContext): boolean {
        this.gl = gl;
        this.destroy();
        const success = this.build();
        if (success) {
            this.restoreCachedUniforms();
        }
        return success;
    }

    /**
     * Retrieves cached WebGLUniformLocation for a symbol name.
     */
    public getUniformLocation(name: string): WebGLUniformLocation | null {
        if (!this.program) return null;
        if (!this.uniformLocations.has(name)) {
            const loc = this.gl.getUniformLocation(this.program, name);
            if (loc !== null) {
                this.uniformLocations.set(name, loc);
            } else {
                return null;
            }
        }
        return this.uniformLocations.get(name) ?? null;
    }

    // --- Uniform Setters with Client-Side Caching & Redundant Upload Guard ---

    public setFloat(name: string, value: number): void {
        const cached = this.uniformCache.get(name);
        if (cached && cached.value === value) return; // Skip redundant upload

        this.uniformCache.set(name, { type: "float", value });
        const loc = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniform1f(loc, value);
        }
    }

    public setInt(name: string, value: number): void {
        const cached = this.uniformCache.get(name);
        if (cached && cached.value === value) return;

        this.uniformCache.set(name, { type: "int", value });
        const loc = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniform1i(loc, value);
        }
    }

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
            this.gl.uniform2f(loc, x, y);
        }
    }

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
            this.gl.uniform3fv(loc, val);
        }
    }

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
            this.gl.uniform4f(loc, x, y, z, w);
        }
    }

    public setMat4(name: string, data: Float32Array): void {
        this.uniformCache.set(name, { type: "mat4", value: new Float32Array(data) });
        const loc = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniformMatrix4fv(loc, false, data);
        }
    }

    /**
     * Deletes GPU program resources and clears location maps. Keeps uniformCache intact for potential restoration.
     */
    public destroy(): void {
        if (this.program) {
            if (!this.gl.isContextLost()) {
                this.gl.deleteProgram(this.program);
            }
            this.program = null;
        }
        this.uniformLocations.clear();
    }

    // --- Private Build & Recovery Helpers ---

    private build(): boolean {
        const vs = this.compileShader(this.gl.VERTEX_SHADER, this.vertSource);
        const fs = this.compileShader(this.gl.FRAGMENT_SHADER, this.fragSource);
        if (!vs || !fs) return false;

        const program = this.gl.createProgram();
        if (!program) return false;

        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);

        const linked = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
        if (!linked) {
            console.error(
                `[${this.label}] Program link failed: ${this.gl.getProgramInfoLog(program)}`
            );
            this.gl.deleteShader(vs);
            this.gl.deleteShader(fs);
            this.gl.deleteProgram(program);
            return false;
        }

        // Shaders can be detached after successful link
        this.gl.detachShader(program, vs);
        this.gl.detachShader(program, fs);
        this.gl.deleteShader(vs);
        this.gl.deleteShader(fs);

        this.program = program;

        // Cache declared uniform locations immediately
        for (const decl of this.declaredUniforms) {
            this.getUniformLocation(decl.name);
        }

        return true;
    }

    private restoreCachedUniforms(): void {
        if (!this.program) return;
        this.use();
        for (const [name, cached] of this.uniformCache.entries()) {
            const loc = this.getUniformLocation(name);
            if (!loc) continue;

            switch (cached.type) {
                case "float":
                    this.gl.uniform1f(loc, cached.value as number);
                    break;
                case "int":
                    this.gl.uniform1i(loc, cached.value as number);
                    break;
                case "vec2":
                    const v2 = cached.value as [number, number];
                    this.gl.uniform2f(loc, v2[0], v2[1]);
                    break;
                case "vec3":
                    this.gl.uniform3fv(loc, cached.value as number[]);
                    break;
                case "vec4":
                    const v4 = cached.value as [number, number, number, number];
                    this.gl.uniform4f(loc, v4[0], v4[1], v4[2], v4[3]);
                    break;
                case "mat4":
                    this.gl.uniformMatrix4fv(loc, false, cached.value as Float32Array);
                    break;
            }
        }
    }

    private compileShader(type: number, source: string): WebGLShader | null {
        const shader = this.gl.createShader(type);
        if (!shader) return null;

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        const compiled = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
        if (!compiled) {
            const typeName = type === this.gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT";
            console.error(
                `[${this.label}] ${typeName} shader compile failed: ${this.gl.getShaderInfoLog(shader)}`
            );
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }
}
