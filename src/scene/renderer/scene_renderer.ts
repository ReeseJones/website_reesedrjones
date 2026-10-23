import { isRenderable, type RenderContext } from "../core/renderable_types";
import type { ISceneRenderer, RenderOptions, RenderQueueItem } from "./scene_renderer_types";
import {
    DEFAULT_RENDER_ORDER,
    DEPTH_SORT_EPSILON,
    TRANSPARENT_RENDER_ORDER_THRESHOLD,
} from "./scene_renderer_constants";

/**
 * Concrete 3D Scene Renderer orchestrating hierarchical scene updates,
 * camera view-projection synchronization, render queue collection,
 * and dispatching draw passes to IRenderable entities.
 */
export class SceneRenderer implements ISceneRenderer {
    private readonly _renderQueue: RenderQueueItem[] = [];
    private _frameId: number = 0;

    public render(options: RenderOptions): void {
        const {
            contextManager,
            scene,
            camera,
            dimensions,
            timeInfo,
            clearDepth,
        } = options;

        const gl = contextManager.getContext();
        if (!gl || gl.isContextLost()) {
            return;
        }

        const activeCamera = camera ?? scene.activeCamera;
        if (!activeCamera) {
            throw new Error("[SceneRenderer] No camera provided and scene.activeCamera is null.");
        }

        if (clearDepth) {
            contextManager.setDepthMask(true);
            gl.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        }

        this._frameId++;

        // Stage 1: Hierarchical transform propagation
        scene.update();

        // Stage 2: Camera matrix synchronization
        activeCamera.updateAspectRatio(dimensions.aspect);
        activeCamera.updateMatrices();

        // Stage 3: Collect visible renderables & sort by renderOrder and view depth
        this._renderQueue.length = 0;
        const vm = activeCamera.viewMatrix;
        scene.traverseVisible((node) => {
            if (isRenderable(node)) {
                const wx = node.worldMatrix[12];
                const wy = node.worldMatrix[13];
                const wz = node.worldMatrix[14];
                const depth = -(vm[2] * wx + vm[6] * wy + vm[10] * wz + vm[14]);

                this._renderQueue.push({
                    renderable: node,
                    renderOrder: node.renderOrder ?? DEFAULT_RENDER_ORDER,
                    depth,
                    index: this._renderQueue.length,
                });
            }
        });

        this._renderQueue.sort((a, b) => {
            if (a.renderOrder !== b.renderOrder) {
                return a.renderOrder - b.renderOrder;
            }
            if (a.renderOrder >= TRANSPARENT_RENDER_ORDER_THRESHOLD) {
                const depthDiff = b.depth - a.depth;
                if (Math.abs(depthDiff) > DEPTH_SORT_EPSILON) {
                    return depthDiff;
                }
            }
            return a.index - b.index;
        });

        // Stage 4: Dispatch render calls to renderables
        const renderContext: RenderContext = {
            contextManager,
            gl,
            camera: activeCamera,
            dimensions,
            time: timeInfo.time,
            frameId: this._frameId,
        };

        for (let i = 0; i < this._renderQueue.length; i++) {
            this._renderQueue[i].renderable.render(renderContext);
        }
    }

    public reset(): void {
        this._renderQueue.length = 0;
        this._frameId = 0;
    }
}
