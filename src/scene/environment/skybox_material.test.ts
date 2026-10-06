import { describe, it, expect, vi } from "vitest";
import { SkyboxMaterial } from "./skybox_material";
import { BlendMode } from "../materials/material_types";
import { TextureUnit } from "../../webgl/textures/texture_types";
import { createMockCubeTexture } from "../../testing/mocks/mock_texture";

describe("SkyboxMaterial", () => {
    describe("constructor and default initialization", () => {
        it("initializes with default shaderKey 'skybox'", () => {
            const material = new SkyboxMaterial();
            expect(material.shaderKey).toBe("skybox");
        });

        it("initializes default pipelineState (opaque, depthTest true, depthWrite false, cullFace false)", () => {
            const material = new SkyboxMaterial();

            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Opaque,
                depthTest: true,
                depthWrite: false,
                cullFace: false,
            });
            // Verify specific pipeline flags critical for skybox rendering
            expect(material.pipelineState.depthWrite).toBe(false);
            expect(material.pipelineState.cullFace).toBe(false);
            expect(material.pipelineState.depthTest).toBe(true);
            expect(material.pipelineState.blendMode).toBe(BlendMode.Opaque);
        });

        it("initializes default uniforms (u_tint: [1.0, 1.0, 1.0], u_exposure: 1.0, u_rotationY: 0.0)", () => {
            const material = new SkyboxMaterial();
            const uniforms = material.getUniforms();

            expect(uniforms["u_tint"]).toEqual([1.0, 1.0, 1.0]);
            expect(uniforms["u_exposure"]).toBe(1.0);
            expect(uniforms["u_rotationY"]).toBe(0.0);

            // Also verify corresponding property getters match default uniform values
            expect(material.tint).toEqual([1.0, 1.0, 1.0]);
            expect(material.exposure).toBe(1.0);
            expect(material.rotationY).toBe(0.0);
        });

        it("cubeTexture getter returns null by default", () => {
            const material = new SkyboxMaterial();

            expect(material.cubeTexture).toBeNull();
            expect(material.getCubeTexture(TextureUnit.Environment)).toBeNull();
            expect(material.getCubeTextures().size).toBe(0);
        });
    });

    describe("constructor parameter resolution and options", () => {
        it("binds cubeTexture passed in options.cubeTexture to TextureUnit.Environment (11)", () => {
            const mockCube = createMockCubeTexture("sky-cubemap");
            const material = new SkyboxMaterial({ cubeTexture: mockCube });

            expect(material.cubeTexture).toBe(mockCube);
            expect(material.getCubeTexture(TextureUnit.Environment)).toBe(mockCube);
            expect(material.getCubeTextures().size).toBe(1);
            expect(material.getCubeTextures().get(TextureUnit.Environment)).toBe(mockCube);
        });

        it("accepts custom exposure, tint, and rotationY", () => {
            const material = new SkyboxMaterial({
                exposure: 2.5,
                tint: [0.8, 0.9, 1.0],
                rotationY: Math.PI / 4,
            });

            expect(material.exposure).toBe(2.5);
            expect(material.tint).toEqual([0.8, 0.9, 1.0]);
            expect(material.rotationY).toBeCloseTo(Math.PI / 4);

            const uniforms = material.getUniforms();
            expect(uniforms["u_exposure"]).toBe(2.5);
            expect(uniforms["u_tint"]).toEqual([0.8, 0.9, 1.0]);
            expect(uniforms["u_rotationY"]).toBeCloseTo(Math.PI / 4);
        });

        it("accepts custom pipelineState overrides (e.g. blendMode: BlendMode.Alpha, depthTest: false)", () => {
            const material = new SkyboxMaterial({
                pipelineState: {
                    blendMode: BlendMode.Alpha,
                    depthTest: false,
                    depthWrite: true,
                    cullFace: true,
                },
            });

            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Alpha,
                depthTest: false,
                depthWrite: true,
                cullFace: true,
            });
        });

        it("accepts custom additional uniforms in options.uniforms", () => {
            const material = new SkyboxMaterial({
                uniforms: {
                    u_blurLevel: 2.0,
                    u_lodBias: 1.5,
                },
            });

            const uniforms = material.getUniforms();
            expect(uniforms["u_blurLevel"]).toBe(2.0);
            expect(uniforms["u_lodBias"]).toBe(1.5);
            // Default uniforms should still be present
            expect(uniforms["u_exposure"]).toBe(1.0);
            expect(uniforms["u_tint"]).toEqual([1.0, 1.0, 1.0]);
            expect(uniforms["u_rotationY"]).toBe(0.0);
        });

        it("accepts explicit shaderKey: 'skybox'", () => {
            const material = new SkyboxMaterial({ shaderKey: "skybox" });
            expect(material.shaderKey).toBe("skybox");
        });
    });

    describe("property getters and setters", () => {
        describe("exposure", () => {
            it("reads u_exposure uniform", () => {
                const material = new SkyboxMaterial({ exposure: 1.75 });
                expect(material.exposure).toBe(1.75);

                material.setUniform("u_exposure", 3.25);
                expect(material.exposure).toBe(3.25);
            });

            it("setter updates u_exposure uniform", () => {
                const material = new SkyboxMaterial();
                material.exposure = 0.5;

                expect(material.exposure).toBe(0.5);
                expect(material.getUniforms()["u_exposure"]).toBe(0.5);
            });
        });

        describe("tint", () => {
            it("reads u_tint uniform", () => {
                const material = new SkyboxMaterial({ tint: [0.5, 0.6, 0.7] });
                expect(material.tint).toEqual([0.5, 0.6, 0.7]);

                material.setUniform("u_tint", [0.1, 0.2, 0.3]);
                expect(material.tint).toEqual([0.1, 0.2, 0.3]);
            });

            it("setter updates u_tint uniform", () => {
                const material = new SkyboxMaterial();
                material.tint = [0.2, 0.3, 0.4];

                expect(material.tint).toEqual([0.2, 0.3, 0.4]);
                expect(material.getUniforms()["u_tint"]).toEqual([0.2, 0.3, 0.4]);
            });
        });

        describe("rotationY", () => {
            it("reads u_rotationY uniform", () => {
                const material = new SkyboxMaterial({ rotationY: 1.23 });
                expect(material.rotationY).toBe(1.23);

                material.setUniform("u_rotationY", 2.34);
                expect(material.rotationY).toBe(2.34);
            });

            it("setter updates u_rotationY uniform", () => {
                const material = new SkyboxMaterial();
                material.rotationY = Math.PI;

                expect(material.rotationY).toBeCloseTo(Math.PI);
                expect(material.getUniforms()["u_rotationY"]).toBeCloseTo(Math.PI);
            });
        });

        describe("cubeTexture", () => {
            it("reads bound texture from TextureUnit.Environment", () => {
                const mockCube = createMockCubeTexture("sky");
                const material = new SkyboxMaterial({ cubeTexture: mockCube });

                expect(material.cubeTexture).toBe(mockCube);
            });

            it("setter binds new cube texture to TextureUnit.Environment", () => {
                const material = new SkyboxMaterial();
                const mockCube = createMockCubeTexture("new-sky");

                material.cubeTexture = mockCube;

                expect(material.cubeTexture).toBe(mockCube);
                expect(material.getCubeTexture(TextureUnit.Environment)).toBe(mockCube);
            });

            it("setter clears texture when passed null or undefined", () => {
                const mockCube = createMockCubeTexture("clearing-sky");
                const material = new SkyboxMaterial({ cubeTexture: mockCube });

                expect(material.cubeTexture).toBe(mockCube);

                material.cubeTexture = null;
                expect(material.cubeTexture).toBeNull();
                expect(material.getCubeTexture(TextureUnit.Environment)).toBeNull();
                expect(material.getCubeTextures().size).toBe(0);

                // Setting undefined also clears
                material.cubeTexture = mockCube;
                expect(material.cubeTexture).toBe(mockCube);

                material.cubeTexture = undefined;
                expect(material.cubeTexture).toBeNull();
                expect(material.getCubeTexture(TextureUnit.Environment)).toBeNull();
                expect(material.getCubeTextures().size).toBe(0);
            });
        });

        describe("shaderKey", () => {
            it("reads and updates shaderKey", () => {
                const material = new SkyboxMaterial();
                expect(material.shaderKey).toBe("skybox");

                material.shaderKey = "skybox";
                expect(material.shaderKey).toBe("skybox");
            });
        });
    });

    describe("clone", () => {
        it("returns a new SkyboxMaterial instance (instanceof SkyboxMaterial)", () => {
            const original = new SkyboxMaterial();
            const cloned = original.clone();

            expect(cloned).toBeInstanceOf(SkyboxMaterial);
            expect(cloned).not.toBe(original);
        });

        it("preserves shaderKey, pipelineState, exposure, tint, rotationY, and cubeTexture", () => {
            const mockCube = createMockCubeTexture("cloned-env");
            const original = new SkyboxMaterial({
                cubeTexture: mockCube,
                exposure: 1.8,
                tint: [0.4, 0.5, 0.6],
                rotationY: 0.75,
                pipelineState: {
                    blendMode: BlendMode.Alpha,
                    depthTest: true,
                    depthWrite: false,
                    cullFace: true,
                },
            });

            const cloned = original.clone();

            expect(cloned.shaderKey).toBe(original.shaderKey);
            expect(cloned.pipelineState).toEqual(original.pipelineState);
            expect(cloned.exposure).toBe(original.exposure);
            expect(cloned.tint).toEqual(original.tint);
            expect(cloned.rotationY).toBe(original.rotationY);
            expect(cloned.cubeTexture).toBe(original.cubeTexture);
        });

        it("deep-copies pipelineState (mutating clone does not mutate original)", () => {
            const original = new SkyboxMaterial();
            const cloned = original.clone();

            cloned.pipelineState.depthWrite = true;
            cloned.pipelineState.blendMode = BlendMode.Additive;
            cloned.pipelineState.cullFace = true;

            expect(original.pipelineState.depthWrite).toBe(false);
            expect(original.pipelineState.blendMode).toBe(BlendMode.Opaque);
            expect(original.pipelineState.cullFace).toBe(false);
            expect(cloned.pipelineState.depthWrite).toBe(true);
            expect(cloned.pipelineState.blendMode).toBe(BlendMode.Additive);
            expect(cloned.pipelineState.cullFace).toBe(true);
        });

        it("deep-copies uniforms and tint array (mutating clone tint does not mutate original)", () => {
            const original = new SkyboxMaterial({
                tint: [0.1, 0.2, 0.3],
                exposure: 1.0,
                rotationY: 0.0,
            });

            const cloned = original.clone();

            cloned.tint = [0.9, 0.8, 0.7];
            cloned.exposure = 3.0;
            cloned.rotationY = 1.5;
            cloned.setUniform("u_extra", "clone_only");

            expect(original.tint).toEqual([0.1, 0.2, 0.3]);
            expect(original.exposure).toBe(1.0);
            expect(original.rotationY).toBe(0.0);
            expect(original.getUniforms()["u_extra"]).toBeUndefined();

            expect(cloned.tint).toEqual([0.9, 0.8, 0.7]);
            expect(cloned.exposure).toBe(3.0);
            expect(cloned.rotationY).toBe(1.5);
            expect(cloned.getUniforms()["u_extra"]).toBe("clone_only");
        });

        it("shares non-owning cubeTexture reference and survives texture disposal", () => {
            const mockCube = createMockCubeTexture("shared-cube");
            const original = new SkyboxMaterial({ cubeTexture: mockCube });

            const cloned = original.clone();

            expect(cloned.cubeTexture).toBe(mockCube);
            expect(cloned.cubeTexture).toBe(original.cubeTexture);

            expect(() => mockCube.dispose()).not.toThrow();
            expect(cloned.cubeTexture).toBe(mockCube);
            expect(original.cubeTexture).toBe(mockCube);
        });
    });
});
