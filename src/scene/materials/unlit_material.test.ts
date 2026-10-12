import { describe, it, expect, vi } from "vitest";
import { UnlitMaterial } from "./unlit_material";
import { BlendMode } from "./material_types";
import type { ITexture } from "../../webgl/textures/texture_types";
import { TextureUnit } from "../../webgl/textures/texture_types";
import { createMockTexture } from "../../testing/mocks/mock_texture";

describe("UnlitMaterial", () => {
    describe("constructor and default initialization", () => {
        it("initializes with default shaderKey 'unlit'", () => {
            const material = new UnlitMaterial();
            expect(material.shaderKey).toBe("unlit");
        });

        it("initializes default u_color to [1.0, 1.0, 1.0, 1.0]", () => {
            const material = new UnlitMaterial();
            expect(material.getUniforms()["u_color"]).toEqual([1.0, 1.0, 1.0, 1.0]);
        });

        it("initializes default pipelineState (blendMode: BlendMode.Opaque, depthTest: true, depthWrite: true, cullFace: true)", () => {
            const material = new UnlitMaterial();
            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Opaque,
                depthTest: true,
                depthWrite: true,
                cullFace: true,
            });
        });

        it("texture getter returns null by default", () => {
            const material = new UnlitMaterial();
            expect(material.texture).toBeNull();
        });
    });

    describe("constructor parameter resolution and options", () => {
        it("accepts 3-component color [r, g, b] and expands to [r, g, b, 1.0]", () => {
            const material = new UnlitMaterial({ color: [0.2, 0.4, 0.6] });
            expect(material.getUniforms()["u_color"]).toEqual([0.2, 0.4, 0.6, 1.0]);
        });

        it("accepts 4-component color [r, g, b, a] and preserves alpha", () => {
            const material = new UnlitMaterial({ color: [0.1, 0.3, 0.5, 0.7] });
            expect(material.getUniforms()["u_color"]).toEqual([0.1, 0.3, 0.5, 0.7]);
        });

        describe("when texture provided in options.texture", () => {
            it("assigns texture to TextureUnit.Color (0)", () => {
                const tex = createMockTexture("color-tex");
                const material = new UnlitMaterial({ texture: tex });
                expect(material.texture).toBe(tex);
                expect(material.getTexture(TextureUnit.Color)).toBe(tex);
            });
        });

        it("supports explicit shaderKey override", () => {
            const material = new UnlitMaterial({ shaderKey: "unlit" });
            expect(material.shaderKey).toBe("unlit");
        });

        it("supports custom pipelineState overrides (e.g. blendMode: BlendMode.Alpha, depthWrite: false)", () => {
            const material = new UnlitMaterial({
                pipelineState: {
                    blendMode: BlendMode.Alpha,
                    depthWrite: false,
                },
            });
            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Alpha,
                depthTest: true,
                depthWrite: false,
                cullFace: true,
            });
        });

        it("supports custom additional uniforms in options.uniforms", () => {
            const material = new UnlitMaterial({
                uniforms: {
                    u_customAlpha: 0.85,
                    u_timeOffset: 12.0,
                },
            });
            const uniforms = material.getUniforms();
            expect(uniforms["u_customAlpha"]).toBe(0.85);
            expect(uniforms["u_timeOffset"]).toBe(12.0);
        });

        it("supports custom additional textures in options.textures", () => {
            const normalTex = createMockTexture("normal-tex");
            const material = new UnlitMaterial({
                textures: {
                    [TextureUnit.Normal]: normalTex,
                },
            });
            expect(material.getTexture(TextureUnit.Normal)).toBe(normalTex);
        });
    });

    describe("texture property getter and setTexture", () => {
        describe("single-argument setTexture(texture)", () => {
            it("assigns texture to TextureUnit.Color (0)", () => {
                const material = new UnlitMaterial();
                const tex = createMockTexture("albedo");
                material.setTexture(tex);
                expect(material.texture).toBe(tex);
                expect(material.getTexture(TextureUnit.Color)).toBe(tex);
            });

            it("clears texture when passed null", () => {
                const tex = createMockTexture("albedo");
                const material = new UnlitMaterial({ texture: tex });
                expect(material.texture).toBe(tex);

                material.setTexture(null);
                expect(material.texture).toBeNull();
            });

            it("returns this for method chaining", () => {
                const material = new UnlitMaterial();
                const tex = createMockTexture("albedo");
                const result = material.setTexture(tex);
                expect(result).toBe(material);
            });
        });

        describe("two-argument setTexture(unit, texture)", () => {
            describe("when unit is TextureUnit.Color (0)", () => {
                it("assigns texture when texture provided", () => {
                    const material = new UnlitMaterial();
                    const tex = createMockTexture("diffuse");
                    material.setTexture(TextureUnit.Color, tex);
                    expect(material.texture).toBe(tex);
                });

                it("clears texture when texture is null", () => {
                    const tex = createMockTexture("diffuse");
                    const material = new UnlitMaterial({ texture: tex });
                    material.setTexture(TextureUnit.Color, null);
                    expect(material.texture).toBeNull();
                });
            });

            describe("when unit is another unit (e.g. TextureUnit.Normal or 1)", () => {
                it("assigns texture to specified unit", () => {
                    const material = new UnlitMaterial();
                    const normalTex = createMockTexture("normal");
                    material.setTexture(TextureUnit.Normal, normalTex);
                    expect(material.getTexture(TextureUnit.Normal)).toBe(normalTex);
                });
            });

            it("returns this for method chaining", () => {
                const material = new UnlitMaterial();
                const normalTex = createMockTexture("normal");
                const result = material.setTexture(TextureUnit.Normal, normalTex);
                expect(result).toBe(material);
            });
        });

        describe("texture getter", () => {
            it("returns assigned texture at TextureUnit.Color", () => {
                const material = new UnlitMaterial();
                const tex = createMockTexture("tex");
                material.setTexture(tex);
                expect(material.texture).toBe(tex);
            });

            it("returns null when texture cleared", () => {
                const tex = createMockTexture("tex");
                const material = new UnlitMaterial({ texture: tex });
                material.setTexture(null);
                expect(material.texture).toBeNull();
            });
        });
    });

    describe("setColor", () => {
        it("updates u_color with 3-component [r, g, b] expanded to [r, g, b, 1.0]", () => {
            const material = new UnlitMaterial();
            material.setColor([0.5, 0.25, 0.125]);
            expect(material.getUniforms()["u_color"]).toEqual([0.5, 0.25, 0.125, 1.0]);
        });

        it("updates u_color with 4-component [r, g, b, a]", () => {
            const material = new UnlitMaterial();
            material.setColor([0.9, 0.8, 0.7, 0.6]);
            expect(material.getUniforms()["u_color"]).toEqual([0.9, 0.8, 0.7, 0.6]);
        });

        it("returns this for method chaining", () => {
            const material = new UnlitMaterial();
            const result = material.setColor([1.0, 0.0, 0.0]);
            expect(result).toBe(material);
        });
    });

    describe("clone", () => {
        it("produces an UnlitMaterial instance (instanceof UnlitMaterial)", () => {
            const material = new UnlitMaterial();
            const clone = material.clone();
            expect(clone).toBeInstanceOf(UnlitMaterial);
            expect(clone).not.toBe(material);
        });

        it("preserves shaderKey, pipelineState, uniforms, and texture bindings", () => {
            const tex = createMockTexture("color");
            const material = new UnlitMaterial({
                shaderKey: "unlit",
                pipelineState: { blendMode: BlendMode.Alpha, depthWrite: false },
                color: [0.5, 0.5, 0.5, 0.5],
                texture: tex,
                uniforms: { u_custom: 42 },
            });

            const clone = material.clone();
            expect(clone.shaderKey).toBe("unlit");
            expect(clone.pipelineState).toEqual({
                blendMode: BlendMode.Alpha,
                depthTest: true,
                depthWrite: false,
                cullFace: true,
            });
            expect(clone.getUniforms()["u_color"]).toEqual([0.5, 0.5, 0.5, 0.5]);
            expect(clone.getUniforms()["u_custom"]).toBe(42);
            expect(clone.texture).toBe(tex);
            expect(clone.getTexture(TextureUnit.Color)).toBe(tex);
        });

        it("deep-copies pipelineState (mutating clone pipelineState does not affect original)", () => {
            const material = new UnlitMaterial();
            const clone = material.clone();
            clone.pipelineState.blendMode = BlendMode.Additive;
            clone.pipelineState.depthWrite = false;

            expect(material.pipelineState.blendMode).toBe(BlendMode.Opaque);
            expect(material.pipelineState.depthWrite).toBe(true);
            expect(clone.pipelineState.blendMode).toBe(BlendMode.Additive);
            expect(clone.pipelineState.depthWrite).toBe(false);
        });

        it("deep-copies uniforms (mutating clone uniforms does not affect original)", () => {
            const material = new UnlitMaterial({ color: [1.0, 1.0, 1.0, 1.0] });
            const clone = material.clone();
            clone.setColor([0.0, 0.0, 0.0, 1.0]);
            clone.setUniform("u_extra", "clone_only");

            expect(material.getUniforms()["u_color"]).toEqual([1.0, 1.0, 1.0, 1.0]);
            expect(material.getUniforms()["u_extra"]).toBeUndefined();
        });

        it("shares non-owning texture reference and survives texture disposal", () => {
            const tex = createMockTexture("shared-tex");
            const material = new UnlitMaterial({ texture: tex });
            const clone = material.clone();

            expect(clone.texture).toBe(tex);
            expect(clone.texture).toBe(material.texture);

            expect(() => tex.dispose()).not.toThrow();
            expect(clone.texture).toBe(tex);
            expect(material.texture).toBe(tex);
        });
    });
});
