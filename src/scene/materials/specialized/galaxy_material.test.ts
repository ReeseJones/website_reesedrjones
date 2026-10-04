import { describe, it, expect, vi } from "vitest";
import { GalaxyMaterial } from "./galaxy_material";
import {
    DEFAULT_GALAXY_PARAMETERS,
    DEFAULT_ORB_PARAMETERS,
    DEFAULT_PINPRICK_PARAMETERS,
} from "../../../galaxy_backdrop/parameters/index";
import { TextureUnit } from "../../../webgl/textures/texture_types";
import { createMockTexture, createMockCubeTexture } from "../../../testing/mocks/mock_texture";

describe("GalaxyMaterial", () => {
    describe("constructor and default initialization", () => {
        it("default construction resolves to shaderKey 'galaxy_orb' matching DEFAULT_ORB_PARAMETERS", () => {
            const material = new GalaxyMaterial();
            expect(material.shaderKey).toBe("galaxy_orb");
            expect(material.galaxyParams).toEqual(DEFAULT_ORB_PARAMETERS);
        });

        it("configures default pipelineState for additive point-cloud rendering", () => {
            const material = new GalaxyMaterial();
            expect(material.pipelineState).toEqual({
                blendMode: "additive",
                depthTest: false,
                depthWrite: false,
                cullFace: false,
            });
        });

        it("populates default galaxy simulation uniforms matching DEFAULT_ORB_PARAMETERS", () => {
            const material = new GalaxyMaterial();
            const uniforms = material.getUniforms();

            expect(uniforms["u_rotationSpeed"]).toBe(DEFAULT_ORB_PARAMETERS.rotationSpeed);
            expect(uniforms["u_differentialSpeed"]).toBe(DEFAULT_ORB_PARAMETERS.differentialSpeed);
            expect(uniforms["u_driftSpeed"]).toBe(DEFAULT_ORB_PARAMETERS.driftSpeed);
            expect(uniforms["u_driftAmplitude"]).toBe(DEFAULT_ORB_PARAMETERS.driftAmplitude);
            expect(uniforms["u_pointScale"]).toBe(DEFAULT_ORB_PARAMETERS.pointScale);
            expect(uniforms["u_minPointSize"]).toBe(DEFAULT_ORB_PARAMETERS.minPointSize);
            expect(uniforms["u_maxPointSize"]).toBe(DEFAULT_ORB_PARAMETERS.maxPointSize);
            expect(uniforms["u_nearFadeDistance"]).toBe(DEFAULT_ORB_PARAMETERS.nearFadeDistance);
            expect(uniforms["u_coreColor"]).toEqual(DEFAULT_ORB_PARAMETERS.coreColor);
            expect(uniforms["u_coreBlazeColor"]).toEqual(DEFAULT_ORB_PARAMETERS.coreBlazeColor);
            expect(uniforms["armInnerColor"]).toBeUndefined();
            expect(uniforms["u_armInnerColor"]).toEqual(DEFAULT_ORB_PARAMETERS.armInnerColor);
            expect(uniforms["u_armOuterColor"]).toEqual(DEFAULT_ORB_PARAMETERS.armOuterColor);
            expect(uniforms["u_accentColor"]).toEqual(DEFAULT_ORB_PARAMETERS.accentColor);
            expect(uniforms["u_coreGlowBoost"]).toBe(DEFAULT_ORB_PARAMETERS.coreGlowBoost);
        });

        it("stores fully resolved parameters in public galaxyParams property", () => {
            const material = new GalaxyMaterial();
            expect(material.galaxyParams).toEqual(DEFAULT_ORB_PARAMETERS);
        });
    });

    describe("constructor parameter resolution and options", () => {
        it("selects DEFAULT_PINPRICK_PARAMETERS when shaderKey is 'galaxy_pinprick'", () => {
            const material = new GalaxyMaterial({
                shaderKey: "galaxy_pinprick",
            });

            expect(material.shaderKey).toBe("galaxy_pinprick");
            expect(material.galaxyParams).toEqual(DEFAULT_PINPRICK_PARAMETERS);

            const uniforms = material.getUniforms();
            expect(uniforms["u_rotationSpeed"]).toBe(DEFAULT_PINPRICK_PARAMETERS.rotationSpeed);
            expect(uniforms["u_differentialSpeed"]).toBe(DEFAULT_PINPRICK_PARAMETERS.differentialSpeed);
            expect(uniforms["u_driftSpeed"]).toBe(DEFAULT_PINPRICK_PARAMETERS.driftSpeed);
            expect(uniforms["u_driftAmplitude"]).toBe(DEFAULT_PINPRICK_PARAMETERS.driftAmplitude);
            expect(uniforms["u_pointScale"]).toBe(DEFAULT_PINPRICK_PARAMETERS.pointScale);
            expect(uniforms["u_minPointSize"]).toBe(DEFAULT_PINPRICK_PARAMETERS.minPointSize);
            expect(uniforms["u_maxPointSize"]).toBe(DEFAULT_PINPRICK_PARAMETERS.maxPointSize);
            expect(uniforms["u_nearFadeDistance"]).toBe(DEFAULT_PINPRICK_PARAMETERS.nearFadeDistance);
            expect(uniforms["u_coreColor"]).toEqual(DEFAULT_PINPRICK_PARAMETERS.coreColor);
            expect(uniforms["u_coreBlazeColor"]).toEqual(DEFAULT_PINPRICK_PARAMETERS.coreBlazeColor);
            expect(uniforms["u_armInnerColor"]).toEqual(DEFAULT_PINPRICK_PARAMETERS.armInnerColor);
            expect(uniforms["u_armOuterColor"]).toEqual(DEFAULT_PINPRICK_PARAMETERS.armOuterColor);
            expect(uniforms["u_accentColor"]).toEqual(DEFAULT_PINPRICK_PARAMETERS.accentColor);
            expect(uniforms["u_coreGlowBoost"]).toBe(DEFAULT_PINPRICK_PARAMETERS.coreGlowBoost);
        });

        it("selects DEFAULT_ORB_PARAMETERS when shaderKey is 'galaxy_orb'", () => {
            const material = new GalaxyMaterial({
                shaderKey: "galaxy_orb",
            });

            expect(material.shaderKey).toBe("galaxy_orb");
            expect(material.galaxyParams).toEqual(DEFAULT_ORB_PARAMETERS);
            expect(material.getUniforms()["u_pointScale"]).toBe(DEFAULT_ORB_PARAMETERS.pointScale);
        });

        it("overrides individual partial params while preserving remaining default values", () => {
            const customCoreColor: [number, number, number] = [0.2, 0.8, 0.4];
            const material = new GalaxyMaterial({
                shaderKey: "galaxy_orb",
                params: {
                    rotationSpeed: -0.12,
                    pointScale: 6.5,
                    coreColor: customCoreColor,
                },
            });

            expect(material.galaxyParams.rotationSpeed).toBe(-0.12);
            expect(material.galaxyParams.pointScale).toBe(6.5);
            expect(material.galaxyParams.coreColor).toEqual(customCoreColor);
            expect(material.galaxyParams.driftSpeed).toBe(DEFAULT_ORB_PARAMETERS.driftSpeed);
            expect(material.galaxyParams.armOuterColor).toEqual(DEFAULT_ORB_PARAMETERS.armOuterColor);

            const uniforms = material.getUniforms();
            expect(uniforms["u_rotationSpeed"]).toBe(-0.12);
            expect(uniforms["u_pointScale"]).toBe(6.5);
            expect(uniforms["u_coreColor"]).toEqual(customCoreColor);
            expect(uniforms["u_driftSpeed"]).toBe(DEFAULT_ORB_PARAMETERS.driftSpeed);
        });

        it("allows custom options.pipelineState to override default additive state", () => {
            const material = new GalaxyMaterial({
                pipelineState: {
                    blendMode: "opaque",
                    depthTest: true,
                    depthWrite: true,
                    cullFace: true,
                },
            });

            expect(material.pipelineState).toEqual({
                blendMode: "opaque",
                depthTest: true,
                depthWrite: true,
                cullFace: true,
            });
        });

        it("supports partial options.pipelineState overrides while preserving other additive defaults", () => {
            const material = new GalaxyMaterial({
                pipelineState: {
                    depthTest: true,
                },
            });

            expect(material.pipelineState).toEqual({
                blendMode: "additive",
                depthTest: true,
                depthWrite: false,
                cullFace: false,
            });
        });

        it("merges custom additional uniforms from options.uniforms alongside galaxy uniforms", () => {
            const material = new GalaxyMaterial({
                uniforms: {
                    u_customTime: 12.34,
                    u_customMatrix: [1, 0, 0, 1],
                },
            });

            const uniforms = material.getUniforms();
            expect(uniforms["u_customTime"]).toBe(12.34);
            expect(uniforms["u_customMatrix"]).toEqual([1, 0, 0, 1]);
            expect(uniforms["u_rotationSpeed"]).toBe(DEFAULT_ORB_PARAMETERS.rotationSpeed);
        });

        it("allows custom uniforms in options.uniforms to explicitly override a standard galaxy uniform", () => {
            const material = new GalaxyMaterial({
                uniforms: {
                    u_rotationSpeed: 99.9,
                },
            });

            expect(material.getUniforms()["u_rotationSpeed"]).toBe(99.9);
        });
    });

    describe("updateParameters", () => {
        it("updates simulation uniforms when scalar parameters change", () => {
            const material = new GalaxyMaterial({ params: { style: "orb" } });

            material.updateParameters({
                rotationSpeed: -0.2,
                differentialSpeed: 0.05,
                driftSpeed: 0.35,
                driftAmplitude: 0.28,
                pointScale: 8.0,
                minPointSize: 2.0,
                maxPointSize: 10.0,
                nearFadeDistance: 3.2,
                coreGlowBoost: 1.5,
            });

            const uniforms = material.getUniforms();
            expect(uniforms["u_rotationSpeed"]).toBe(-0.2);
            expect(uniforms["u_differentialSpeed"]).toBe(0.05);
            expect(uniforms["u_driftSpeed"]).toBe(0.35);
            expect(uniforms["u_driftAmplitude"]).toBe(0.28);
            expect(uniforms["u_pointScale"]).toBe(8.0);
            expect(uniforms["u_minPointSize"]).toBe(2.0);
            expect(uniforms["u_maxPointSize"]).toBe(10.0);
            expect(uniforms["u_nearFadeDistance"]).toBe(3.2);
            expect(uniforms["u_coreGlowBoost"]).toBe(1.5);
        });

        it("updates simulation uniforms when color vector parameters change", () => {
            const material = new GalaxyMaterial({ params: { style: "orb" } });

            const newCoreColor: [number, number, number] = [0.1, 0.2, 0.3];
            const newCoreBlazeColor: [number, number, number] = [0.4, 0.5, 0.6];
            const newArmInnerColor: [number, number, number] = [0.7, 0.8, 0.9];
            const newArmOuterColor: [number, number, number] = [0.15, 0.25, 0.35];
            const newAccentColor: [number, number, number] = [0.45, 0.55, 0.65];

            material.updateParameters({
                coreColor: newCoreColor,
                coreBlazeColor: newCoreBlazeColor,
                armInnerColor: newArmInnerColor,
                armOuterColor: newArmOuterColor,
                accentColor: newAccentColor,
            });

            const uniforms = material.getUniforms();
            expect(uniforms["u_coreColor"]).toEqual(newCoreColor);
            expect(uniforms["u_coreBlazeColor"]).toEqual(newCoreBlazeColor);
            expect(uniforms["u_armInnerColor"]).toEqual(newArmInnerColor);
            expect(uniforms["u_armOuterColor"]).toEqual(newArmOuterColor);
            expect(uniforms["u_accentColor"]).toEqual(newAccentColor);
        });

        it("does not alter shaderKey when updating simulation parameters", () => {
            const material = new GalaxyMaterial({ shaderKey: "galaxy_pinprick" });
            expect(material.shaderKey).toBe("galaxy_pinprick");

            material.updateParameters({ pointScale: 7.0, rotationSpeed: -0.15 });
            expect(material.shaderKey).toBe("galaxy_pinprick");
        });

        it("updates galaxyParams object in-place with new values", () => {
            const material = new GalaxyMaterial({ params: { style: "orb" } });
            const paramsRef = material.galaxyParams;

            material.updateParameters({
                rotationSpeed: -0.09,
                starCount: 50000,
            });

            expect(material.galaxyParams).toBe(paramsRef);
            expect(material.galaxyParams.rotationSpeed).toBe(-0.09);
            expect(material.galaxyParams.starCount).toBe(50000);
        });

        it("ignores undefined fields without clearing or resetting existing uniforms", () => {
            const material = new GalaxyMaterial({ params: { style: "orb" } });
            const initialCoreColor = material.getUniforms()["u_coreColor"];

            material.updateParameters({
                rotationSpeed: -0.08,
                coreColor: undefined,
            });

            expect(material.getUniforms()["u_rotationSpeed"]).toBe(-0.08);
            expect(material.getUniforms()["u_coreColor"]).toEqual(initialCoreColor);
        });

        it("returns void and executes without throwing when given an empty update object", () => {
            const material = new GalaxyMaterial();
            const initialUniforms = { ...material.getUniforms() };

            const result = material.updateParameters({});
            expect(result).toBeUndefined();
            expect(material.getUniforms()).toEqual(initialUniforms);
        });
    });

    describe("inherited Material contracts", () => {
        it("setUniform updates an individual uniform and returns this for fluent chaining", () => {
            const material = new GalaxyMaterial();
            const chainResult = material.setUniform("u_testUniform", 42);

            expect(chainResult).toBe(material);
            expect(material.getUniforms()["u_testUniform"]).toBe(42);
        });

        it("setUniforms updates multiple uniforms and returns this for fluent chaining", () => {
            const material = new GalaxyMaterial();
            const chainResult = material.setUniforms({
                u_customA: 101,
                u_customB: "active",
            });

            expect(chainResult).toBe(material);
            expect(material.getUniforms()["u_customA"]).toBe(101);
            expect(material.getUniforms()["u_customB"]).toBe("active");
        });

        it("getUniforms returns an immutable snapshot of all assigned uniforms", () => {
            const material = new GalaxyMaterial();
            const snapshot = material.getUniforms();

            expect(typeof snapshot).toBe("object");
            expect(snapshot["u_pointScale"]).toBe(DEFAULT_ORB_PARAMETERS.pointScale);
        });

        it("allows setting and reading shaderKey via getter and setter", () => {
            const material = new GalaxyMaterial();
            expect(material.shaderKey).toBe("galaxy_orb");

            material.shaderKey = "galaxy_pinprick";
            expect(material.shaderKey).toBe("galaxy_pinprick");
        });

        it("clone() produces a cloned Material instance with matching shaderKey, pipelineState, and uniforms", () => {
            const material = new GalaxyMaterial({
                shaderKey: "galaxy_pinprick",
                params: {
                    rotationSpeed: -0.06,
                },
                pipelineState: {
                    depthTest: true,
                },
            });

            const cloned = material.clone();

            expect(cloned).not.toBe(material);
            expect(cloned.shaderKey).toBe("galaxy_pinprick");
            expect(cloned.pipelineState).toEqual({
                blendMode: "additive",
                depthTest: true,
                depthWrite: false,
                cullFace: false,
            });
            expect(cloned.getUniforms()["u_rotationSpeed"]).toBe(-0.06);
            expect(cloned.getUniforms()["u_pointScale"]).toBe(DEFAULT_PINPRICK_PARAMETERS.pointScale);
        });

        it("clone() produces an independent uniform copy that is isolated from mutations to original", () => {
            const material = new GalaxyMaterial();
            const cloned = material.clone();

            material.setUniform("u_pointScale", 999);
            expect(cloned.getUniforms()["u_pointScale"]).toBe(DEFAULT_ORB_PARAMETERS.pointScale);
        });

        it("supports texture binding pass-through via setTexture, getTexture, and getTextures", () => {
            const material = new GalaxyMaterial();
            const mockTex = createMockTexture("galaxy-noise");

            const chainResult = material.setTexture(TextureUnit.Noise, mockTex);
            expect(chainResult).toBe(material);
            expect(material.getTexture(TextureUnit.Noise)).toBe(mockTex);
            expect(material.getTextures().get(TextureUnit.Noise)).toBe(mockTex);

            material.setTexture(TextureUnit.Noise, null);
            expect(material.getTexture(TextureUnit.Noise)).toBeNull();
        });

        it("supports cube texture binding pass-through via setCubeTexture, getCubeTexture, and getCubeTextures", () => {
            const material = new GalaxyMaterial();
            const mockCube = createMockCubeTexture("galaxy-env");

            const chainResult = material.setCubeTexture(TextureUnit.Environment, mockCube);
            expect(chainResult).toBe(material);
            expect(material.getCubeTexture(TextureUnit.Environment)).toBe(mockCube);
            expect(material.getCubeTextures().get(TextureUnit.Environment)).toBe(mockCube);

            material.setCubeTexture(TextureUnit.Environment, null);
            expect(material.getCubeTexture(TextureUnit.Environment)).toBeNull();
        });
    });

    describe("IDisposable lifecycle inheritance", () => {
        it("isDisposed starts false and becomes true after dispose()", () => {
            const material = new GalaxyMaterial();
            expect(material.isDisposed).toBe(false);

            material.dispose();
            expect(material.isDisposed).toBe(true);
        });

        it("calls registered onDispose listener once upon dispose()", () => {
            const material = new GalaxyMaterial();
            const listener = vi.fn();

            material.onDispose(listener);
            expect(listener).not.toHaveBeenCalled();

            material.dispose();
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it("calls multiple registered onDispose listeners in registration order", () => {
            const material = new GalaxyMaterial();
            const callOrder: string[] = [];

            material.onDispose(() => callOrder.push("first"));
            material.onDispose(() => callOrder.push("second"));

            material.dispose();
            expect(callOrder).toEqual(["first", "second"]);
        });

        it("returned unsubscribe callback prevents listener from being called", () => {
            const material = new GalaxyMaterial();
            const listener = vi.fn();

            const unsubscribe = material.onDispose(listener);
            unsubscribe();

            material.dispose();
            expect(listener).not.toHaveBeenCalled();
        });

        it("disposal is idempotent (calling dispose multiple times fires callbacks only once)", () => {
            const material = new GalaxyMaterial();
            const listener = vi.fn();

            material.onDispose(listener);
            material.dispose();
            material.dispose();
            material.dispose();

            expect(listener).toHaveBeenCalledTimes(1);
            expect(material.isDisposed).toBe(true);
        });

        it("disposes bound textures and cube textures and clears uniform maps upon dispose()", () => {
            const material = new GalaxyMaterial();
            const mockTex = createMockTexture("star-tex");
            const mockCube = createMockCubeTexture("space-cube");

            material.setTexture(TextureUnit.Color, mockTex);
            material.setCubeTexture(TextureUnit.Environment, mockCube);

            material.dispose();

            expect(mockTex.dispose).toHaveBeenCalledTimes(1);
            expect(mockCube.dispose).toHaveBeenCalledTimes(1);
            expect(material.getTexture(TextureUnit.Color)).toBeNull();
            expect(material.getCubeTexture(TextureUnit.Environment)).toBeNull();
            expect(material.getUniforms()).toEqual({});
        });
    });
});
