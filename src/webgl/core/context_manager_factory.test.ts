import { describe, it, expect, vi } from "vitest";
import { createDefaultContextManager } from "./context_manager_factory";
import { WebGLContextManager } from "./context_manager";
import { ShaderManager } from "../shaders/shader_manager";
import { TextureManager } from "../textures/texture_manager";
import { GeometryManager } from "../geometry/geometry_manager";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";

describe("createDefaultContextManager", () => {
    it("instantiates WebGLContextManager with default ShaderManager, TextureManager, and GeometryManager", () => {
        const cm = createDefaultContextManager();

        expect(cm).toBeInstanceOf(WebGLContextManager);
        expect(cm.shaders).toBeInstanceOf(ShaderManager);
        expect(cm.textures).toBeInstanceOf(TextureManager);
        expect(cm.geometries).toBeInstanceOf(GeometryManager);

        expect(cm.getSubsystem("shader")).toBe(cm.shaders);
        expect(cm.getSubsystem("texture")).toBe(cm.textures);
        expect(cm.getSubsystem("geometry")).toBe(cm.geometries);
    });

    it("accepts an options object with custom subsystems", () => {
        const customShaders = new ShaderManager();
        const customTextures = new TextureManager();
        const customGeometries = new GeometryManager();

        const sAttachSpy = vi.spyOn(customShaders, "attach");
        const tAttachSpy = vi.spyOn(customTextures, "attach");
        const gAttachSpy = vi.spyOn(customGeometries, "attach");

        const cm = createDefaultContextManager({
            shaders: customShaders,
            textures: customTextures,
            geometries: customGeometries,
        });

        expect(cm.shaders).toBe(customShaders);
        expect(cm.textures).toBe(customTextures);
        expect(cm.geometries).toBe(customGeometries);
        expect(cm.getContext()).toBeNull();

        expect(sAttachSpy).toHaveBeenCalledWith(cm);
        expect(tAttachSpy).toHaveBeenCalledWith(cm);
        expect(gAttachSpy).toHaveBeenCalledWith(cm);
    });

    it("leaves WebGL context null until setContext is invoked", () => {
        const cm = createDefaultContextManager();
        expect(cm.getContext()).toBeNull();

        const gl = createMockWebGL2Context();
        cm.setContext(gl);
        expect(cm.getContext()).toBe(gl);
    });
});
