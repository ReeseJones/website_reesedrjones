import { describe, it, expect, vi } from "vitest";
import { GalacticCloudMaterial } from "./galactic_cloud_material";
import { BlendMode } from "./material_types";
import {
    DEFAULT_HORIZON_INTENSITY,
    DEFAULT_HORIZON_THICKNESS,
    DEFAULT_HORIZON_COLOR_CENTER,
    DEFAULT_HORIZON_COLOR_OUTER,
    DEFAULT_CLOUD_ASPECT,
    DEFAULT_CLOUD_FOV_SCALE,
    DEFAULT_CLOUD_PITCH,
    DEFAULT_CLOUD_YAW,
    DEFAULT_CLOUD_ROLL,
    DEFAULT_CLOUD_PITCH_OFFSET,
    DEFAULT_CLOUD_YAW_OFFSET,
} from "./galactic_cloud_material_constants";
import type { GalacticCloudFrameUniforms } from "./galactic_cloud_material_types";

describe("GalacticCloudMaterial", () => {
    describe("constructor and default initialization", () => {
        it("default construction sets shaderKey to 'galactic_cloud'", () => {
            const material = new GalacticCloudMaterial();
            expect(material.shaderKey).toBe("galactic_cloud");
        });

        it("configures default pipelineState for alpha blended fullscreen backdrop", () => {
            const material = new GalacticCloudMaterial();
            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Alpha,
                depthTest: false,
                depthWrite: false,
                cullFace: false,
            });
        });

        it("populates default horizon styling and view-ray uniforms", () => {
            const material = new GalacticCloudMaterial();
            const uniforms = material.getUniforms();

            expect(uniforms.uHorizonIntensity).toBe(DEFAULT_HORIZON_INTENSITY);
            expect(uniforms.uHorizonThickness).toBe(DEFAULT_HORIZON_THICKNESS);
            expect(uniforms.uHorizonColorCenter).toEqual(DEFAULT_HORIZON_COLOR_CENTER);
            expect(uniforms.uHorizonColorOuter).toEqual(DEFAULT_HORIZON_COLOR_OUTER);
            expect(uniforms.uAspect).toBe(DEFAULT_CLOUD_ASPECT);
            expect(uniforms.uFovScale).toBe(DEFAULT_CLOUD_FOV_SCALE);
            expect(uniforms.uPitch).toBe(DEFAULT_CLOUD_PITCH);
            expect(uniforms.uYaw).toBe(DEFAULT_CLOUD_YAW);
            expect(uniforms.uRoll).toBe(DEFAULT_CLOUD_ROLL);
            expect(uniforms.uPitchOffset).toBe(DEFAULT_CLOUD_PITCH_OFFSET);
            expect(uniforms.uYawOffset).toBe(DEFAULT_CLOUD_YAW_OFFSET);
        });
    });

    describe("constructor parameter resolution and options", () => {
        it("accepts custom shaderKey override", () => {
            const material = new GalacticCloudMaterial({
                shaderKey: "galactic_cloud",
            });
            expect(material.shaderKey).toBe("galactic_cloud");
        });

        it("accepts custom galaxy parameters overriding default horizon colors and intensity", () => {
            const customCenter: [number, number, number] = [0.8, 0.2, 0.4];
            const customOuter: [number, number, number] = [0.1, 0.9, 0.3];
            const material = new GalacticCloudMaterial({
                params: {
                    horizonIntensity: 1.5,
                    horizonThickness: 0.45,
                    horizonColorCenter: customCenter,
                    horizonColorOuter: customOuter,
                },
            });

            const uniforms = material.getUniforms();
            expect(uniforms.uHorizonIntensity).toBe(1.5);
            expect(uniforms.uHorizonThickness).toBe(0.45);
            expect(uniforms.uHorizonColorCenter).toEqual(customCenter);
            expect(uniforms.uHorizonColorOuter).toEqual(customOuter);
        });

        it("falls back to default horizon values when partial params are provided", () => {
            const material = new GalacticCloudMaterial({
                params: {
                    horizonIntensity: 0.5,
                },
            });

            const uniforms = material.getUniforms();
            expect(uniforms.uHorizonIntensity).toBe(0.5);
            expect(uniforms.uHorizonThickness).toBe(DEFAULT_HORIZON_THICKNESS);
            expect(uniforms.uHorizonColorCenter).toEqual(DEFAULT_HORIZON_COLOR_CENTER);
            expect(uniforms.uHorizonColorOuter).toEqual(DEFAULT_HORIZON_COLOR_OUTER);
        });

        it("allows pipelineState overrides via options", () => {
            const material = new GalacticCloudMaterial({
                pipelineState: {
                    blendMode: BlendMode.Opaque,
                    depthTest: true,
                    depthWrite: true,
                    cullFace: true,
                },
            });

            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Opaque,
                depthTest: true,
                depthWrite: true,
                cullFace: true,
            });
        });

        it("preserves default pipelineState flags when only partial overrides are supplied", () => {
            const material = new GalacticCloudMaterial({
                pipelineState: {
                    blendMode: BlendMode.Additive,
                },
            });

            expect(material.pipelineState.blendMode).toBe(BlendMode.Additive);
            expect(material.pipelineState.depthTest).toBe(false);
            expect(material.pipelineState.depthWrite).toBe(false);
            expect(material.pipelineState.cullFace).toBe(false);
        });

        it("merges additional custom uniforms provided via options.uniforms", () => {
            const material = new GalacticCloudMaterial({
                uniforms: {
                    uCustomFactor: 42.0,
                },
            });

            const uniforms = material.getUniforms();
            expect(uniforms.uCustomFactor).toBe(42.0);
            expect(uniforms.uHorizonIntensity).toBe(DEFAULT_HORIZON_INTENSITY);
        });
    });

    describe(".shaderKey", () => {
        it("returns the active shader key via getter", () => {
            const material = new GalacticCloudMaterial();
            expect(material.shaderKey).toBe("galactic_cloud");
        });

        it("updates shader key via setter", () => {
            const material = new GalacticCloudMaterial();
            material.shaderKey = "galactic_cloud";
            expect(material.shaderKey).toBe("galactic_cloud");
        });
    });

    describe(".updateParameters()", () => {
        it("updates horizonIntensity uniform", () => {
            const material = new GalacticCloudMaterial();
            material.updateParameters({ horizonIntensity: 1.25 });

            expect(material.getUniforms().uHorizonIntensity).toBe(1.25);
            expect(material.getUniforms().uHorizonThickness).toBe(DEFAULT_HORIZON_THICKNESS);
        });

        it("updates horizonThickness uniform", () => {
            const material = new GalacticCloudMaterial();
            material.updateParameters({ horizonThickness: 0.88 });

            expect(material.getUniforms().uHorizonThickness).toBe(0.88);
        });

        it("updates horizonColorCenter uniform", () => {
            const material = new GalacticCloudMaterial();
            const newCenter: [number, number, number] = [0.1, 0.2, 0.3];
            material.updateParameters({ horizonColorCenter: newCenter });

            expect(material.getUniforms().uHorizonColorCenter).toEqual(newCenter);
        });

        it("updates horizonColorOuter uniform", () => {
            const material = new GalacticCloudMaterial();
            const newOuter: [number, number, number] = [0.9, 0.8, 0.7];
            material.updateParameters({ horizonColorOuter: newOuter });

            expect(material.getUniforms().uHorizonColorOuter).toEqual(newOuter);
        });

        it("updates multiple horizon parameters simultaneously", () => {
            const material = new GalacticCloudMaterial();
            const newCenter: [number, number, number] = [0.4, 0.5, 0.6];
            const newOuter: [number, number, number] = [0.7, 0.8, 0.9];

            material.updateParameters({
                horizonIntensity: 0.95,
                horizonThickness: 0.35,
                horizonColorCenter: newCenter,
                horizonColorOuter: newOuter,
            });

            const uniforms = material.getUniforms();
            expect(uniforms.uHorizonIntensity).toBe(0.95);
            expect(uniforms.uHorizonThickness).toBe(0.35);
            expect(uniforms.uHorizonColorCenter).toEqual(newCenter);
            expect(uniforms.uHorizonColorOuter).toEqual(newOuter);
        });

        it("does not alter uniforms when called with empty object", () => {
            const material = new GalacticCloudMaterial();
            const setUniformsSpy = vi.spyOn(material, "setUniforms");

            material.updateParameters({});

            expect(setUniformsSpy).not.toHaveBeenCalled();
            expect(material.getUniforms().uHorizonIntensity).toBe(DEFAULT_HORIZON_INTENSITY);
        });
    });

    describe(".updateFrameUniforms()", () => {
        it("updates all dynamic per-frame uniforms in a single call", () => {
            const material = new GalacticCloudMaterial();
            const frameUniforms: GalacticCloudFrameUniforms = {
                aspect: 1.777,
                fovScale: 0.466,
                pitch: 0.35,
                yaw: 1.2,
                roll: -0.1,
                effectivePitchOffset: 0.05,
                effectiveYawOffset: -0.08,
            };

            material.updateFrameUniforms(frameUniforms);

            const uniforms = material.getUniforms();
            expect(uniforms.uAspect).toBe(1.777);
            expect(uniforms.uFovScale).toBe(0.466);
            expect(uniforms.uPitch).toBe(0.35);
            expect(uniforms.uYaw).toBe(1.2);
            expect(uniforms.uRoll).toBe(-0.1);
            expect(uniforms.uPitchOffset).toBe(0.05);
            expect(uniforms.uYawOffset).toBe(-0.08);
        });

        it("preserves static horizon styling uniforms when updating frame uniforms", () => {
            const material = new GalacticCloudMaterial({
                params: { horizonIntensity: 1.8 },
            });

            material.updateFrameUniforms({
                aspect: 2.0,
                fovScale: 0.5,
                pitch: 0.1,
                yaw: 0.2,
                roll: 0.0,
                effectivePitchOffset: 0.01,
                effectiveYawOffset: 0.02,
            });

            expect(material.getUniforms().uHorizonIntensity).toBe(1.8);
            expect(material.getUniforms().uAspect).toBe(2.0);
        });
    });

    describe(".dispose()", () => {
        it("executes without error", () => {
            const material = new GalacticCloudMaterial();
            expect(() => material.dispose()).not.toThrow();
        });

        it("is idempotent when called multiple times", () => {
            const material = new GalacticCloudMaterial();
            material.dispose();
            expect(() => material.dispose()).not.toThrow();
        });
    });

    describe("Material inherited contracts", () => {
        it("supports fluent setUniform chaining", () => {
            const material = new GalacticCloudMaterial();
            const returned = material.setUniform("uCustom", 123);
            expect(returned).toBe(material);
            expect(material.getUniforms().uCustom).toBe(123);
        });

        it("supports fluent setUniforms chaining", () => {
            const material = new GalacticCloudMaterial();
            const returned = material.setUniforms({ uA: 1, uB: 2 });
            expect(returned).toBe(material);
            expect(material.getUniforms().uA).toBe(1);
            expect(material.getUniforms().uB).toBe(2);
        });

        it("creates an independent clone with identical configuration", () => {
            const material = new GalacticCloudMaterial({
                params: { horizonIntensity: 1.1 },
            });

            const clone = material.clone();
            expect(clone).toBeInstanceOf(GalacticCloudMaterial);
            expect(clone).not.toBe(material);
            expect(clone.shaderKey).toBe(material.shaderKey);
            expect(clone.getUniforms().uHorizonIntensity).toBe(1.1);
            expect(clone.pipelineState).toEqual(material.pipelineState);
        });
    });
});
