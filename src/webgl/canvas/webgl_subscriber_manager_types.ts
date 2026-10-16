import type { CanvasDimensions, TimeInfo } from "./canvas_types";
import type { WebGLSubscriber } from "./subscriber_types";

/**
 * Interface for managing and broadcasting WebGL lifecycle events and render frames
 * to prioritized WebGLSubscriber instances.
 */
export interface IWebGLSubscriberManager {
    /** Total number of currently registered subscribers */
    readonly subscriberCount: number;

    /**
     * Registers a WebGL subscriber and returns an unregister cleanup closure.
     * If the manager has already been initialized with a WebGL context, subscriber.init is invoked immediately.
     */
    subscribe(subscriber: WebGLSubscriber): () => void;

    /**
     * Broadcasts context initialization to all registered subscribers.
     */
    notifyInit(gl: WebGL2RenderingContext, dimensions: CanvasDimensions): void;

    /**
     * Broadcasts an animation render tick to all registered subscribers in priority order.
     */
    notifyRender(
        gl: WebGL2RenderingContext,
        timeInfo: TimeInfo,
        dimensions: CanvasDimensions
    ): void;

    /**
     * Broadcasts viewport resize changes to all registered subscribers in priority order.
     */
    notifyResize(gl: WebGL2RenderingContext, dimensions: CanvasDimensions): void;

    /**
     * Broadcasts context loss event to all registered subscribers.
     */
    notifyContextLost(event: WebGLContextEvent): void;

    /**
     * Broadcasts context restored event to all registered subscribers.
     */
    notifyContextRestored(gl: WebGL2RenderingContext, dimensions: CanvasDimensions): void;

    /**
     * Destroys all subscribers, invoking their destroy callbacks, and clears the registry.
     */
    destroy(): void;
}
