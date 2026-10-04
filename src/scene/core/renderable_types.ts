import type { ISceneNode } from "./scene_node_types";
import type { ICamera } from "../camera/camera_types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type { CanvasDimensions } from "../../components/webgl_canvas/types";

/**
 * Execution context passed to IRenderable nodes during the render pass.
 */
export interface RenderContext {
    readonly contextManager: IWebGLContextManager;
    readonly gl: WebGL2RenderingContext;
    readonly camera: ICamera;
    readonly dimensions: CanvasDimensions;
    readonly time: number;
}

/**
 * Interface implemented by scene nodes that submit draw commands to the WebGL pipeline.
 */
export interface IRenderable extends ISceneNode {
    readonly isRenderable: true;
    readonly renderOrder: number;

    /**
     * Executes the WebGL state configuration, material binding, uniform distribution,
     * and geometry draw call for this renderable item.
     */
    render(context: RenderContext): void;
}

/**
 * Type guard asserting whether a scene node conforms to the IRenderable contract.
 */
export function isRenderable(node: ISceneNode): node is IRenderable {
    return node.isRenderable === true && typeof (node as unknown as IRenderable).render === "function";
}
