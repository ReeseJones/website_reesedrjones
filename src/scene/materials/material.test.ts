import { describe, it, expect, vi } from "vitest";
import { Material } from "./material";
import { BlendMode } from "./material_types";
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
                blendMode: BlendMode.Opaque,
                depthTest: true,
                depthWrite: true,
                cullFace: true,
            });
        });

        it("accepts partial pipelineState overrides (e.g. blendMode: BlendMode.Additive, depthWrite: false)", () => {
            const material = new Material({
                shaderKey: "unlit",
                pipelineState: {
                    blendMode: BlendMode.Additive,
                    depthWrite: false,
                },
            });

            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Additive,
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
                    blendMode: BlendMode.Alpha,
                    depthTest: false,
                    depthWrite: false,
                    cullFace: false,
                },
            });

            const state = material.pipelineState;
            expect(state.blendMode).toBe(BlendMode.Alpha);
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
                    blendMode: BlendMode.Opaque,
                    depthTest: true,
                    depthWrite: true,
                    cullFace: true,
                },
            });

            const cloned = material.clone();
            cloned.pipelineState.blendMode = BlendMode.Additive;
            cloned.pipelineState.depthWrite = false;

            expect(material.pipelineState.blendMode).toBe(BlendMode.Opaque);
            expect(material.pipelineState.depthWrite).toBe(true);
            expect(cloned.pipelineState.blendMode).toBe(BlendMode.Additive);
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

        it("deep-copies uniforms: Float32Array, array, and nested object uniforms", () => {
            const originalMat = new Float32Array([1, 2, 3, 4]);
            const originalArray = [10, 20, 30];
            const originalNested = { config: { speed: 5 } };

            const material = new Material({
                shaderKey: "unlit",
                uniforms: {
                    u_matrix: originalMat,
                    u_offsets: originalArray,
                    u_nested: originalNested,
                },
            });

            const cloned = material.clone();
            const clonedUniforms = cloned.getUniforms();

            // Values are equal
            expect(clonedUniforms["u_matrix"]).toEqual(originalMat);
            expect(clonedUniforms["u_offsets"]).toEqual(originalArray);
            expect(clonedUniforms["u_nested"]).toEqual(originalNested);

            // References are distinct (deep copies)
            expect(clonedUniforms["u_matrix"]).not.toBe(originalMat);
            expect(clonedUniforms["u_offsets"]).not.toBe(originalArray);
            expect(clonedUniforms["u_nested"]).not.toBe(originalNested);

            // Mutating clone Float32Array does not affect original
            (clonedUniforms["u_matrix"] as Float32Array)[0] = 999;
            expect((material.getUniforms()["u_matrix"] as Float32Array)[0]).toBe(1);

            // Mutating clone array does not affect original
            (clonedUniforms["u_offsets"] as number[])[0] = 888;
            expect((material.getUniforms()["u_offsets"] as number[])[0]).toBe(10);

            // Mutating clone nested object does not affect original
            (clonedUniforms["u_nested"] as any).config.speed = 99;
            expect((material.getUniforms()["u_nested"] as any).config.speed).toBe(5);
        });

        it("copies non-owning texture and cubeTexture references into the clone", () => {
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

        it("texture disposal independence: disposing assigned texture does not crash or corrupt material", () => {
            const tex = createMockTexture("color");
            const material = new Material({
                shaderKey: "unlit",
                textures: { [TextureUnit.Color0]: tex },
            });

            expect(material.getTexture(TextureUnit.Color0)).toBe(tex);

            // Disposing the texture frees GPU resources but material retains reference without crashing
            expect(() => tex.dispose()).not.toThrow();
            expect(material.getTexture(TextureUnit.Color0)).toBe(tex);
            expect(material.shaderKey).toBe("unlit");
            expect(material.getTextures().size).toBe(1);
        });
    });
});
