import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ShaderProgram } from "./shader_program";
import type { IWebGLContextManager } from "../core/context_manager_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { createMockContextManager } from "../../testing/mocks/mock_context_manager";

describe("ShaderProgram", () => {
    let gl: WebGL2RenderingContext;
    let cm: IWebGLContextManager;
    const testVertSource = `#version 300 es\nin vec3 a_position;\nvoid main() { gl_Position = vec4(a_position, 1.0); }`;
    const testFragSource = `#version 300 es\nout vec4 fragColor;\nvoid main() { fragColor = vec4(1.0); }`;

    beforeEach(() => {
        gl = createMockWebGL2Context();
        cm = createMockContextManager(gl);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor and program compilation / linking", () => {
        it("compiles vertex and fragment shaders, creates WebGLProgram, attaches shaders, links program, checks LINK_STATUS, and detaches & deletes intermediate shaders", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
                label: "TestShader",
            });

            expect(gl.createShader).toHaveBeenCalledWith(gl.VERTEX_SHADER);
            expect(gl.createShader).toHaveBeenCalledWith(gl.FRAGMENT_SHADER);
            expect(gl.shaderSource).toHaveBeenCalledWith(expect.anything(), testVertSource);
            expect(gl.shaderSource).toHaveBeenCalledWith(expect.anything(), testFragSource);
            expect(gl.compileShader).toHaveBeenCalledTimes(2);

            expect(gl.createProgram).toHaveBeenCalledTimes(1);
            const program = shader.getProgram();
            expect(program).not.toBeNull();

            expect(gl.attachShader).toHaveBeenCalledTimes(2);
            expect(gl.linkProgram).toHaveBeenCalledWith(program);
            expect(gl.getProgramParameter).toHaveBeenCalledWith(program, gl.LINK_STATUS);

            expect(gl.detachShader).toHaveBeenCalledTimes(2);
            expect(gl.deleteShader).toHaveBeenCalledTimes(2);
        });

        it("initializes public properties: label (or default 'ShaderProgram'), vertSource, fragSource", () => {
            const customShader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
                label: "CustomGalaxyShader",
            });

            expect(customShader.label).toBe("CustomGalaxyShader");
            expect(customShader.vertSource).toBe(testVertSource);
            expect(customShader.fragSource).toBe(testFragSource);

            const defaultShader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            expect(defaultShader.label).toBe("ShaderProgram");
            expect(defaultShader.vertSource).toBe(testVertSource);
            expect(defaultShader.fragSource).toBe(testFragSource);
        });

        it("isValid returns true and getProgram() returns WebGLProgram handle on successful link", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            expect(shader.isValid).toBe(true);
            const program = shader.getProgram();
            expect(program).toBeDefined();
            expect(program).not.toBeNull();
        });

        it("reflection: queries ACTIVE_UNIFORMS, calls contextManager.useShader(this), maps sampler uniforms to default texture units or custom samplers override", () => {
            vi.mocked(gl.getProgramParameter).mockImplementation((_prog, pname) => {
                if (pname === gl.LINK_STATUS) return true;
                if (pname === gl.ACTIVE_UNIFORMS) return 3;
                return true;
            });

            vi.mocked(gl.getActiveUniform).mockImplementation((_prog, index) => {
                if (index === 0) {
                    return { name: "u_texture", type: gl.SAMPLER_2D, size: 1 } as WebGLActiveInfo;
                }
                if (index === 1) {
                    return { name: "u_cubeTexture", type: gl.SAMPLER_CUBE, size: 1 } as WebGLActiveInfo;
                }
                if (index === 2) {
                    return { name: "u_shadowMap[0]", type: gl.SAMPLER_2D_SHADOW, size: 1 } as WebGLActiveInfo;
                }
                return null;
            });

            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
                samplers: {
                    u_cubeTexture: 11,
                },
            });

            expect(cm.useShader).toHaveBeenCalledWith(shader);
            // u_texture defaults to 0 via DEFAULT_TEXTURE_UNIT_MAP
            expect(gl.uniform1i).toHaveBeenCalledWith(expect.objectContaining({ name: "u_texture" }), 0);
            // u_cubeTexture overridden to 11 via options.samplers
            expect(gl.uniform1i).toHaveBeenCalledWith(expect.objectContaining({ name: "u_cubeTexture" }), 11);
            // u_shadowMap[0] stripped to u_shadowMap, mapped to 12 via DEFAULT_TEXTURE_UNIT_MAP
            expect(gl.uniform1i).toHaveBeenCalledWith(expect.objectContaining({ name: "u_shadowMap" }), 12);
        });
    });

    describe("compilation or linking failure", () => {
        it("link failure: when gl.getProgramParameter(LINK_STATUS) is false: logs error, cleans up shaders and program, isValid() is false, getProgram() is null", () => {
            vi.mocked(gl.getProgramParameter).mockImplementation((_p, pname) => {
                if (pname === gl.LINK_STATUS) return false;
                return true;
            });
            vi.mocked(gl.getProgramInfoLog).mockReturnValue("Mismatched varying types");
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
                label: "FailingLinkShader",
            });

            expect(consoleSpy).toHaveBeenCalledWith("[FailingLinkShader] Program link failed: Mismatched varying types");
            expect(gl.deleteShader).toHaveBeenCalledTimes(2);
            expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
            expect(shader.isValid).toBe(false);
            expect(shader.getProgram()).toBeNull();
        });

        it("shader compilation failure (compileShader returns null): does not create program, isValid returns false, getProgram() returns null", () => {
            vi.mocked(gl.getShaderParameter).mockReturnValue(false);
            vi.mocked(gl.getShaderInfoLog).mockReturnValue("Syntax error in vertex shader");
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const shader = new ShaderProgram(cm, {
                vertSource: "invalid vertex source",
                fragSource: testFragSource,
                label: "CompileFailShader",
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("[CompileFailShader] VERTEX shader compile failed")
            );
            expect(gl.createProgram).not.toHaveBeenCalled();
            expect(shader.isValid).toBe(false);
            expect(shader.getProgram()).toBeNull();
        });

        it("context not available (gl is null): isValid returns false and getProgram() returns null", () => {
            vi.mocked(cm.getContext).mockReturnValue(null);

            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            expect(shader.isValid).toBe(false);
            expect(shader.getProgram()).toBeNull();
        });
    });

    describe("getUniformLocation and caching", () => {
        it("queries gl.getUniformLocation on first lookup and caches location handle in internal map", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            const loc = shader.getUniformLocation("u_time");

            expect(gl.getUniformLocation).toHaveBeenCalledTimes(1);
            expect(gl.getUniformLocation).toHaveBeenCalledWith(shader.getProgram(), "u_time");
            expect(loc).not.toBeNull();
        });

        it("subsequent calls return cached location without invoking gl.getUniformLocation again", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            const locFirst = shader.getUniformLocation("u_time");
            const locSecond = shader.getUniformLocation("u_time");

            expect(locFirst).toBe(locSecond);
            expect(gl.getUniformLocation).toHaveBeenCalledTimes(1);
        });

        it("returns null if program is null or if uniform is not found in GL program", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            vi.mocked(gl.getUniformLocation).mockReturnValue(null);
            const missingLoc = shader.getUniformLocation("u_nonExistent");
            expect(missingLoc).toBeNull();

            shader.dispose();
            const destroyedLoc = shader.getUniformLocation("u_time");
            expect(destroyedLoc).toBeNull();
        });
    });

    describe("individual uniform setters and redundant upload suppression", () => {
        let shader: ShaderProgram;

        beforeEach(() => {
            shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });
        });

        describe("setFloat", () => {
            it("calls gl.uniform1f with location and value", () => {
                shader.setFloat("u_alpha", 0.75);

                expect(gl.uniform1f).toHaveBeenCalledTimes(1);
                expect(gl.uniform1f).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "u_alpha" }),
                    0.75
                );
            });

            it("caches value in uniformCache and suppresses redundant upload if value is identical", () => {
                shader.setFloat("u_alpha", 0.75);
                shader.setFloat("u_alpha", 0.75);

                expect(gl.uniform1f).toHaveBeenCalledTimes(1);

                shader.setFloat("u_alpha", 0.9);
                expect(gl.uniform1f).toHaveBeenCalledTimes(2);
                expect(gl.uniform1f).toHaveBeenLastCalledWith(
                    expect.objectContaining({ name: "u_alpha" }),
                    0.9
                );
            });
        });

        describe("setInt", () => {
            it("calls gl.uniform1i with location and value", () => {
                shader.setInt("u_mode", 3);

                expect(gl.uniform1i).toHaveBeenCalledTimes(1);
                expect(gl.uniform1i).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "u_mode" }),
                    3
                );
            });

            it("caches value and suppresses redundant upload if value is identical", () => {
                shader.setInt("u_mode", 3);
                shader.setInt("u_mode", 3);

                expect(gl.uniform1i).toHaveBeenCalledTimes(1);

                shader.setInt("u_mode", 5);
                expect(gl.uniform1i).toHaveBeenCalledTimes(2);
                expect(gl.uniform1i).toHaveBeenLastCalledWith(
                    expect.objectContaining({ name: "u_mode" }),
                    5
                );
            });
        });

        describe("setVec2", () => {
            it("calls gl.uniform2f with x, y", () => {
                shader.setVec2("u_resolution", 1920, 1080);

                expect(gl.uniform2f).toHaveBeenCalledTimes(1);
                expect(gl.uniform2f).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "u_resolution" }),
                    1920,
                    1080
                );
            });

            it("caches [x, y] and suppresses redundant upload if identical", () => {
                shader.setVec2("u_resolution", 1920, 1080);
                shader.setVec2("u_resolution", 1920, 1080);

                expect(gl.uniform2f).toHaveBeenCalledTimes(1);

                shader.setVec2("u_resolution", 1920, 1200);
                expect(gl.uniform2f).toHaveBeenCalledTimes(2);
                expect(gl.uniform2f).toHaveBeenLastCalledWith(
                    expect.objectContaining({ name: "u_resolution" }),
                    1920,
                    1200
                );
            });
        });

        describe("setVec3", () => {
            it("accepts (name, x, y, z) scalars or (name, [x, y, z]) array / Float32Array", () => {
                shader.setVec3("u_lightA", 1.0, 2.0, 3.0);
                expect(gl.uniform3fv).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "u_lightA" }),
                    [1.0, 2.0, 3.0]
                );

                shader.setVec3("u_lightB", [4.0, 5.0, 6.0]);
                expect(gl.uniform3fv).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "u_lightB" }),
                    [4.0, 5.0, 6.0]
                );

                shader.setVec3("u_lightC", new Float32Array([7.0, 8.0, 9.0]));
                expect(gl.uniform3fv).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "u_lightC" }),
                    [7.0, 8.0, 9.0]
                );
            });

            it("calls gl.uniform3fv with vector values and suppresses redundant upload if elements match", () => {
                shader.setVec3("u_light", 1.0, 2.0, 3.0);
                shader.setVec3("u_light", [1.0, 2.0, 3.0]);

                expect(gl.uniform3fv).toHaveBeenCalledTimes(1);

                shader.setVec3("u_light", 1.0, 2.0, 3.5);
                expect(gl.uniform3fv).toHaveBeenCalledTimes(2);
                expect(gl.uniform3fv).toHaveBeenLastCalledWith(
                    expect.objectContaining({ name: "u_light" }),
                    [1.0, 2.0, 3.5]
                );
            });
        });

        describe("setVec4", () => {
            it("calls gl.uniform4f with x, y, z, w", () => {
                shader.setVec4("u_color", 1.0, 0.5, 0.25, 1.0);

                expect(gl.uniform4f).toHaveBeenCalledTimes(1);
                expect(gl.uniform4f).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "u_color" }),
                    1.0,
                    0.5,
                    0.25,
                    1.0
                );
            });

            it("caches [x, y, z, w] and suppresses redundant upload if elements match", () => {
                shader.setVec4("u_color", 1.0, 0.5, 0.25, 1.0);
                shader.setVec4("u_color", 1.0, 0.5, 0.25, 1.0);

                expect(gl.uniform4f).toHaveBeenCalledTimes(1);

                shader.setVec4("u_color", 1.0, 0.5, 0.25, 0.8);
                expect(gl.uniform4f).toHaveBeenCalledTimes(2);
                expect(gl.uniform4f).toHaveBeenLastCalledWith(
                    expect.objectContaining({ name: "u_color" }),
                    1.0,
                    0.5,
                    0.25,
                    0.8
                );
            });
        });

        describe("setMat3", () => {
            it("calls gl.uniformMatrix3fv with Float32Array and caches Float32Array copy", () => {
                const mat = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
                shader.setMat3("u_normalMatrix", mat);

                expect(gl.uniformMatrix3fv).toHaveBeenCalledTimes(1);
                expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "u_normalMatrix" }),
                    false,
                    mat
                );

                // Mutating original array should not affect cached copy
                mat[0] = 999;
                shader.onContextLost();
                shader.onContextRestored(gl);
                expect(gl.uniformMatrix3fv).toHaveBeenLastCalledWith(
                    expect.objectContaining({ name: "u_normalMatrix" }),
                    false,
                    new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
                );
            });
        });

        describe("setMat4", () => {
            it("calls gl.uniformMatrix4fv with Float32Array and caches Float32Array copy", () => {
                const mat = new Float32Array([
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1,
                ]);
                shader.setMat4("u_mvp", mat);

                expect(gl.uniformMatrix4fv).toHaveBeenCalledTimes(1);
                expect(gl.uniformMatrix4fv).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "u_mvp" }),
                    false,
                    mat
                );

                // Mutating original array should not affect cached copy
                mat[0] = 555;
                shader.onContextLost();
                shader.onContextRestored(gl);
                expect(gl.uniformMatrix4fv).toHaveBeenLastCalledWith(
                    expect.objectContaining({ name: "u_mvp" }),
                    false,
                    new Float32Array([
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1,
                    ])
                );
            });
        });
    });

    describe("setUniforms batch setter", () => {
        let shader: ShaderProgram;

        beforeEach(() => {
            shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });
        });

        it("automatically binds program via contextManager.useShader(this) before uploading", () => {
            shader.setUniforms({ u_time: 1.0 });

            expect(cm.useShader).toHaveBeenCalledWith(shader);
        });

        it("correctly dispatches number -> setFloat", () => {
            shader.setUniforms({ u_time: 2.5 });

            expect(gl.uniform1f).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_time" }),
                2.5
            );
        });

        it("correctly dispatches boolean -> setFloat (1.0 for true, 0.0 for false)", () => {
            shader.setUniforms({
                u_enableFog: true,
                u_wireframe: false,
            });

            expect(gl.uniform1f).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_enableFog" }),
                1.0
            );
            expect(gl.uniform1f).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_wireframe" }),
                0.0
            );
        });

        it("correctly dispatches 2-element array -> setVec2", () => {
            shader.setUniforms({
                u_offset: [10, 20],
            });

            expect(gl.uniform2f).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_offset" }),
                10,
                20
            );
        });

        it("correctly dispatches 3-element array -> setVec3", () => {
            shader.setUniforms({
                u_lightDir: [0.0, 1.0, 0.0],
            });

            expect(gl.uniform3fv).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_lightDir" }),
                [0.0, 1.0, 0.0]
            );
        });

        it("correctly dispatches 4-element array -> setVec4", () => {
            shader.setUniforms({
                u_color: [1.0, 0.5, 0.2, 1.0],
            });

            expect(gl.uniform4f).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_color" }),
                1.0,
                0.5,
                0.2,
                1.0
            );
        });

        it("correctly dispatches 9-element array / Float32Array -> setMat3", () => {
            const rawArray9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            shader.setUniforms({
                u_normMatA: rawArray9,
                u_normMatB: new Float32Array(rawArray9),
            });

            expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_normMatA" }),
                false,
                new Float32Array(rawArray9)
            );
            expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_normMatB" }),
                false,
                new Float32Array(rawArray9)
            );
        });

        it("correctly dispatches 16-element array / Float32Array -> setMat4", () => {
            const rawArray16 = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ];
            shader.setUniforms({
                u_matA: rawArray16,
                u_matB: new Float32Array(rawArray16),
            });

            expect(gl.uniformMatrix4fv).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_matA" }),
                false,
                new Float32Array(rawArray16)
            );
            expect(gl.uniformMatrix4fv).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_matB" }),
                false,
                new Float32Array(rawArray16)
            );
        });

        it("gracefully ignores null or undefined values", () => {
            expect(() => {
                shader.setUniforms({
                    u_nullVal: null,
                    u_undefVal: undefined,
                    u_valid: 42,
                });
            }).not.toThrow();

            expect(gl.uniform1f).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_valid" }),
                42
            );
            expect(gl.uniform1f).toHaveBeenCalledTimes(1);
        });
    });

    describe(".onContextLost()", () => {
        it("invalidates program handle and clears uniform location cache without calling gl.deleteProgram", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            expect(shader.isValid).toBe(true);
            const progHandle = shader.getProgram();

            shader.onContextLost();

            expect(shader.isValid).toBe(false);
            expect(shader.getProgram()).toBeNull();
            expect(gl.deleteProgram).not.toHaveBeenCalled();
            expect(shader.getUniformLocation("u_time")).toBeNull();
        });
    });

    describe(".onContextRestored()", () => {
        it("recompiles program and restores all cached uniforms to the new program", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            const initialProgram = shader.getProgram();

            shader.setFloat("u_intensity", 0.5);
            shader.setInt("u_layers", 4);
            shader.setVec2("u_scale", 2.0, 3.0);
            shader.setVec3("u_ambient", 0.1, 0.2, 0.3);
            shader.setVec4("u_diffuse", 0.4, 0.5, 0.6, 1.0);
            const mat3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
            shader.setMat3("u_normalMatrix", mat3);
            const mat4 = new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ]);
            shader.setMat4("u_mvp", mat4);

            shader.onContextLost();
            expect(shader.isValid).toBe(false);

            const restoredGl = createMockWebGL2Context();
            vi.clearAllMocks();

            shader.onContextRestored(restoredGl);

            expect(shader.isValid).toBe(true);
            expect(shader.getProgram()).not.toBeNull();
            expect(shader.getProgram()).not.toBe(initialProgram);

            expect(restoredGl.uniform1f).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_intensity" }),
                0.5
            );
            expect(restoredGl.uniform1i).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_layers" }),
                4
            );
            expect(restoredGl.uniform2f).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_scale" }),
                2.0,
                3.0
            );
            expect(restoredGl.uniform3fv).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_ambient" }),
                [0.1, 0.2, 0.3]
            );
            expect(restoredGl.uniform4f).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_diffuse" }),
                0.4,
                0.5,
                0.6,
                1.0
            );
            expect(restoredGl.uniformMatrix3fv).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_normalMatrix" }),
                false,
                mat3
            );
            expect(restoredGl.uniformMatrix4fv).toHaveBeenCalledWith(
                expect.objectContaining({ name: "u_mvp" }),
                false,
                mat4
            );
            expect(cm.useShader).toHaveBeenCalledWith(shader);
        });

        it("does nothing if shader is already disposed", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            shader.dispose();
            expect(shader.isDisposed).toBe(true);

            const restoredGl = createMockWebGL2Context();
            shader.onContextRestored(restoredGl);

            expect(shader.isValid).toBe(false);
            expect(restoredGl.createProgram).not.toHaveBeenCalled();
        });
    });

    describe(".onDispose()", () => {
        it("registers callback invoked when dispose() is called", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });
            const callback = vi.fn();

            shader.onDispose(callback);
            expect(callback).not.toHaveBeenCalled();

            shader.dispose();
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it("returns an unsubscribe function that unregisters the callback", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });
            const callback = vi.fn();

            const unsubscribe = shader.onDispose(callback);
            unsubscribe();

            shader.dispose();
            expect(callback).not.toHaveBeenCalled();
        });

        it("invokes callback immediately if shader is already disposed", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });
            shader.dispose();

            const callback = vi.fn();
            shader.onDispose(callback);
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe(".dispose()", () => {
        it("calls gl.deleteProgram with current program handle and unbinds from contextManager", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            vi.mocked(cm.getCurrentShader).mockReturnValue(shader as any);
            const progHandle = shader.getProgram();

            shader.dispose();

            expect(cm.useProgram).toHaveBeenCalledWith(null);
            expect(gl.deleteProgram).toHaveBeenCalledWith(progHandle);
            expect(shader.getProgram()).toBeNull();
            expect(shader.isValid).toBe(false);
            expect(shader.isDisposed).toBe(true);
        });

        it("does not call gl.deleteProgram if context is lost (gl.isContextLost() === true)", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });

            vi.mocked(gl.isContextLost).mockReturnValue(true);
            shader.dispose();

            expect(gl.deleteProgram).not.toHaveBeenCalled();
            expect(shader.getProgram()).toBeNull();
            expect(shader.isValid).toBe(false);
            expect(shader.isDisposed).toBe(true);
        });

        it("is idempotent: calling dispose multiple times does not error or delete twice", () => {
            const shader = new ShaderProgram(cm, {
                vertSource: testVertSource,
                fragSource: testFragSource,
            });
            const callback = vi.fn();
            shader.onDispose(callback);

            shader.dispose();
            expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledTimes(1);

            expect(() => {
                shader.dispose();
                shader.dispose();
            }).not.toThrow();

            expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });
});
