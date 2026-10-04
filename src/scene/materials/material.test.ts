import { describe, it, expect, vi } from "vitest";
import { Material } from "./material";
import type { ITexture } from "../../webgl/textures/texture_types";
import { TextureUnit } from "../../webgl/textures/texture_types";
import type { ICubeTexture } from "../../webgl/textures/cube_texture_types";
import { createMockTexture, createMockCubeTexture } from "../../testing/mocks/mock_texture";

describe("Material", () => {
    describe("constructor and initialization", () => {
        it("initializes with required shaderKey and default pipelineState", () => {
            const material = new Material({ shaderKey: "unlit" });

            expect(material.shaderKey).toBe("unlit");
            expect(material.pipelineState).toEqual({
                blendMode: "opaque",
                depthTest: true,
                depthWrite: true,
                cullFace: true,
            });
        });

        it("accepts partial pipelineState overrides (e.g. blendMode: 'additive', depthWrite: false)", () => {
            const material = new Material({
                shaderKey: "unlit",
                pipelineState: {
                    blendMode: "additive",
                    depthWrite: false,
                },
            });

            expect(material.pipelineState).toEqual({
                blendMode: "additive",
                depthTest: true,
                depthWrite: false,
                cullFace: true,
            });
        });

        it("populates initial uniforms from options.uniforms", () => {
            const initialUniforms = {
                u_color: [1.0, 0.0, 0.5, 1.0],
                u_intensity: 2.5,
                u_enabled: true,
            };

            const material = new Material({
                shaderKey: "unlit",
                uniforms: initialUniforms,
            });

            expect(material.getUniforms()).toEqual(initialUniforms);
        });

        it("populates initial 2D textures from options.textures", () => {
            const colorTex = createMockTexture("color");
            const normalTex = createMockTexture("normal");

            const material = new Material({
                shaderKey: "unlit",
                textures: {
                    [TextureUnit.Color0]: colorTex,
                    [TextureUnit.Normal]: normalTex,
                },
            });

            expect(material.getTexture(TextureUnit.Color0)).toBe(colorTex);
            expect(material.getTexture(TextureUnit.Normal)).toBe(normalTex);
            expect(material.getTextures().size).toBe(2);
        });

        it("populates initial cubeTextures from options.cubeTextures", () => {
            const envMap = createMockCubeTexture("envMap");

            const material = new Material({
                shaderKey: "skybox",
                cubeTextures: {
                    [TextureUnit.Environment]: envMap,
                },
            });

            expect(material.getCubeTexture(TextureUnit.Environment)).toBe(envMap);
            expect(material.getCubeTextures().size).toBe(1);
        });

        it("initializes isDisposed to false", () => {
            const material = new Material({ shaderKey: "unlit" });
            expect(material.isDisposed).toBe(false);
        });
    });

    describe("shaderKey getter and setter", () => {
        it("returns current shaderKey", () => {
            const material = new Material({ shaderKey: "unlit" });
            expect(material.shaderKey).toBe("unlit");
        });

        it("updates shaderKey via setter", () => {
            const material = new Material({ shaderKey: "unlit" });
            material.shaderKey = "skybox";
            expect(material.shaderKey).toBe("skybox");
        });
    });

    describe("pipelineState getter", () => {
        it("returns active pipelineState object", () => {
            const material = new Material({
                shaderKey: "unlit",
                pipelineState: {
                    blendMode: "alpha",
                    depthTest: false,
                    depthWrite: false,
                    cullFace: false,
                },
            });

            const state = material.pipelineState;
            expect(state.blendMode).toBe("alpha");
            expect(state.depthTest).toBe(false);
            expect(state.depthWrite).toBe(false);
            expect(state.cullFace).toBe(false);
        });
    });

    describe("uniform management", () => {
        describe("setUniform", () => {
            it("sets a new uniform value and returns this for method chaining", () => {
                const material = new Material({ shaderKey: "unlit" });
                const result = material.setUniform("u_roughness", 0.8);

                expect(result).toBe(material);
                expect(material.getUniforms()["u_roughness"]).toBe(0.8);
            });

            it("updates an existing uniform value", () => {
                const material = new Material({
                    shaderKey: "unlit",
                    uniforms: { u_roughness: 0.2 },
                });

                material.setUniform("u_roughness", 0.95);
                expect(material.getUniforms()["u_roughness"]).toBe(0.95);
            });

            it("supports numbers, arrays/vectors, booleans, strings", () => {
                const material = new Material({ shaderKey: "unlit" });

                material
                    .setUniform("u_scalar", 42)
                    .setUniform("u_vec3", [1.0, 2.0, 3.0])
                    .setUniform("u_active", false)
                    .setUniform("u_mode", "debug");

                const uniforms = material.getUniforms();
                expect(uniforms["u_scalar"]).toBe(42);
                expect(uniforms["u_vec3"]).toEqual([1.0, 2.0, 3.0]);
                expect(uniforms["u_active"]).toBe(false);
                expect(uniforms["u_mode"]).toBe("debug");
            });
        });

        describe("setUniforms", () => {
            it("sets multiple uniforms from a record and returns this", () => {
                const material = new Material({ shaderKey: "unlit" });
                const result = material.setUniforms({
                    u_tint: [0.1, 0.2, 0.3],
                    u_exposure: 1.5,
                });

                expect(result).toBe(material);
                const uniforms = material.getUniforms();
                expect(uniforms["u_tint"]).toEqual([0.1, 0.2, 0.3]);
                expect(uniforms["u_exposure"]).toBe(1.5);
            });
        });

        describe("getUniforms", () => {
            it("returns snapshot record of all uniforms", () => {
                const material = new Material({
                    shaderKey: "unlit",
                    uniforms: {
                        u_alpha: 0.5,
                        u_beta: 1.0,
                    },
                });

                const snapshot = material.getUniforms();
                expect(snapshot).toEqual({
                    u_alpha: 0.5,
                    u_beta: 1.0,
                });
            });

            it("mutations to returned snapshot do not affect internal material uniforms", () => {
                const material = new Material({
                    shaderKey: "unlit",
                    uniforms: { u_value: 10 },
                });

                const snapshot = material.getUniforms() as Record<string, unknown>;
                snapshot["u_value"] = 999;
                snapshot["u_injected"] = "malicious";

                const freshSnapshot = material.getUniforms();
                expect(freshSnapshot["u_value"]).toBe(10);
                expect(freshSnapshot["u_injected"]).toBeUndefined();
            });
        });
    });

    describe("2D texture management", () => {
        describe("setTexture", () => {
            it("binds an ITexture to a texture unit index and returns this", () => {
                const material = new Material({ shaderKey: "unlit" });
                const tex = createMockTexture("albedo");

                const result = material.setTexture(TextureUnit.Color0, tex);

                expect(result).toBe(material);
                expect(material.getTexture(TextureUnit.Color0)).toBe(tex);
            });

            it("removes texture assignment when passed null", () => {
                const tex = createMockTexture("albedo");
                const material = new Material({
                    shaderKey: "unlit",
                    textures: { [TextureUnit.Color0]: tex },
                });

                expect(material.getTexture(TextureUnit.Color0)).toBe(tex);

                const result = material.setTexture(TextureUnit.Color0, null);
                expect(result).toBe(material);
                expect(material.getTexture(TextureUnit.Color0)).toBeNull();
                expect(material.getTextures().has(TextureUnit.Color0)).toBe(false);
            });
        });

        describe("getTexture", () => {
            it("returns bound ITexture or null if unassigned", () => {
                const material = new Material({ shaderKey: "unlit" });
                const tex = createMockTexture("specular");

                expect(material.getTexture(TextureUnit.Roughness)).toBeNull();

                material.setTexture(TextureUnit.Roughness, tex);
                expect(material.getTexture(TextureUnit.Roughness)).toBe(tex);
            });
        });

        describe("getTextures", () => {
            it("returns ReadonlyMap of assigned textures", () => {
                const tex0 = createMockTexture("tex0");
                const tex1 = createMockTexture("tex1");
                const material = new Material({
                    shaderKey: "unlit",
                    textures: {
                        [TextureUnit.Color0]: tex0,
                        [TextureUnit.Color1]: tex1,
                    },
                });

                const map = material.getTextures();
                expect(map).toBeInstanceOf(Map);
                expect(map.size).toBe(2);
                expect(map.get(TextureUnit.Color0)).toBe(tex0);
                expect(map.get(TextureUnit.Color1)).toBe(tex1);
            });
        });
    });

    describe("cubemap texture management", () => {
        describe("setCubeTexture", () => {
            it("binds an ICubeTexture to a texture unit index and returns this", () => {
                const material = new Material({ shaderKey: "skybox" });
                const cubeTex = createMockCubeTexture("sky");

                const result = material.setCubeTexture(TextureUnit.Environment, cubeTex);

                expect(result).toBe(material);
                expect(material.getCubeTexture(TextureUnit.Environment)).toBe(cubeTex);
            });

            it("removes cubemap assignment when passed null", () => {
                const cubeTex = createMockCubeTexture("sky");
                const material = new Material({
                    shaderKey: "skybox",
                    cubeTextures: { [TextureUnit.Environment]: cubeTex },
                });

                expect(material.getCubeTexture(TextureUnit.Environment)).toBe(cubeTex);

                const result = material.setCubeTexture(TextureUnit.Environment, null);
                expect(result).toBe(material);
                expect(material.getCubeTexture(TextureUnit.Environment)).toBeNull();
                expect(material.getCubeTextures().has(TextureUnit.Environment)).toBe(false);
            });
        });

        describe("getCubeTexture", () => {
            it("returns bound ICubeTexture or null if unassigned", () => {
                const material = new Material({ shaderKey: "skybox" });
                const cubeTex = createMockCubeTexture("probe");

                expect(material.getCubeTexture(TextureUnit.Environment)).toBeNull();

                material.setCubeTexture(TextureUnit.Environment, cubeTex);
                expect(material.getCubeTexture(TextureUnit.Environment)).toBe(cubeTex);
            });
        });

        describe("getCubeTextures", () => {
            it("returns ReadonlyMap of assigned cubemaps", () => {
                const cubeTex = createMockCubeTexture("probe");
                const material = new Material({
                    shaderKey: "skybox",
                    cubeTextures: { [TextureUnit.Environment]: cubeTex },
                });

                const map = material.getCubeTextures();
                expect(map).toBeInstanceOf(Map);
                expect(map.size).toBe(1);
                expect(map.get(TextureUnit.Environment)).toBe(cubeTex);
            });
        });
    });

    describe("clone", () => {
        it("returns a new Material instance with the same shaderKey", () => {
            const material = new Material({ shaderKey: "unlit" });
            const cloned = material.clone();

            expect(cloned).toBeInstanceOf(Material);
            expect(cloned).not.toBe(material);
            expect(cloned.shaderKey).toBe("unlit");
        });

        it("clones pipelineState deeply (mutating clone pipelineState does not affect original)", () => {
            const material = new Material({
                shaderKey: "unlit",
                pipelineState: {
                    blendMode: "opaque",
                    depthTest: true,
                    depthWrite: true,
                    cullFace: true,
                },
            });

            const cloned = material.clone();
            cloned.pipelineState.blendMode = "additive";
            cloned.pipelineState.depthWrite = false;

            expect(material.pipelineState.blendMode).toBe("opaque");
            expect(material.pipelineState.depthWrite).toBe(true);
            expect(cloned.pipelineState.blendMode).toBe("additive");
            expect(cloned.pipelineState.depthWrite).toBe(false);
        });

        it("clones uniforms (mutating original uniforms does not affect clone)", () => {
            const material = new Material({
                shaderKey: "unlit",
                uniforms: { u_intensity: 1.0 },
            });

            const cloned = material.clone();
            material.setUniform("u_intensity", 5.0);
            material.setUniform("u_extra", "orig_only");

            expect(cloned.getUniforms()["u_intensity"]).toBe(1.0);
            expect(cloned.getUniforms()["u_extra"]).toBeUndefined();
        });

        it("copies texture and cubeTexture references into the clone", () => {
            const tex = createMockTexture("color");
            const cubeTex = createMockCubeTexture("env");

            const material = new Material({
                shaderKey: "unlit",
                textures: { [TextureUnit.Color0]: tex },
                cubeTextures: { [TextureUnit.Environment]: cubeTex },
            });

            const cloned = material.clone();

            expect(cloned.getTexture(TextureUnit.Color0)).toBe(tex);
            expect(cloned.getCubeTexture(TextureUnit.Environment)).toBe(cubeTex);
            expect(cloned.getTextures().size).toBe(1);
            expect(cloned.getCubeTextures().size).toBe(1);
        });
    });

    describe("IDisposable lifecycle", () => {
        it("isDisposed starts false and becomes true on dispose()", () => {
            const material = new Material({ shaderKey: "unlit" });
            expect(material.isDisposed).toBe(false);

            material.dispose();
            expect(material.isDisposed).toBe(true);
        });

        describe("onDispose", () => {
            it("registers callback invoked upon dispose()", () => {
                const material = new Material({ shaderKey: "unlit" });
                const listener = vi.fn();

                material.onDispose(listener);
                expect(listener).not.toHaveBeenCalled();

                material.dispose();
                expect(listener).toHaveBeenCalledTimes(1);
            });

            it("returns unsubscribe function that prevents invocation", () => {
                const material = new Material({ shaderKey: "unlit" });
                const listener = vi.fn();

                const unsubscribe = material.onDispose(listener);
                unsubscribe();

                material.dispose();
                expect(listener).not.toHaveBeenCalled();
            });

            it("executes multiple callbacks in registration order", () => {
                const material = new Material({ shaderKey: "unlit" });
                const executionOrder: number[] = [];

                material.onDispose(() => executionOrder.push(1));
                material.onDispose(() => executionOrder.push(2));
                material.onDispose(() => executionOrder.push(3));

                material.dispose();
                expect(executionOrder).toEqual([1, 2, 3]);
            });
        });

        describe("dispose", () => {
            it("sets isDisposed to true", () => {
                const material = new Material({ shaderKey: "unlit" });
                material.dispose();
                expect(material.isDisposed).toBe(true);
            });

            it("invokes onDispose listeners once", () => {
                const material = new Material({ shaderKey: "unlit" });
                const listener = vi.fn();

                material.onDispose(listener);
                material.dispose();

                expect(listener).toHaveBeenCalledTimes(1);
            });

            it("calls dispose() on each assigned 2D texture", () => {
                const tex1 = createMockTexture("tex1");
                const tex2 = createMockTexture("tex2");

                const material = new Material({
                    shaderKey: "unlit",
                    textures: {
                        [TextureUnit.Color0]: tex1,
                        [TextureUnit.Normal]: tex2,
                    },
                });

                material.dispose();

                expect(tex1.dispose).toHaveBeenCalledTimes(1);
                expect(tex2.dispose).toHaveBeenCalledTimes(1);
            });

            it("calls dispose() on each assigned cubemap texture", () => {
                const cubeTex = createMockCubeTexture("cube");

                const material = new Material({
                    shaderKey: "skybox",
                    cubeTextures: {
                        [TextureUnit.Environment]: cubeTex,
                    },
                });

                material.dispose();

                expect(cubeTex.dispose).toHaveBeenCalledTimes(1);
            });

            it("clears textures, cubeTextures, and uniforms maps", () => {
                const tex = createMockTexture("tex");
                const cubeTex = createMockCubeTexture("cube");

                const material = new Material({
                    shaderKey: "unlit",
                    uniforms: { u_val: 1 },
                    textures: { [TextureUnit.Color0]: tex },
                    cubeTextures: { [TextureUnit.Environment]: cubeTex },
                });

                material.dispose();

                expect(material.getTextures().size).toBe(0);
                expect(material.getCubeTextures().size).toBe(0);
                expect(Object.keys(material.getUniforms()).length).toBe(0);
            });

            it("is idempotent: subsequent dispose() calls do nothing and do not re-invoke listeners or texture dispose", () => {
                const listener = vi.fn();
                const tex = createMockTexture("tex");
                const cubeTex = createMockCubeTexture("cube");

                const material = new Material({
                    shaderKey: "unlit",
                    textures: { [TextureUnit.Color0]: tex },
                    cubeTextures: { [TextureUnit.Environment]: cubeTex },
                });

                material.onDispose(listener);

                material.dispose();
                expect(listener).toHaveBeenCalledTimes(1);
                expect(tex.dispose).toHaveBeenCalledTimes(1);
                expect(cubeTex.dispose).toHaveBeenCalledTimes(1);

                // Second dispose
                material.dispose();
                expect(listener).toHaveBeenCalledTimes(1);
                expect(tex.dispose).toHaveBeenCalledTimes(1);
                expect(cubeTex.dispose).toHaveBeenCalledTimes(1);
                expect(material.isDisposed).toBe(true);
            });
        });
    });
});
