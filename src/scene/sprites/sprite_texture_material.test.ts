import { describe, it, expect, vi } from "vitest";
import { SpriteTextureMaterial } from "./sprite_texture_material";
import { BlendMode } from "../materials/material_types";
import { TextureUnit } from "../../webgl/textures/texture_types";
import { createMockTexture } from "../../testing/mocks/mock_texture";
import { DEFAULT_ALPHA_CUTOFF } from "./sprite_constants";

const CUSTOM_ALPHA_CUTOFF = 0.5;
const SECONDARY_ALPHA_CUTOFF = 0.25;

describe("SpriteTextureMaterial", () => {
    describe("constructor and default initialization", () => {
        it("should initialize with shaderKey 'sprite_texture'", () => {
            const material = new SpriteTextureMaterial();
            expect(material.shaderKey).toBe("sprite_texture");
        });

        it("should configure default pipeline state with Alpha blend, two-sided rendering, and depthTest true", () => {
            const material = new SpriteTextureMaterial();

            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Alpha,
                cullFace: false,
                depthTest: true,
                depthWrite: false,
            });
            expect(material.alwaysOnTop).toBe(false);
        });

        it("should initialize texture as null by default", () => {
            const material = new SpriteTextureMaterial();

            expect(material.texture).toBeNull();
            expect(material.getTexture(TextureUnit.Color)).toBeNull();
        });

        it("should initialize default alphaCutoff to DEFAULT_ALPHA_CUTOFF (0.01)", () => {
            const material = new SpriteTextureMaterial();

            expect(material.alphaCutoff).toBeCloseTo(DEFAULT_ALPHA_CUTOFF);
            const uniforms = material.getUniforms();
            expect(uniforms["u_alphaCutoff"]).toBeCloseTo(DEFAULT_ALPHA_CUTOFF);
        });

        it("should accept texture and alphaCutoff options in constructor", () => {
            const mockTex = createMockTexture("waypoint-icon");
            const material = new SpriteTextureMaterial({
                texture: mockTex,
                alphaCutoff: CUSTOM_ALPHA_CUTOFF,
                tint: { r: 1.0, g: 0.5, b: 0.25, a: 1.0 },
                alwaysOnTop: true,
            });

            expect(material.texture).toBe(mockTex);
            expect(material.getTexture(TextureUnit.Color)).toBe(mockTex);
            expect(material.alphaCutoff).toBeCloseTo(CUSTOM_ALPHA_CUTOFF);
            expect(material.alwaysOnTop).toBe(true);
            expect(material.pipelineState.depthTest).toBe(false);

            const uniforms = material.getUniforms();
            expect(uniforms["u_alphaCutoff"]).toBeCloseTo(CUSTOM_ALPHA_CUTOFF);
        });
    });

    describe("texture property", () => {
        it("should bind assigned texture to TextureUnit.Color", () => {
            const material = new SpriteTextureMaterial();
            const mockTex = createMockTexture("flare-sprite");

            material.texture = mockTex;
            expect(material.texture).toBe(mockTex);
            expect(material.getTexture(TextureUnit.Color)).toBe(mockTex);
        });

        it("should support detaching texture by setting null", () => {
            const mockTex = createMockTexture("reticle-icon");
            const material = new SpriteTextureMaterial({ texture: mockTex });

            expect(material.texture).toBe(mockTex);
            material.texture = null;

            expect(material.texture).toBeNull();
            expect(material.getTexture(TextureUnit.Color)).toBeNull();
        });
    });

    describe("alphaCutoff property", () => {
        it("should retrieve alpha cutoff threshold", () => {
            const material = new SpriteTextureMaterial({ alphaCutoff: CUSTOM_ALPHA_CUTOFF });
            expect(material.alphaCutoff).toBeCloseTo(CUSTOM_ALPHA_CUTOFF);
        });

        it("should update uniform u_alphaCutoff when set with changed value", () => {
            const material = new SpriteTextureMaterial();
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.alphaCutoff = SECONDARY_ALPHA_CUTOFF;
            expect(material.alphaCutoff).toBeCloseTo(SECONDARY_ALPHA_CUTOFF);
            expect(setUniformSpy).toHaveBeenCalledWith("u_alphaCutoff", SECONDARY_ALPHA_CUTOFF);
        });

        it("should skip uniform update when setting identical alphaCutoff value", () => {
            const material = new SpriteTextureMaterial({ alphaCutoff: CUSTOM_ALPHA_CUTOFF });
            const setUniformSpy = vi.spyOn(material, "setUniform");

            material.alphaCutoff = CUSTOM_ALPHA_CUTOFF;
            expect(setUniformSpy).not.toHaveBeenCalled();
        });
    });

    describe("inherited SpriteMaterial capabilities", () => {
        it("should manipulate tint and alwaysOnTop seamlessly", () => {
            const material = new SpriteTextureMaterial();

            material.setTint(0.5, 0.25, 0.75, 1.0);
            expect(material.getTint().r).toBeCloseTo(0.5);
            expect(material.getTint().g).toBeCloseTo(0.25);

            material.alwaysOnTop = true;
            expect(material.alwaysOnTop).toBe(true);
            expect(material.pipelineState.depthTest).toBe(false);
        });
    });
});
