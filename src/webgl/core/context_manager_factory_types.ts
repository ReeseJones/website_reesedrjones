import type { IShaderManager } from "../shaders/shader_manager_types";
import type { ITextureManager } from "../textures/texture_manager_types";
import type { IGeometryManager } from "../geometry/geometry_manager_types";

/**
 * Options for configuring default subsystem instances in createDefaultContextManager.
 */
export interface ContextManagerFactoryOptions {
    readonly shaders?: IShaderManager;
    readonly textures?: ITextureManager;
    readonly geometries?: IGeometryManager;
}
