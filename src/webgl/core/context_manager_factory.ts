import { WebGLContextManager } from "./context_manager";
import { ShaderManager } from "../shaders/shader_manager";
import { TextureManager } from "../textures/texture_manager";
import { GeometryManager } from "../geometry/geometry_manager";
import type { ContextManagerFactoryOptions } from "./context_manager_factory_types";

/**
 * Factory creating a WebGLContextManager wired with standard or custom subsystems.
 */
export function createDefaultContextManager(
    options?: ContextManagerFactoryOptions
): WebGLContextManager {
    return new WebGLContextManager({
        shaders: options?.shaders ?? new ShaderManager(),
        textures: options?.textures ?? new TextureManager(),
        geometries: options?.geometries ?? new GeometryManager(),
    });
}
