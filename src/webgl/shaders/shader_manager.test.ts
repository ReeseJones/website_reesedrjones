import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ShaderManager } from "./shader_manager";
import { ShaderProgram } from "./shader_program";
import { SubsystemRestorationPriority } from "../core/subsystem_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { createMockContextManager } from "../../testing/mocks/mock_context_manager";
import type { ShaderProgramOptions } from "./shader_program_types";
import type { ShaderKey } from "./shader_types";

describe("ShaderManager", () => {
    let gl: WebGL2RenderingContext;
    let cm: ReturnType<typeof createMockContextManager>;
    let shaderManager: ShaderManager;

    const dummyOptions: ShaderProgramOptions = {
        vertSource: "#version 300 es\nvoid main() { gl_Position = vec4(0.0); }",
        fragSource: "#version 300 es\nprecision mediump float;\nout vec4 color;\nvoid main() { color = vec4(1.0); }",
        label: "test_shader",
    };

    beforeEach(() => {
        gl = createMockWebGL2Context();
        cm = createMockContextManager(gl);
        shaderManager = new ShaderManager();
        shaderManager.attach(cm);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("metadata and subsystem registration", () => {
        it("identifies as shader subsystem with Priority 10 (Shader)", () => {
            expect(shaderManager.name).toBe("shader");
            expect(shaderManager.restorationPriority).toBe(SubsystemRestorationPriority.Shader);
            expect(shaderManager.shaderCount).toBe(0);
            expect(shaderManager.activeShader).toBeNull();
            expect(shaderManager.activeProgram).toBeNull();
        });

        it("supports attach and detach lifecycle methods", () => {
            const fresh = new ShaderManager();
            expect(() => fresh.getOrCreate("custom_test" as ShaderKey, dummyOptions)).toThrow(
                /before subsystem is attached/
            );
            fresh.attach(cm);
            expect(() => fresh.getOrCreate("custom_test" as ShaderKey, dummyOptions)).not.toThrow();
            fresh.detach();
            expect(() => fresh.getOrCreate("other_test" as ShaderKey, dummyOptions)).toThrow(
                /before subsystem is attached/
            );
        });
    });

    describe(".getOrCreate()", () => {
        it("compiles, caches, and returns a new ShaderProgram on first request", () => {
            const shader = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);

            expect(shader).toBeInstanceOf(ShaderProgram);
            expect(shaderManager.shaderCount).toBe(1);
            expect(shaderManager.has("custom_test" as ShaderKey)).toBe(true);
            expect(shaderManager.get("custom_test" as ShaderKey)).toBe(shader);
        });

        it("returns existing cached ShaderProgram on subsequent calls with the same key", () => {
            const shader1 = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);
            const shader2 = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);

            expect(shader1).toBe(shader2);
            expect(shaderManager.shaderCount).toBe(1);
        });

        it("automatically evicts shader from registry when shader.dispose() is called", () => {
            const shader = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);
            expect(shaderManager.shaderCount).toBe(1);
            expect(shaderManager.has("custom_test" as ShaderKey)).toBe(true);

            shader.dispose();

            expect(shaderManager.shaderCount).toBe(0);
            expect(shaderManager.has("custom_test" as ShaderKey)).toBe(false);
            expect(shaderManager.get("custom_test" as ShaderKey)).toBeNull();
        });

        it("unbinds the shader if the active shader is disposed", () => {
            const shader = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);
            shaderManager.bind(shader);
            expect(shaderManager.activeShader).toBe(shader);

            shader.dispose();

            expect(shaderManager.activeShader).toBeNull();
            expect(shaderManager.activeProgram).toBeNull();
            expect(gl.useProgram).toHaveBeenCalledWith(null);
        });

        it("throws an error if WebGL context is not available when compiling a new shader", () => {
            const cmNull = createMockContextManager(null as unknown as WebGL2RenderingContext);
            vi.mocked(cmNull.getContext).mockReturnValue(null);
            const mgr = new ShaderManager();
            mgr.attach(cmNull);

            expect(() => mgr.getOrCreate("custom_test" as ShaderKey, dummyOptions)).toThrow(
                "[ShaderManager] Cannot compile shader 'custom_test' before WebGL context is initialized."
            );
        });
    });

    describe(".get() and .has()", () => {
        it("get returns null and has returns false for unregistered keys", () => {
            expect(shaderManager.has("unregistered" as ShaderKey)).toBe(false);
            expect(shaderManager.get("unregistered" as ShaderKey)).toBeNull();
        });

        it("get returns cached instance and has returns true for registered keys", () => {
            const shader = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);
            expect(shaderManager.has("custom_test" as ShaderKey)).toBe(true);
            expect(shaderManager.get("custom_test" as ShaderKey)).toBe(shader);
        });
    });

    describe(".bind()", () => {
        it("calls gl.useProgram with program handle and updates activeShader and activeProgram", () => {
            const shader = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);
            const progHandle = shader.getProgram();

            shaderManager.bind(shader);

            expect(gl.useProgram).toHaveBeenCalledWith(progHandle);
            expect(shaderManager.activeShader).toBe(shader);
            expect(shaderManager.activeProgram).toBe(progHandle);
        });

        it("skips redundant gl.useProgram calls if shader is already active", () => {
            const shader = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);
            shaderManager.bind(shader);

            vi.mocked(gl.useProgram).mockClear();
            shaderManager.bind(shader);

            expect(gl.useProgram).not.toHaveBeenCalled();
            expect(shaderManager.activeShader).toBe(shader);
        });

        it("bind(null) unbinds the active shader and program", () => {
            const shader = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);
            shaderManager.bind(shader);

            vi.mocked(gl.useProgram).mockClear();
            shaderManager.bind(null);

            expect(gl.useProgram).toHaveBeenCalledWith(null);
            expect(shaderManager.activeShader).toBeNull();
            expect(shaderManager.activeProgram).toBeNull();
        });
    });

    describe(".bindKey()", () => {
        it("activates standard shader by canonical key (e.g. unlit)", () => {
            const shader = shaderManager.bindKey("unlit");

            expect(shader).toBeInstanceOf(ShaderProgram);
            expect(shaderManager.activeShader).toBe(shader);
            expect(shaderManager.has("unlit")).toBe(true);
            expect(gl.useProgram).toHaveBeenCalledWith(shader.getProgram());
        });

        it("activates standard galaxy_orb shader by canonical key", () => {
            const shader = shaderManager.bindKey("galaxy_orb");

            expect(shader).toBeInstanceOf(ShaderProgram);
            expect(shaderManager.activeShader).toBe(shader);
            expect(shaderManager.has("galaxy_orb")).toBe(true);
        });

        it("throws an error if key is not registered and not a standard shader", () => {
            expect(() => shaderManager.bindKey("unknown_key" as ShaderKey)).toThrow(
                "[ShaderManager] Shader 'unknown_key' is not registered with WebGLContextManager."
            );
        });
    });

    describe(".bindProgram()", () => {
        it("binds a raw WebGLProgram handle and clears activeShader", () => {
            const fakeProgram = {} as WebGLProgram;

            shaderManager.bindProgram(fakeProgram);

            expect(gl.useProgram).toHaveBeenCalledWith(fakeProgram);
            expect(shaderManager.activeProgram).toBe(fakeProgram);
            expect(shaderManager.activeShader).toBeNull();
        });

        it("skips redundant call if raw program is already active", () => {
            const fakeProgram = {} as WebGLProgram;
            shaderManager.bindProgram(fakeProgram);

            vi.mocked(gl.useProgram).mockClear();
            shaderManager.bindProgram(fakeProgram);

            expect(gl.useProgram).not.toHaveBeenCalled();
        });
    });

    describe(".unbind()", () => {
        it("calls gl.useProgram(null) and clears active state", () => {
            const shader = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);
            shaderManager.bind(shader);

            shaderManager.unbind();

            expect(gl.useProgram).toHaveBeenCalledWith(null);
            expect(shaderManager.activeShader).toBeNull();
            expect(shaderManager.activeProgram).toBeNull();
        });
    });

    describe(".onContextLost() and .onContextRestored()", () => {
        it("onContextLost forwards to all registered shaders and resets active state", () => {
            const shader1 = shaderManager.getOrCreate("custom_test1" as ShaderKey, dummyOptions);
            const shader2 = shaderManager.getOrCreate("custom_test2" as ShaderKey, dummyOptions);
            const lostSpy1 = vi.spyOn(shader1, "onContextLost");
            const lostSpy2 = vi.spyOn(shader2, "onContextLost");

            shaderManager.bind(shader1);
            shaderManager.onContextLost();

            expect(shaderManager.activeShader).toBeNull();
            expect(shaderManager.activeProgram).toBeNull();
            expect(lostSpy1).toHaveBeenCalledTimes(1);
            expect(lostSpy2).toHaveBeenCalledTimes(1);
        });

        it("onContextRestored forwards to all registered shaders with the new context and resets active state", () => {
            const shader1 = shaderManager.getOrCreate("custom_test1" as ShaderKey, dummyOptions);
            const shader2 = shaderManager.getOrCreate("custom_test2" as ShaderKey, dummyOptions);
            const restoredSpy1 = vi.spyOn(shader1, "onContextRestored");
            const restoredSpy2 = vi.spyOn(shader2, "onContextRestored");

            const newGl = createMockWebGL2Context();
            shaderManager.onContextRestored(newGl);

            expect(shaderManager.activeShader).toBeNull();
            expect(shaderManager.activeProgram).toBeNull();
            expect(restoredSpy1).toHaveBeenCalledWith(newGl);
            expect(restoredSpy2).toHaveBeenCalledWith(newGl);
        });
    });

    describe(".destroy()", () => {
        it("unbinds context, disposes all registered shaders, and clears registry", () => {
            const shader1 = shaderManager.getOrCreate("custom_test1" as ShaderKey, dummyOptions);
            const shader2 = shaderManager.getOrCreate("custom_test2" as ShaderKey, dummyOptions);
            const disposeSpy1 = vi.spyOn(shader1, "dispose");
            const disposeSpy2 = vi.spyOn(shader2, "dispose");

            shaderManager.bind(shader1);
            shaderManager.destroy();

            expect(shaderManager.activeShader).toBeNull();
            expect(shaderManager.activeProgram).toBeNull();
            expect(disposeSpy1).toHaveBeenCalledTimes(1);
            expect(disposeSpy2).toHaveBeenCalledTimes(1);
            expect(shaderManager.shaderCount).toBe(0);
        });
    });

    describe(".getDiagnostics()", () => {
        it("returns diagnostics reporting resource count and binding state", () => {
            const diagInitial = shaderManager.getDiagnostics();
            expect(diagInitial.name).toBe("shader");
            expect(diagInitial.resourceCount).toBe(0);
            expect(diagInitial.activeBindings).toBe(0);
            expect(diagInitial.details?.currentShaderLabel).toBeNull();

            const shader = shaderManager.getOrCreate("custom_test" as ShaderKey, dummyOptions);
            shaderManager.bind(shader);

            const diagActive = shaderManager.getDiagnostics();
            expect(diagActive.resourceCount).toBe(1);
            expect(diagActive.activeBindings).toBe(1);
            expect(diagActive.details?.currentShaderLabel).toBe("test_shader");

            shaderManager.unbind();
            const diagUnbound = shaderManager.getDiagnostics();
            expect(diagUnbound.activeBindings).toBe(0);
            expect(diagUnbound.details?.currentShaderLabel).toBeNull();
        });
    });
});
