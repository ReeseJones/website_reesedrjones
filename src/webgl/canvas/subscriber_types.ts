import type { IPriorityItem } from "../../core/collections/priority_registry_types";
import type { CanvasDimensions, TimeInfo } from "./canvas_types";

/**
 * Contract implemented by any layer, pass, or observer registered with a WebGL canvas.
 */
export interface WebGLSubscriber extends IPriorityItem {
    /** Execution order: lower numbers render first (e.g. 0 = background, 10 = scene, 100 = overlay) */
    readonly priority: number;
    /** Called when the subscriber is registered or when context becomes available */
    init?: (gl: WebGL2RenderingContext, dims: CanvasDimensions) => void;
    /** Called on each animation tick to draw or compute frame updates */
    render?: (gl: WebGL2RenderingContext, timeInfo: TimeInfo, dims: CanvasDimensions) => void;
    /** Called whenever the canvas backing dimensions change */
    resize?: (gl: WebGL2RenderingContext, dims: CanvasDimensions) => void;
    /** Called when the browser signals GPU context loss. Invalidate GPU resource handles here. */
    onContextLost?: (event: WebGLContextEvent) => void;
    /** Called when the browser restores the WebGL context. Recreate shaders and buffers here. */
    onContextRestored?: (gl: WebGL2RenderingContext, dims: CanvasDimensions) => void;
    /** Called when the subscriber unregisters */
    destroy?: () => void;
}
