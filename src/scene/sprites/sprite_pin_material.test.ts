import { describe, it, expect, vi } from "vitest";
import { SpritePinMaterial } from "./sprite_pin_material";
import { BlendMode } from "../materials/material_types";
import type { RgbaLike } from "../../helpers/colors_types";
import {
    DEFAULT_PIN_INNER_R,
    DEFAULT_PIN_INNER_G,
    DEFAULT_PIN_INNER_B,
    DEFAULT_PIN_INNER_A,
    DEFAULT_PIN_INNER_RADIUS,
    DEFAULT_PIN_HALO_WIDTH,
    DEFAULT_TINT_R,
    DEFAULT_TINT_G,
    DEFAULT_TINT_B,
    DEFAULT_TINT_A,
} from "./sprite_constants";

const PIN_CORE_R = 0.5;
const PIN_CORE_G = 0.25;
const PIN_CORE_B = 0.75;
const PIN_CORE_A = 0.5;

const SECONDARY_CORE_R = 0.125;
const SECONDARY_CORE_G = 0.375;
const SECONDARY_CORE_B = 0.625;
const SECONDARY_CORE_A = 0.875;

const CUSTOM_RADIUS = 0.25;
const SECONDARY_RADIUS = 0.35;
const CUSTOM_HALO = 0.125;
const SECONDARY_HALO = 0.25;

describe("SpritePinMaterial", () => {
    describe("constructor and default initialization", () => {
        it("should initialize with shaderKey 'sprite_sdf_pin'", () => {
            const material = new SpritePinMaterial();
            expect(material.shaderKey).toBe("sprite_sdf_pin");
        });

        it("should initialize default pipelineState with Alpha blend and depth test enabled", () => {
            const material = new SpritePinMaterial();

            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Alpha,
                cullFace: false,
                depthTest: true,
                depthWrite: false,
            });
            expect(material.alwaysOnTop).toBe(false);
        });

        it("should initialize default innerColor to [1, 1, 1, 1]", () => {
            const material = new SpritePinMaterial();
            const color = material.getInnerColor();

            expect(color.r).toBeCloseTo(DEFAULT_PIN_INNER_R);
            expect(color.g).toBeCloseTo(DEFAULT_PIN_INNER_G);
            expect(color.b).toBeCloseTo(DEFAULT_PIN_INNER_B);
            expect(color.a).toBeCloseTo(DEFAULT_PIN_INNER_A);

            const uniforms = material.getUniforms();
            expect(uniforms["u_innerDotColor"]).toBeInstanceOf(Float32Array);
            const array = uniforms["u_innerDotColor"] as Float32Array;
            expect(array[0]).toBeCloseTo(DEFAULT_PIN_INNER_R);
            expect(array[1]).toBeCloseTo(DEFAULT_PIN_INNER_G);
            expect(array[2]).toBeCloseTo(DEFAULT_PIN_INNER_B);
            expect(array[3]).toBeCloseTo(DEFAULT_PIN_INNER_A);
        });

        it("should initialize default innerRadius and haloWidth", () => {
            const material = new SpritePinMaterial();

            expect(material.innerRadius).toBeCloseTo(DEFAULT_PIN_INNER_RADIUS);
            expect(material.haloWidth).toBeCloseTo(DEFAULT_PIN_HALO_WIDTH);

            const uniforms = material.getUniforms();
            expect(uniforms["u_innerRadius"]).toBeCloseTo(DEFAULT_PIN_INNER_RADIUS);
            expect(uniforms["u_haloWidth"]).toBeCloseTo(DEFAULT_PIN_HALO_WIDTH);
        });

        it("should accept custom options in constructor (innerColor, innerRadius, haloWidth, tint, alwaysOnTop)", () => {
            const material = new SpritePinMaterial({
                innerColor: { r: PIN_CORE_R, g: PIN_CORE_G, b: PIN_CORE_B, a: PIN_CORE_A },
                innerRadius: CUSTOM_RADIUS,
                haloWidth: CUSTOM_HALO,
                tint: { r: 1.0, g: 0.0, b: 0.0, a: 1.0 },
                alwaysOnTop: true,
            });

            expect(material.getInnerColor()).toEqual({
                r: PIN_CORE_R,
                g: PIN_CORE_G,
                b: PIN_CORE_B,
                a: PIN_CORE_A,
            });
            expect(material.innerRadius).toBeCloseTo(CUSTOM_RADIUS);
            expect(material.haloWidth).toBeCloseTo(CUSTOM_HALO);
            expect(material.alwaysOnTop).toBe(true);
            expect(material.pipelineState.depthTest).toBe(false);

            const uniforms = material.getUniforms();
            expect(uniforms["u_innerRadius"]).toBeCloseTo(CUSTOM_RADIUS);
            expect(uniforms["u_haloWidth"]).toBeCloseTo(CUSTOM_HALO);
        });

        it("should default innerColor alpha to 1.0 when innerColor option omits alpha", () => {
            const material = new SpritePinMaterial({
                innerColor: { r: PIN_CORE_R, g: PIN_CORE_G, b: PIN_CORE_B } as RgbaLike,
            });

            const color = material.getInnerColor();
            expect(color.a).toBeCloseTo(DEFAULT_PIN_INNER_A);
        });
    });

    describe("getInnerColor()", () => {
        it("should return a new RgbaLike object with current inner dot color", () => {
            const material = new SpritePinMaterial({
                innerColor: { r: PIN_CORE_R, g: PIN_CORE_G, b: PIN_CORE_B, a: PIN_CORE_A },
            });

            const color = material.getInnerColor();
            expect(color).toEqual({
                r: PIN_CORE_R,
                g: PIN_CORE_G,
                b: PIN_CORE_B,
                a: PIN_CORE_A,
            });
        });

        it("should return a safe copy preventing external mutation of internal storage", () => {
            const material = new SpritePinMaterial();
            const copy = material.getInnerColor();

            copy.r = 0.125;
            copy.g = 0.25;

            const secondCopy = material.getInnerColor();
            expect(secondCopy.r).toBeCloseTo(DEFAULT_PIN_INNER_R);
            expect(secondCopy.g).toBeCloseTo(DEFAULT_PIN_INNER_G);
        });

        it("should write into target-out object and return it (zero-allocation contract)", () => {
            const material = new SpritePinMaterial({
                innerColor: { r: PIN_CORE_R, g: PIN_CORE_G, b: PIN_CORE_B, a: PIN_CORE_A },
            });

            const out: RgbaLike = { r: 0, g: 0, b: 0, a: 0 };
            const returned = material.getInnerColor(out);

            expect(returned).toBe(out);
            expect(out.r).toBeCloseTo(PIN_CORE_R);
            expect(out.g).toBeCloseTo(PIN_CORE_G);
            expect(out.b).toBeCloseTo(PIN_CORE_B);
            expect(out.a).toBeCloseTo(PIN_CORE_A);
        });
    });

    describe("setInnerColor()", () => {
        it("should accept an RgbaLike semantic object and return this for fluent chaining", () => {
            const material = new SpritePinMaterial();
            const returned = material.setInnerColor({
                r: PIN_CORE_R,
                g: PIN_CORE_G,
                b: PIN_CORE_B,
                a: PIN_CORE_A,
            });

            expect(returned).toBe(material);

            const color = material.getInnerColor();
            expect(color.r).toBeCloseTo(PIN_CORE_R);
            expect(color.g).toBeCloseTo(PIN_CORE_G);
            expect(color.b).toBeCloseTo(PIN_CORE_B);
            expect(color.a).toBeCloseTo(PIN_CORE_A);
        });

        it("should default alpha to 1.0 when RgbaLike object omits alpha", () => {
            const material = new SpritePinMaterial();
            material.setInnerColor({
                r: PIN_CORE_R,
                g: PIN_CORE_G,
                b: PIN_CORE_B,
            } as RgbaLike);

            const color = material.getInnerColor();
            expect(color.a).toBeCloseTo(DEFAULT_PIN_INNER_A);
        });

        it("should accept scalar components (r, g, b, a) and return this", () => {
            const material = new SpritePinMaterial();
            const returned = material.setInnerColor(
                PIN_CORE_R,
                PIN_CORE_G,
                PIN_CORE_B,
                PIN_CORE_A
            );

            expect(returned).toBe(material);

            const color = material.getInnerColor();
            expect(color.r).toBeCloseTo(PIN_CORE_R);
            expect(color.g).toBeCloseTo(PIN_CORE_G);
            expect(color.b).toBeCloseTo(PIN_CORE_B);
            expect(color.a).toBeCloseTo(PIN_CORE_A);
        });

        it("should default alpha to 1.0 when scalar arguments omit alpha", () => {
            const material = new SpritePinMaterial();
            material.setInnerColor(PIN_CORE_R, PIN_CORE_G, PIN_CORE_B);

            const color = material.getInnerColor();
            expect(color.a).toBeCloseTo(DEFAULT_PIN_INNER_A);
        });

        it("should detect changes and update the u_innerDotColor uniform only when values differ", () => {
            const material = new SpritePinMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.setInnerColor(PIN_CORE_R, PIN_CORE_G, PIN_CORE_B, PIN_CORE_A);
            expect(setUniformSpy).toHaveBeenCalledTimes(1);
            expect(setUniformSpy).toHaveBeenCalledWith("u_innerDotColor", expect.any(Float32Array));

            // Setting identical values should be dirty-checked and skip redundant uniform set
            setUniformSpy.mockClear();
            material.setInnerColor(PIN_CORE_R, PIN_CORE_G, PIN_CORE_B, PIN_CORE_A);
            expect(setUniformSpy).not.toHaveBeenCalled();

            // Mutating a single component should trigger setUniform
            material.setInnerColor(PIN_CORE_R, PIN_CORE_G, PIN_CORE_B, SECONDARY_CORE_A);
            expect(setUniformSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("innerRadius property", () => {
        it("should retrieve normalized inner core radius", () => {
            const material = new SpritePinMaterial({ innerRadius: CUSTOM_RADIUS });
            expect(material.innerRadius).toBeCloseTo(CUSTOM_RADIUS);
        });

        it("should update uniform u_innerRadius when set with changed value", () => {
            const material = new SpritePinMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.innerRadius = SECONDARY_RADIUS;
            expect(material.innerRadius).toBeCloseTo(SECONDARY_RADIUS);
            expect(setUniformSpy).toHaveBeenCalledWith("u_innerRadius", SECONDARY_RADIUS);
        });

        it("should skip uniform update when setting identical innerRadius value", () => {
            const material = new SpritePinMaterial({ innerRadius: CUSTOM_RADIUS });
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.innerRadius = CUSTOM_RADIUS;
            expect(setUniformSpy).not.toHaveBeenCalled();
        });
    });

    describe("haloWidth property", () => {
        it("should retrieve halo width", () => {
            const material = new SpritePinMaterial({ haloWidth: CUSTOM_HALO });
            expect(material.haloWidth).toBeCloseTo(CUSTOM_HALO);
        });

        it("should update uniform u_haloWidth when set with changed value", () => {
            const material = new SpritePinMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.haloWidth = SECONDARY_HALO;
            expect(material.haloWidth).toBeCloseTo(SECONDARY_HALO);
            expect(setUniformSpy).toHaveBeenCalledWith("u_haloWidth", SECONDARY_HALO);
        });

        it("should skip uniform update when setting identical haloWidth value", () => {
            const material = new SpritePinMaterial({ haloWidth: CUSTOM_HALO });
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.haloWidth = CUSTOM_HALO;
            expect(setUniformSpy).not.toHaveBeenCalled();
        });
    });

    describe("inherited SpriteMaterial capabilities", () => {
        it("should seamlessly support tint and alwaysOnTop manipulation", () => {
            const material = new SpritePinMaterial();

            material.setTint(1.0, 0.5, 0.25, 1.0);
            expect(material.getTint().r).toBeCloseTo(1.0);
            expect(material.getTint().g).toBeCloseTo(0.5);

            material.alwaysOnTop = true;
            expect(material.alwaysOnTop).toBe(true);
            expect(material.pipelineState.depthTest).toBe(false);
        });
    });
});
