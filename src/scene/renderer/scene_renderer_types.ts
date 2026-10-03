import type { IScene } from "../core/scene_types";
import type { ICamera } from "../camera/camera_types";
import type { IModelInstance } from "../models/model_instance_types";
import type { CanvasDimensions, TimeInfo } from "../../components/webgl_canvas/types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";

/**
 * Standard uniform attributes distributed across Tier A (camera/frame) and
 * Tier B (model transform) rendering passes.
 */
export interface StandardShaderUniforms {
    u_viewProjectionMatrix: Float32Array;
    u_viewMatrix: Float32Array;
    u_projectionMatrix: Float32Array;
    u_cameraPosition: [number, number, number];
    u_modelMatrix: Float32Array;
    u_modelViewMatrix: Float32Array;
    u_normalMatrix?: Float32Array;
    u_time: number;
    u_viewportHeight: number;
}

/**
 * Encapsulated queue element for depth-sorting and render execution.
 */
export interface RenderQueueItem {
    instance: IModelInstance;
    renderOrder: number;
}

/**
 * Public contract for orchestrating 3D scene traversal, camera synchronization,
 * pipeline state deduplication, uniform distribution, and draw call execution.
 */
export interface ISceneRenderer {
    readonly contextManager: IWebGLContextManager;

    /** Initializes rendering state and allocates resources for active canvas dimensions. */
    init(gl: WebGL2RenderingContext, dims: CanvasDimensions): void;

    /**
     * Executes the 5-stage frame rendering loop:
     * 1. Evaluates dirty transforms across the scene graph.
     * 2. Synchronizes camera aspect ratio and pre-multiplies VP matrices.
     * 3. Collects visible ModelInstance nodes and performs a stable renderOrder sort.
     * 4. Asserts pipeline states with contextManager caching.
     * 5. Uploads Tier A/B/C uniforms and issues draw calls.
     */
    renderFrame(
        gl: WebGL2RenderingContext,
        scene: IScene,
        camera: ICamera,
        timeInfo: TimeInfo,
        dims: CanvasDimensions
    ): void;

    /** Handles WebGL context loss by invalidating GPU allocations. */
    onContextLost(): void;

    /** Handles WebGL context restoration by re-creating GPU resources. */
    onContextRestored(gl: WebGL2RenderingContext, dims: CanvasDimensions): void;

    /** Disposes all renderer resources and detaches context manager references. */
    destroy(): void;
}
