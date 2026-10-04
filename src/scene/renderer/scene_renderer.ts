import type { IScene } from "../core/scene_types";
import type { ICamera } from "../camera/camera_types";
import { isRenderable, type RenderContext } from "../core/renderable_types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type { ISceneRenderer, RenderOptions, RenderQueueItem } from "./scene_renderer_types";
import { DEFAULT_RENDER_ORDER } from "./scene_renderer_constants";

/**
 * Concrete 3D Scene Renderer orchestrating hierarchical scene updates,
 * camera view-projection synchronization, render queue collection,
 * and dispatching draw passes to IRenderable entities.
 */
export class SceneRenderer implements ISceneRenderer {
    public readonly contextManager: IWebGLContextManager;

    private readonly _renderQueue: RenderQueueItem[] = [];

    constructor(contextManager: IWebGLContextManager) {
        this.contextManager = contextManager;
    }

    public render(
        scene: IScene,
        camera: ICamera,
        options: RenderOptions
    ): void {
        const gl = this.contextManager.getContext();
        if (!gl || gl.isContextLost()) {
            return;
        }

        if (options.clearDepth) {
            this.contextManager.setDepthMask(true);
            gl.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        }

        // Stage 1: Hierarchical transform propagation
        scene.update();

        // Stage 2: Camera matrix synchronization
        camera.updateAspectRatio(options.dimensions.aspect);
        camera.updateMatrices();

        // Stage 3: Collect visible renderables & stable sort by renderOrder
        this._renderQueue.length = 0;
        scene.traverseVisible((node) => {
            if (isRenderable(node)) {
                this._renderQueue.push({
                    renderable: node,
                    renderOrder: node.renderOrder ?? DEFAULT_RENDER_ORDER,
                });
            }
        });

        this._renderQueue.sort((a, b) => a.renderOrder - b.renderOrder);

        // Stage 4: Dispatch render calls to renderables
        const renderContext: RenderContext = {
            contextManager: this.contextManager,
            gl,
            camera,
            dimensions: options.dimensions,
            time: options.timeInfo.time,
        };

        for (let i = 0; i < this._renderQueue.length; i++) {
            this._renderQueue[i].renderable.render(renderContext);
        }
    }

    public reset(): void {
        this._renderQueue.length = 0;
        this.contextManager.resetPipelineState();
    }
}
