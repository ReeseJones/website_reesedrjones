import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { compileShader } from "./shader_compiler";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";

describe("compileShader", () => {
    let gl: WebGL2RenderingContext;

    beforeEach(() => {
        gl = createMockWebGL2Context();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("successful compilation", () => {
        it("compiles vertex shader successfully: passes type gl.VERTEX_SHADER, source string, invokes gl.shaderSource, gl.compileShader, checks COMPILE_STATUS, returns shader handle", () => {
            const vertexSource = "#version 300 es\nvoid main() { gl_Position = vec4(0.0); }";
            const shader = compileShader(gl, gl.VERTEX_SHADER, vertexSource, "TestVertexShader");

            expect(shader).toBeDefined();
            expect(shader).not.toBeNull();
            expect(gl.createShader).toHaveBeenCalledWith(gl.VERTEX_SHADER);
            expect(gl.shaderSource).toHaveBeenCalledWith(shader, vertexSource);
            expect(gl.compileShader).toHaveBeenCalledWith(shader);
            expect(gl.getShaderParameter).toHaveBeenCalledWith(shader, gl.COMPILE_STATUS);
        });

        it("compiles fragment shader successfully: passes type gl.FRAGMENT_SHADER, source string, returns shader handle", () => {
            const fragmentSource = "#version 300 es\nout vec4 fragColor;\nvoid main() { fragColor = vec4(1.0); }";
            const shader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, "TestFragmentShader");

            expect(shader).toBeDefined();
            expect(shader).not.toBeNull();
            expect(gl.createShader).toHaveBeenCalledWith(gl.FRAGMENT_SHADER);
            expect(gl.shaderSource).toHaveBeenCalledWith(shader, fragmentSource);
            expect(gl.compileShader).toHaveBeenCalledWith(shader);
            expect(gl.getShaderParameter).toHaveBeenCalledWith(shader, gl.COMPILE_STATUS);
        });

        it("does not call gl.deleteShader or console.error on success", () => {
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const shader = compileShader(gl, gl.VERTEX_SHADER, "void main() {}");

            expect(shader).not.toBeNull();
            expect(gl.deleteShader).not.toHaveBeenCalled();
            expect(consoleSpy).not.toHaveBeenCalled();
        });
    });

    describe("compilation failure", () => {
        it("handles vertex shader compile failure: logs diagnostic, deletes shader handle, and returns null", () => {
            const mockShaderHandle = { __brand: "WebGLShader", id: 101 } as unknown as WebGLShader;
            vi.mocked(gl.createShader).mockReturnValue(mockShaderHandle);
            vi.mocked(gl.getShaderParameter).mockReturnValue(false);
            vi.mocked(gl.getShaderInfoLog).mockReturnValue("ERROR: 0:1: syntax error");
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = compileShader(gl, gl.VERTEX_SHADER, "invalid vertex source", "CustomVertexShader");

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith(
                "[CustomVertexShader] VERTEX shader compile failed: ERROR: 0:1: syntax error"
            );
            expect(gl.deleteShader).toHaveBeenCalledTimes(1);
            expect(gl.deleteShader).toHaveBeenCalledWith(mockShaderHandle);
        });

        it("handles fragment shader compile failure: logs diagnostic, deletes shader handle, and returns null", () => {
            const mockShaderHandle = { __brand: "WebGLShader", id: 102 } as unknown as WebGLShader;
            vi.mocked(gl.createShader).mockReturnValue(mockShaderHandle);
            vi.mocked(gl.getShaderParameter).mockReturnValue(false);
            vi.mocked(gl.getShaderInfoLog).mockReturnValue("ERROR: undeclared identifier 'foo'");
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = compileShader(gl, gl.FRAGMENT_SHADER, "invalid fragment source", "CustomFragmentShader");

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("[CustomFragmentShader] FRAGMENT shader compile failed")
            );
            expect(gl.deleteShader).toHaveBeenCalledTimes(1);
            expect(gl.deleteShader).toHaveBeenCalledWith(mockShaderHandle);
        });
    });

    describe("handle allocation failure", () => {
        it("returns null immediately without invoking further gl operations when gl.createShader returns null", () => {
            vi.mocked(gl.createShader).mockReturnValue(null);

            const result = compileShader(gl, gl.VERTEX_SHADER, "void main() {}");

            expect(result).toBeNull();
            expect(gl.shaderSource).not.toHaveBeenCalled();
            expect(gl.compileShader).not.toHaveBeenCalled();
            expect(gl.getShaderParameter).not.toHaveBeenCalled();
            expect(gl.deleteShader).not.toHaveBeenCalled();
        });
    });

    describe("label and diagnostics configuration", () => {
        it("uses custom label when supplied", () => {
            vi.mocked(gl.getShaderParameter).mockReturnValue(false);
            vi.mocked(gl.getShaderInfoLog).mockReturnValue("compile error");
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            compileShader(gl, gl.VERTEX_SHADER, "source", "GalaxyShader");

            expect(consoleSpy).toHaveBeenCalledWith("[GalaxyShader] VERTEX shader compile failed: compile error");
        });

        it("defaults to 'ShaderProgram' when label parameter is omitted", () => {
            vi.mocked(gl.getShaderParameter).mockReturnValue(false);
            vi.mocked(gl.getShaderInfoLog).mockReturnValue("compile error");
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            compileShader(gl, gl.VERTEX_SHADER, "source");

            expect(consoleSpy).toHaveBeenCalledWith("[ShaderProgram] VERTEX shader compile failed: compile error");
        });
    });
});
