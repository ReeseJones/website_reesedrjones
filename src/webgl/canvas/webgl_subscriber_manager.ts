import type { CanvasDimensions, TimeInfo } from "./canvas_types";
import type { WebGLSubscriber } from "./subscriber_types";
import { PriorityRegistry } from "../../core/collections/priority_registry";
import type { IWebGLSubscriberManager } from "./webgl_subscriber_manager_types";

/**
 * Priority-ordered manager for WebGL rendering subscribers and lifecycle event dispatching.
 */
export class WebGLSubscriberManager implements IWebGLSubscriberManager {
    private readonly _registry: PriorityRegistry<WebGLSubscriber> = new PriorityRegistry();
    private _gl: WebGL2RenderingContext | null = null;
    private _dimensions: CanvasDimensions | null = null;

    public get subscriberCount(): number {
        return this._registry.size;
    }

    public subscribe(subscriber: WebGLSubscriber): () => void {
        if (this._registry.has(subscriber)) {
            throw new Error("Cannot subscribe: WebGLSubscriber is already subscribed.");
        }

        this._registry.register(subscriber);

        if (this._gl && this._dimensions) {
            subscriber.init?.(this._gl, this._dimensions);
        }

        let isUnregistered = false;
        return () => {
            if (isUnregistered) {
                return;
            }
            isUnregistered = true;
            subscriber.destroy?.();
            this._registry.unregister(subscriber);
        };
    }

    public notifyInit(gl: WebGL2RenderingContext, dimensions: CanvasDimensions): void {
        this._gl = gl;
        this._dimensions = dimensions;

        const subscribers = this._registry.getSorted();
        for (let i = 0; i < subscribers.length; i++) {
            subscribers[i].init?.(gl, dimensions);
        }
    }

    public notifyRender(
        gl: WebGL2RenderingContext,
        timeInfo: TimeInfo,
        dimensions: CanvasDimensions
    ): void {
        const subscribers = this._registry.getSorted();
        for (let i = 0; i < subscribers.length; i++) {
            subscribers[i].render?.(gl, timeInfo, dimensions);
        }
    }

    public notifyResize(gl: WebGL2RenderingContext, dimensions: CanvasDimensions): void {
        this._dimensions = dimensions;

        const subscribers = this._registry.getSorted();
        for (let i = 0; i < subscribers.length; i++) {
            subscribers[i].resize?.(gl, dimensions);
        }
    }

    public notifyContextLost(event: WebGLContextEvent): void {
        this._gl = null;

        const subscribers = this._registry.getSorted();
        for (let i = 0; i < subscribers.length; i++) {
            subscribers[i].onContextLost?.(event);
        }
    }

    public notifyContextRestored(gl: WebGL2RenderingContext, dimensions: CanvasDimensions): void {
        this._gl = gl;
        this._dimensions = dimensions;

        const subscribers = this._registry.getSorted();
        for (let i = 0; i < subscribers.length; i++) {
            subscribers[i].onContextRestored?.(gl, dimensions);
        }
    }

    public destroy(): void {
        const subscribers = this._registry.getSorted();
        for (let i = 0; i < subscribers.length; i++) {
            subscribers[i].destroy?.();
        }
        this._registry.clear();
        this._gl = null;
        this._dimensions = null;
    }
}
