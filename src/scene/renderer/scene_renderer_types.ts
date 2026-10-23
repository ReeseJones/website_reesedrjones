import type { Vector3Like } from "../../maths/vector_types";
import type { IScene } from "../core/scene_types";
import type { ICamera } from "../camera/camera_types";
import type { IRenderable } from "../core/renderable_types";
import type { CanvasDimensions, TimeInfo } from "../../webgl/canvas/canvas_types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";

/**
 * Standard uniform attributes distributed across Tier A (camera/frame) and
 * Tier B (model transform) rendering passes.
 */
export interface StandardShaderUniforms {
    u_viewProjectionMatrix: Float32Array;
    u_viewMatrix: Float32Array;
    u_projectionMatrix: Float32Array;
    u_cameraPosition: Vector3Like | [number, number, number] | Float32Array;
    u_modelMatrix: Float32Array;
    u_modelViewMatrix: Float32Array;
    u_normalMatrix?: Float32Array;
    u_time: number;
    u_viewportHeight: number;
}

/**
 * Frame-level execution options passed to ISceneRenderer.render.
 */
export interface RenderOptions {
    /** Context manager providing WebGL resources and pipeline state management. */
    contextManager: IWebGLContextManager;
    /** The 3D scene containing objects to render. */
    scene: IScene;
    /** Optional camera override. Defaults to scene.activeCamera if omitted or null. */
    camera?: ICamera | null;
    /** Frame timing and delta seconds. */
    timeInfo: TimeInfo;
    /** Viewport dimensions and aspect ratio. */
    dimensions: CanvasDimensions;
    /** Optional flag to clear depth buffer before drawing (defaults to false). */
    clearDepth?: boolean;
}

/**
 * Encapsulated queue element for depth-sorting and render execution.
 */
export interface RenderQueueItem {
    renderable: IRenderable;
    renderOrder: number;
    depth: number;
    index: number;
}

/**
 * Public contract for orchestrating 3D scene traversal, camera synchronization,
 * pipeline state deduplication, uniform distribution, and draw call execution.
 */
export interface ISceneRenderer {
    /**
     * Executes the 5-stage frame rendering loop:
     * 1. Evaluates dirty transforms across the scene graph.
     * 2. Synchronizes camera aspect ratio and pre-multiplies VP matrices.
     * 3. Collects visible ModelInstance nodes and performs a stable renderOrder sort.
     * 4. Asserts pipeline states with contextManager caching.
     * 5. Uploads Tier A/B/C uniforms and issues draw calls.
     */
    render(options: RenderOptions): void;

    /**
     * Clears internal transient render queues and resets pipeline state.
     */
    reset(): void;
}
