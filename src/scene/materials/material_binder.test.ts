import { describe, it, expect, vi } from "vitest";
import { applyMaterial } from "./material_binder";
import { Material } from "./material";
import { UnlitMaterial } from "./unlit_material";
import { createMockContextManager, createMockShaderProgram } from "../../testing/mocks/mock_context_manager";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { createMockTexture, createMockCubeTexture } from "../../testing/mocks/mock_texture";
import { TextureUnit } from "../../webgl/textures/texture_types";

describe("applyMaterial", () => {
    it("applies pipeline state, binds shader by key, and uploads uniforms", () => {
        const mockGl = createMockWebGL2Context();
        const mockCm = createMockContextManager(mockGl);
        const mockShader = createMockShaderProgram("unlit");
        mockCm.shaders.bindKey = vi.fn(() => mockShader as any);

        const material = new Material({
            shaderKey: "unlit",
            pipelineState: {
                blendMode: "additive",
                depthWrite: false,
            },
            uniforms: {
                u_customParam: 42.0,
            },
        });

        const returnedShader = applyMaterial(material, mockCm);

        expect(returnedShader).toBe(mockShader);
        expect(mockCm.applyPipelineState).toHaveBeenCalledTimes(1);
        expect(mockCm.applyPipelineState).toHaveBeenCalledWith(material.pipelineState);

        expect(mockCm.shaders.bindKey).toHaveBeenCalledTimes(1);
        expect(mockCm.shaders.bindKey).toHaveBeenCalledWith("unlit");

        expect(mockShader.setUniforms).toHaveBeenCalledTimes(1);
        expect(mockShader.setUniforms).toHaveBeenCalledWith(
            expect.objectContaining({
                u_customParam: 42.0,
            })
        );
    });

    it("binds 2D textures with neutral white fallback", () => {
        const mockGl = createMockWebGL2Context();
        const mockCm = createMockContextManager(mockGl);
        const mockShader = createMockShaderProgram("unlit");
        mockCm.shaders.bindKey = vi.fn(() => mockShader as any);

        const texture0 = createMockTexture("tex0");
        const texture1 = createMockTexture("tex1");

        const material = new UnlitMaterial();
        material.setTexture(TextureUnit.Color0, texture0);
        material.setTexture(TextureUnit.Color1, texture1);

        applyMaterial(material, mockCm);

        expect(mockCm.textures.bind).toHaveBeenCalledWith(TextureUnit.Color0, texture0);
        expect(mockCm.textures.bind).toHaveBeenCalledWith(TextureUnit.Color1, texture1);
    });

    it("does not bind any 2D textures if the material has no textures assigned", () => {
        const mockGl = createMockWebGL2Context();
        const mockCm = createMockContextManager(mockGl);
        const mockShader = createMockShaderProgram("unlit");
        mockCm.shaders.bindKey = vi.fn(() => mockShader as any);

        const material = new Material({
            shaderKey: "unlit",
        });

        applyMaterial(material, mockCm);

        expect(mockCm.textures.bind).not.toHaveBeenCalled();
    });

    it("binds cubemap textures", () => {
        const mockGl = createMockWebGL2Context();
        const mockCm = createMockContextManager(mockGl);
        const mockShader = createMockShaderProgram("skybox");
        mockCm.shaders.bindKey = vi.fn(() => mockShader as any);

        const cubeTexture = createMockCubeTexture("cubeEnv");

        const material = new Material({
            shaderKey: "skybox",
            cubeTextures: {
                [TextureUnit.Environment]: cubeTexture,
            },
        });

        applyMaterial(material, mockCm);

        expect(mockCm.textures.bindCube).toHaveBeenCalledWith(TextureUnit.Environment, cubeTexture);
    });
});
