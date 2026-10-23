import { describe, it, expect, vi } from "vitest";
import { SpriteMaterial } from "./sprite_material";
import { BlendMode } from "../materials/material_types";
import type { RgbaLike } from "../../helpers/colors_types";
import {
    DEFAULT_TINT_R,
    DEFAULT_TINT_G,
    DEFAULT_TINT_B,
    DEFAULT_TINT_A,
} from "./sprite_constants";

const TEST_COLOR_R = 0.5;
const TEST_COLOR_G = 0.25;
const TEST_COLOR_B = 0.75;
const TEST_COLOR_A = 0.5;

const SECONDARY_COLOR_R = 0.125;
const SECONDARY_COLOR_G = 0.375;
const SECONDARY_COLOR_B = 0.625;
const SECONDARY_COLOR_A = 0.875;

describe("SpriteMaterial", () => {
    describe("constructor and default initialization", () => {
        it("should initialize with specified shaderKey", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            expect(material.shaderKey).toBe("sprite_sdf_pin");
        });

        it("should configure default 2D billboard pipeline state (Alpha blend, two-sided cullFace false, depthTest true, depthWrite false)", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });

            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Alpha,
                cullFace: false,
                depthTest: true,
                depthWrite: false,
            });
        });

        it("should initialize default white tint [1, 1, 1, 1] uniform u_tintColor", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            const tint = material.getTint();

            expect(tint.r).toBeCloseTo(DEFAULT_TINT_R);
            expect(tint.g).toBeCloseTo(DEFAULT_TINT_G);
            expect(tint.b).toBeCloseTo(DEFAULT_TINT_B);
            expect(tint.a).toBeCloseTo(DEFAULT_TINT_A);

            const uniforms = material.getUniforms();
            expect(uniforms["u_tintColor"]).toBeInstanceOf(Float32Array);
            const uniformArray = uniforms["u_tintColor"] as Float32Array;
            expect(uniformArray[0]).toBeCloseTo(DEFAULT_TINT_R);
            expect(uniformArray[1]).toBeCloseTo(DEFAULT_TINT_G);
            expect(uniformArray[2]).toBeCloseTo(DEFAULT_TINT_B);
            expect(uniformArray[3]).toBeCloseTo(DEFAULT_TINT_A);
        });

        it("should initialize alwaysOnTop to false by default", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            expect(material.alwaysOnTop).toBe(false);
            expect(material.pipelineState.depthTest).toBe(true);
        });

        it("should initialize with custom tint from options", () => {
            const customTint: RgbaLike = {
                r: TEST_COLOR_R,
                g: TEST_COLOR_G,
                b: TEST_COLOR_B,
                a: TEST_COLOR_A,
            };
            const material = new SpriteMaterial({
                shaderKey: "sprite_sdf_pin",
                tint: customTint,
            });

            const tint = material.getTint();
            expect(tint.r).toBeCloseTo(TEST_COLOR_R);
            expect(tint.g).toBeCloseTo(TEST_COLOR_G);
            expect(tint.b).toBeCloseTo(TEST_COLOR_B);
            expect(tint.a).toBeCloseTo(TEST_COLOR_A);
        });

        it("should default alpha to 1.0 when tint option omits alpha", () => {
            const customTint = {
                r: TEST_COLOR_R,
                g: TEST_COLOR_G,
                b: TEST_COLOR_B,
            };
            const material = new SpriteMaterial({
                shaderKey: "sprite_sdf_pin",
                tint: customTint as RgbaLike,
            });

            const tint = material.getTint();
            expect(tint.a).toBeCloseTo(DEFAULT_TINT_A);
        });

        it("should disable depthTest when alwaysOnTop option is true in constructor", () => {
            const material = new SpriteMaterial({
                shaderKey: "sprite_sdf_pin",
                alwaysOnTop: true,
            });

            expect(material.alwaysOnTop).toBe(true);
            expect(material.pipelineState.depthTest).toBe(false);
            expect(material.pipelineState.depthWrite).toBe(false);
        });

        it("should respect explicit pipelineState overrides from options", () => {
            const material = new SpriteMaterial({
                shaderKey: "sprite_sdf_pin",
                pipelineState: {
                    blendMode: BlendMode.Additive,
                    cullFace: true,
                },
            });

            expect(material.pipelineState.blendMode).toBe(BlendMode.Additive);
            expect(material.pipelineState.cullFace).toBe(true);
            expect(material.pipelineState.depthTest).toBe(true);
            expect(material.pipelineState.depthWrite).toBe(false);
        });
    });

    describe("alwaysOnTop property", () => {
        it("should toggle depthTest off when enabled and on when disabled", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            expect(material.alwaysOnTop).toBe(false);
            expect(material.pipelineState.depthTest).toBe(true);

            material.alwaysOnTop = true;
            expect(material.alwaysOnTop).toBe(true);
            expect(material.pipelineState.depthTest).toBe(false);
            expect(material.pipelineState.depthWrite).toBe(false);

            material.alwaysOnTop = false;
            expect(material.alwaysOnTop).toBe(false);
            expect(material.pipelineState.depthTest).toBe(true);
            expect(material.pipelineState.depthWrite).toBe(false);
        });

        it("should not mutate pipelineState when assigned an identical boolean value", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            const depthTestOriginal = material.pipelineState.depthTest;

            material.alwaysOnTop = false;
            expect(material.pipelineState.depthTest).toBe(depthTestOriginal);
        });
    });

    describe("getTint()", () => {
        it("should return a new RgbaLike object containing current tint values", () => {
            const material = new SpriteMaterial({
                shaderKey: "sprite_sdf_pin",
                tint: { r: TEST_COLOR_R, g: TEST_COLOR_G, b: TEST_COLOR_B, a: TEST_COLOR_A },
            });

            const res = material.getTint();
            expect(res).toEqual({
                r: TEST_COLOR_R,
                g: TEST_COLOR_G,
                b: TEST_COLOR_B,
                a: TEST_COLOR_A,
            });
        });

        it("should return a safe copy that does not mutate internal storage when modified", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            const copy = material.getTint();

            copy.r = 0.123;
            copy.g = 0.456;

            const secondCopy = material.getTint();
            expect(secondCopy.r).toBeCloseTo(DEFAULT_TINT_R);
            expect(secondCopy.g).toBeCloseTo(DEFAULT_TINT_G);
        });

        it("should populate and return the target-out object when provided (zero-allocation contract)", () => {
            const material = new SpriteMaterial({
                shaderKey: "sprite_sdf_pin",
                tint: { r: TEST_COLOR_R, g: TEST_COLOR_G, b: TEST_COLOR_B, a: TEST_COLOR_A },
            });

            const targetOut: RgbaLike = { r: 0, g: 0, b: 0, a: 0 };
            const result = material.getTint(targetOut);

            expect(result).toBe(targetOut);
            expect(targetOut.r).toBeCloseTo(TEST_COLOR_R);
            expect(targetOut.g).toBeCloseTo(TEST_COLOR_G);
            expect(targetOut.b).toBeCloseTo(TEST_COLOR_B);
            expect(targetOut.a).toBeCloseTo(TEST_COLOR_A);
        });
    });

    describe("setTint()", () => {
        it("should accept an RgbaLike semantic object and return this for fluent chaining", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            const returned = material.setTint({
                r: TEST_COLOR_R,
                g: TEST_COLOR_G,
                b: TEST_COLOR_B,
                a: TEST_COLOR_A,
            });

            expect(returned).toBe(material);

            const tint = material.getTint();
            expect(tint.r).toBeCloseTo(TEST_COLOR_R);
            expect(tint.g).toBeCloseTo(TEST_COLOR_G);
            expect(tint.b).toBeCloseTo(TEST_COLOR_B);
            expect(tint.a).toBeCloseTo(TEST_COLOR_A);
        });

        it("should default alpha to 1.0 when RgbaLike object omits alpha", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            material.setTint({
                r: TEST_COLOR_R,
                g: TEST_COLOR_G,
                b: TEST_COLOR_B,
            } as RgbaLike);

            const tint = material.getTint();
            expect(tint.a).toBeCloseTo(DEFAULT_TINT_A);
        });

        it("should accept scalar components (r, g, b, a) and return this", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            const returned = material.setTint(
                TEST_COLOR_R,
                TEST_COLOR_G,
                TEST_COLOR_B,
                TEST_COLOR_A
            );

            expect(returned).toBe(material);

            const tint = material.getTint();
            expect(tint.r).toBeCloseTo(TEST_COLOR_R);
            expect(tint.g).toBeCloseTo(TEST_COLOR_G);
            expect(tint.b).toBeCloseTo(TEST_COLOR_B);
            expect(tint.a).toBeCloseTo(TEST_COLOR_A);
        });

        it("should default alpha to 1.0 when scalar arguments omit alpha", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            material.setTint(TEST_COLOR_R, TEST_COLOR_G, TEST_COLOR_B);

            const tint = material.getTint();
            expect(tint.a).toBeCloseTo(DEFAULT_TINT_A);
        });

        it("should detect changes and update the u_tintColor uniform only when values differ", () => {
            const material = new SpriteMaterial({ shaderKey: "sprite_sdf_pin" });
            const setUniformSpy = vi.spyOn(material, "setUniform");

            // Changing values should call setUniform
            material.setTint(TEST_COLOR_R, TEST_COLOR_G, TEST_COLOR_B, TEST_COLOR_A);
            expect(setUniformSpy).toHaveBeenCalledTimes(1);
            expect(setUniformSpy).toHaveBeenCalledWith("u_tintColor", expect.any(Float32Array));

            // Setting identical values should be dirty-checked and skip redundant uniform set
            setUniformSpy.mockClear();
            material.setTint(TEST_COLOR_R, TEST_COLOR_G, TEST_COLOR_B, TEST_COLOR_A);
            expect(setUniformSpy).not.toHaveBeenCalled();

            // Mutating a single component should trigger setUniform
            material.setTint(TEST_COLOR_R, TEST_COLOR_G, TEST_COLOR_B, SECONDARY_COLOR_A);
            expect(setUniformSpy).toHaveBeenCalledTimes(1);
        });
    });
});
