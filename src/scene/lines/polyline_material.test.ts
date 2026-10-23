import { describe, it, expect, vi } from "vitest";
import { PolylineMaterial } from "./polyline_material";
import { BlendMode } from "../materials/material_types";
import type { RgbaLike } from "../../helpers/colors_types";
import {
    DEFAULT_POLYLINE_WIDTH,
    DEFAULT_POLYLINE_MITER_LIMIT,
    DEFAULT_POLYLINE_COLOR_R,
    DEFAULT_POLYLINE_COLOR_G,
    DEFAULT_POLYLINE_COLOR_B,
    DEFAULT_POLYLINE_COLOR_A,
    DEFAULT_POLYLINE_GLOW_R,
    DEFAULT_POLYLINE_GLOW_G,
    DEFAULT_POLYLINE_GLOW_B,
    DEFAULT_POLYLINE_GLOW_A,
    DEFAULT_POLYLINE_GLOW_INTENSITY,
    DEFAULT_POLYLINE_DASH_SPEED,
    DEFAULT_POLYLINE_DASH_FREQUENCY,
} from "./polyline_constants";

const TEST_COLOR_R = 0.5;
const TEST_COLOR_G = 0.25;
const TEST_COLOR_B = 0.75;
const TEST_COLOR_A = 0.5;

const SECONDARY_COLOR_A = 0.875;

const TEST_GLOW_R = 0.125;
const TEST_GLOW_G = 0.375;
const TEST_GLOW_B = 0.625;
const TEST_GLOW_A = 0.5;

describe("PolylineMaterial", () => {
    describe("constructor and default initialization", () => {
        it("should initialize with shaderKey 'polyline_ribbon'", () => {
            const material = new PolylineMaterial();
            expect(material.shaderKey).toBe("polyline_ribbon");
        });

        it("should configure ribbon pipeline state (Additive blend, cullFace false, depthTest true, depthWrite false)", () => {
            const material = new PolylineMaterial();

            expect(material.pipelineState).toEqual({
                cullFace: false,
                blendMode: BlendMode.Additive,
                depthTest: true,
                depthWrite: false,
            });
        });

        it("should allow pipelineState overrides via options", () => {
            const material = new PolylineMaterial({
                pipelineState: {
                    depthTest: false,
                    blendMode: BlendMode.Alpha,
                },
            });

            expect(material.pipelineState.depthTest).toBe(false);
            expect(material.pipelineState.blendMode).toBe(BlendMode.Alpha);
            expect(material.pipelineState.cullFace).toBe(false);
            expect(material.pipelineState.depthWrite).toBe(false);
        });

        it("should initialize default scalar parameters (lineWidth, miterLimit, glowIntensity, dashSpeed, dashFrequency)", () => {
            const material = new PolylineMaterial();

            expect(material.lineWidth).toBeCloseTo(DEFAULT_POLYLINE_WIDTH);
            expect(material.miterLimit).toBeCloseTo(DEFAULT_POLYLINE_MITER_LIMIT);
            expect(material.glowIntensity).toBeCloseTo(DEFAULT_POLYLINE_GLOW_INTENSITY);
            expect(material.dashSpeed).toBeCloseTo(DEFAULT_POLYLINE_DASH_SPEED);
            expect(material.dashFrequency).toBeCloseTo(DEFAULT_POLYLINE_DASH_FREQUENCY);
        });

        it("should initialize default colors and register uniforms", () => {
            const material = new PolylineMaterial();

            const color = material.getColor();
            expect(color.r).toBeCloseTo(DEFAULT_POLYLINE_COLOR_R);
            expect(color.g).toBeCloseTo(DEFAULT_POLYLINE_COLOR_G);
            expect(color.b).toBeCloseTo(DEFAULT_POLYLINE_COLOR_B);
            expect(color.a).toBeCloseTo(DEFAULT_POLYLINE_COLOR_A);

            const glowColor = material.getGlowColor();
            expect(glowColor.r).toBeCloseTo(DEFAULT_POLYLINE_GLOW_R);
            expect(glowColor.g).toBeCloseTo(DEFAULT_POLYLINE_GLOW_G);
            expect(glowColor.b).toBeCloseTo(DEFAULT_POLYLINE_GLOW_B);
            expect(glowColor.a).toBeCloseTo(DEFAULT_POLYLINE_GLOW_A);

            const uniforms = material.getUniforms();
            expect(uniforms["u_color"]).toBeInstanceOf(Float32Array);
            expect(uniforms["u_glowColor"]).toBeInstanceOf(Float32Array);
            expect(uniforms["u_lineWidth"]).toBe(DEFAULT_POLYLINE_WIDTH);
            expect(uniforms["u_miterLimit"]).toBe(DEFAULT_POLYLINE_MITER_LIMIT);
            expect(uniforms["u_glowIntensity"]).toBe(DEFAULT_POLYLINE_GLOW_INTENSITY);
            expect(uniforms["u_dashSpeed"]).toBe(DEFAULT_POLYLINE_DASH_SPEED);
            expect(uniforms["u_dashFrequency"]).toBe(DEFAULT_POLYLINE_DASH_FREQUENCY);
        });

        it("should initialize with custom options", () => {
            const material = new PolylineMaterial({
                lineWidth: 8.0,
                miterLimit: 5.0,
                glowIntensity: 2.5,
                dashSpeed: 1.5,
                dashFrequency: 0.25,
                color: { r: TEST_COLOR_R, g: TEST_COLOR_G, b: TEST_COLOR_B, a: TEST_COLOR_A },
                glowColor: { r: TEST_GLOW_R, g: TEST_GLOW_G, b: TEST_GLOW_B, a: TEST_GLOW_A },
            });

            expect(material.lineWidth).toBeCloseTo(8.0);
            expect(material.miterLimit).toBeCloseTo(5.0);
            expect(material.glowIntensity).toBeCloseTo(2.5);
            expect(material.dashSpeed).toBeCloseTo(1.5);
            expect(material.dashFrequency).toBeCloseTo(0.25);

            const color = material.getColor();
            expect(color.r).toBeCloseTo(TEST_COLOR_R);
            expect(color.a).toBeCloseTo(TEST_COLOR_A);

            const glow = material.getGlowColor();
            expect(glow.r).toBeCloseTo(TEST_GLOW_R);
            expect(glow.a).toBeCloseTo(TEST_GLOW_A);
        });

        it("should default alpha to 1.0 when custom color or glowColor omits alpha", () => {
            const material = new PolylineMaterial({
                color: { r: 0.5, g: 0.5, b: 0.5 } as RgbaLike,
                glowColor: { r: 0.8, g: 0.8, b: 0.8 } as RgbaLike,
            });

            expect(material.getColor().a).toBeCloseTo(1.0);
            expect(material.getGlowColor().a).toBeCloseTo(1.0);
        });
    });

    describe(".lineWidth", () => {
        it("should update property and synchronize uniform 'u_lineWidth'", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.lineWidth = 12.0;

            expect(material.lineWidth).toBe(12.0);
            expect(setUniformSpy).toHaveBeenCalledWith("u_lineWidth", 12.0);
        });

        it("should dirty-check and avoid uniform update when setting identical value", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.lineWidth = DEFAULT_POLYLINE_WIDTH;

            expect(setUniformSpy).not.toHaveBeenCalled();
        });
    });

    describe(".miterLimit", () => {
        it("should update property and synchronize uniform 'u_miterLimit'", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.miterLimit = 4.5;

            expect(material.miterLimit).toBe(4.5);
            expect(setUniformSpy).toHaveBeenCalledWith("u_miterLimit", 4.5);
        });

        it("should dirty-check and avoid uniform update when setting identical value", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.miterLimit = DEFAULT_POLYLINE_MITER_LIMIT;

            expect(setUniformSpy).not.toHaveBeenCalled();
        });
    });

    describe(".glowIntensity", () => {
        it("should update property and synchronize uniform 'u_glowIntensity'", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.glowIntensity = 3.0;

            expect(material.glowIntensity).toBe(3.0);
            expect(setUniformSpy).toHaveBeenCalledWith("u_glowIntensity", 3.0);
        });

        it("should dirty-check and avoid uniform update when setting identical value", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.glowIntensity = DEFAULT_POLYLINE_GLOW_INTENSITY;

            expect(setUniformSpy).not.toHaveBeenCalled();
        });
    });

    describe(".dashSpeed", () => {
        it("should update property and synchronize uniform 'u_dashSpeed'", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.dashSpeed = 2.0;

            expect(material.dashSpeed).toBe(2.0);
            expect(setUniformSpy).toHaveBeenCalledWith("u_dashSpeed", 2.0);
        });

        it("should dirty-check and avoid uniform update when setting identical value", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.dashSpeed = DEFAULT_POLYLINE_DASH_SPEED;

            expect(setUniformSpy).not.toHaveBeenCalled();
        });
    });

    describe(".dashFrequency", () => {
        it("should update property and synchronize uniform 'u_dashFrequency'", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.dashFrequency = 0.5;

            expect(material.dashFrequency).toBe(0.5);
            expect(setUniformSpy).toHaveBeenCalledWith("u_dashFrequency", 0.5);
        });

        it("should dirty-check and avoid uniform update when setting identical value", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.dashFrequency = DEFAULT_POLYLINE_DASH_FREQUENCY;

            expect(setUniformSpy).not.toHaveBeenCalled();
        });
    });

    describe(".getColor() and .setColor()", () => {
        it("should return a new RgbaLike object with accurate values when out parameter is omitted", () => {
            const material = new PolylineMaterial();
            const color = material.getColor();

            expect(color.r).toBeCloseTo(DEFAULT_POLYLINE_COLOR_R);
            expect(color.g).toBeCloseTo(DEFAULT_POLYLINE_COLOR_G);
            expect(color.b).toBeCloseTo(DEFAULT_POLYLINE_COLOR_B);
            expect(color.a).toBeCloseTo(DEFAULT_POLYLINE_COLOR_A);
        });

        it("should populate and return the provided out parameter for zero-allocation access", () => {
            const material = new PolylineMaterial();
            const out: RgbaLike = { r: 0, g: 0, b: 0, a: 0 };
            const returned = material.getColor(out);

            expect(returned).toBe(out);
            expect(out.r).toBeCloseTo(DEFAULT_POLYLINE_COLOR_R);
            expect(out.g).toBeCloseTo(DEFAULT_POLYLINE_COLOR_G);
            expect(out.b).toBeCloseTo(DEFAULT_POLYLINE_COLOR_B);
            expect(out.a).toBeCloseTo(DEFAULT_POLYLINE_COLOR_A);
        });

        it("should set color using RgbaLike object and return this (fluent chaining)", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            const returned = material.setColor({
                r: TEST_COLOR_R,
                g: TEST_COLOR_G,
                b: TEST_COLOR_B,
                a: TEST_COLOR_A,
            });

            expect(returned).toBe(material);
            expect(setUniformSpy).toHaveBeenCalledWith("u_color", expect.any(Float32Array));

            const color = material.getColor();
            expect(color.r).toBeCloseTo(TEST_COLOR_R);
            expect(color.g).toBeCloseTo(TEST_COLOR_G);
            expect(color.b).toBeCloseTo(TEST_COLOR_B);
            expect(color.a).toBeCloseTo(TEST_COLOR_A);
        });

        it("should set color using separate RGBA components and return this (fluent chaining)", () => {
            const material = new PolylineMaterial();
            const returned = material.setColor(TEST_COLOR_R, TEST_COLOR_G, TEST_COLOR_B, TEST_COLOR_A);

            expect(returned).toBe(material);
            const color = material.getColor();
            expect(color.r).toBeCloseTo(TEST_COLOR_R);
            expect(color.g).toBeCloseTo(TEST_COLOR_G);
            expect(color.b).toBeCloseTo(TEST_COLOR_B);
            expect(color.a).toBeCloseTo(TEST_COLOR_A);
        });

        it("should default alpha to 1.0 when omitted in numeric component overload", () => {
            const material = new PolylineMaterial();
            material.setColor(0.5, 0.25, 0.75);

            const color = material.getColor();
            expect(color.r).toBeCloseTo(0.5);
            expect(color.g).toBeCloseTo(0.25);
            expect(color.b).toBeCloseTo(0.75);
            expect(color.a).toBeCloseTo(1.0);
        });

        it("should default alpha to 1.0 when omitted in RgbaLike object overload", () => {
            const material = new PolylineMaterial();
            material.setColor({ r: 0.5, g: 0.25, b: 0.75 } as RgbaLike);

            expect(material.getColor().a).toBeCloseTo(1.0);
        });

        it("should dirty-check and avoid uniform update when setting identical color", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            // First mutate to known values
            material.setColor(TEST_COLOR_R, TEST_COLOR_G, TEST_COLOR_B, TEST_COLOR_A);
            expect(setUniformSpy).toHaveBeenCalledTimes(1);

            // Setting identical values must skip uniform update
            setUniformSpy.mockClear();
            material.setColor(TEST_COLOR_R, TEST_COLOR_G, TEST_COLOR_B, TEST_COLOR_A);
            expect(setUniformSpy).not.toHaveBeenCalled();

            // Mutating a single component should trigger setUniform
            material.setColor(TEST_COLOR_R, TEST_COLOR_G, TEST_COLOR_B, SECONDARY_COLOR_A);
            expect(setUniformSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe(".getGlowColor() and .setGlowColor()", () => {
        it("should return a new RgbaLike object with accurate values when out parameter is omitted", () => {
            const material = new PolylineMaterial();
            const glow = material.getGlowColor();

            expect(glow.r).toBeCloseTo(DEFAULT_POLYLINE_GLOW_R);
            expect(glow.g).toBeCloseTo(DEFAULT_POLYLINE_GLOW_G);
            expect(glow.b).toBeCloseTo(DEFAULT_POLYLINE_GLOW_B);
            expect(glow.a).toBeCloseTo(DEFAULT_POLYLINE_GLOW_A);
        });

        it("should populate and return the provided out parameter for zero-allocation access", () => {
            const material = new PolylineMaterial();
            const out: RgbaLike = { r: 0, g: 0, b: 0, a: 0 };
            const returned = material.getGlowColor(out);

            expect(returned).toBe(out);
            expect(out.r).toBeCloseTo(DEFAULT_POLYLINE_GLOW_R);
            expect(out.g).toBeCloseTo(DEFAULT_POLYLINE_GLOW_G);
            expect(out.b).toBeCloseTo(DEFAULT_POLYLINE_GLOW_B);
            expect(out.a).toBeCloseTo(DEFAULT_POLYLINE_GLOW_A);
        });

        it("should set glowColor using RgbaLike object and return this (fluent chaining)", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            const returned = material.setGlowColor({
                r: TEST_GLOW_R,
                g: TEST_GLOW_G,
                b: TEST_GLOW_B,
                a: TEST_GLOW_A,
            });

            expect(returned).toBe(material);
            expect(setUniformSpy).toHaveBeenCalledWith("u_glowColor", expect.any(Float32Array));

            const glow = material.getGlowColor();
            expect(glow.r).toBeCloseTo(TEST_GLOW_R);
            expect(glow.g).toBeCloseTo(TEST_GLOW_G);
            expect(glow.b).toBeCloseTo(TEST_GLOW_B);
            expect(glow.a).toBeCloseTo(TEST_GLOW_A);
        });

        it("should set glowColor using separate RGBA components and return this (fluent chaining)", () => {
            const material = new PolylineMaterial();
            const returned = material.setGlowColor(TEST_GLOW_R, TEST_GLOW_G, TEST_GLOW_B, TEST_GLOW_A);

            expect(returned).toBe(material);
            const glow = material.getGlowColor();
            expect(glow.r).toBeCloseTo(TEST_GLOW_R);
            expect(glow.g).toBeCloseTo(TEST_GLOW_G);
            expect(glow.b).toBeCloseTo(TEST_GLOW_B);
            expect(glow.a).toBeCloseTo(TEST_GLOW_A);
        });

        it("should default alpha to 1.0 when omitted in numeric component overload", () => {
            const material = new PolylineMaterial();
            material.setGlowColor(0.25, 0.5, 0.75);

            const glow = material.getGlowColor();
            expect(glow.r).toBeCloseTo(0.25);
            expect(glow.g).toBeCloseTo(0.5);
            expect(glow.b).toBeCloseTo(0.75);
            expect(glow.a).toBeCloseTo(1.0);
        });

        it("should default alpha to 1.0 when omitted in RgbaLike object overload", () => {
            const material = new PolylineMaterial();
            material.setGlowColor({ r: 0.25, g: 0.5, b: 0.75 } as RgbaLike);

            expect(material.getGlowColor().a).toBeCloseTo(1.0);
        });

        it("should dirty-check and avoid uniform update when setting identical glowColor", () => {
            const material = new PolylineMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            // First mutate to known values
            material.setGlowColor(TEST_GLOW_R, TEST_GLOW_G, TEST_GLOW_B, TEST_GLOW_A);
            expect(setUniformSpy).toHaveBeenCalledTimes(1);

            // Setting identical values must skip uniform update
            setUniformSpy.mockClear();
            material.setGlowColor(TEST_GLOW_R, TEST_GLOW_G, TEST_GLOW_B, TEST_GLOW_A);
            expect(setUniformSpy).not.toHaveBeenCalled();

            // Mutating a single component should trigger setUniform
            material.setGlowColor(TEST_GLOW_R, TEST_GLOW_G, TEST_GLOW_B, SECONDARY_COLOR_A);
            expect(setUniformSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("uniform registration", () => {
        it("should register all required shader uniforms with expected types", () => {
            const material = new PolylineMaterial();
            const uniforms = material.getUniforms();

            expect(uniforms["u_color"]).toBeInstanceOf(Float32Array);
            expect((uniforms["u_color"] as Float32Array).length).toBe(4);
            expect(uniforms["u_glowColor"]).toBeInstanceOf(Float32Array);
            expect((uniforms["u_glowColor"] as Float32Array).length).toBe(4);
            expect(typeof uniforms["u_lineWidth"]).toBe("number");
            expect(typeof uniforms["u_miterLimit"]).toBe("number");
            expect(typeof uniforms["u_glowIntensity"]).toBe("number");
            expect(typeof uniforms["u_dashSpeed"]).toBe("number");
            expect(typeof uniforms["u_dashFrequency"]).toBe("number");
        });
    });
});
