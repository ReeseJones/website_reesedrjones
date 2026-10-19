import { createContext } from "@lit/context";
import type { CanvasDimensions } from "../../webgl/canvas/canvas_types";
import type { WebGLSubscriber } from "../../webgl/canvas/subscriber_types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type { WebGLCanvasElement } from "./webgl_canvas_element";

export type WebGLCanvasRenderMode = "continuous" | "on-demand";

/**
 * Public declarative property inputs for the WebGLCanvasElement (<rj-webgl-canvas>).
 */
export interface WebGLCanvasElementProps {
    dprCap?: number;
    "dpr-cap"?: number;
    renderMode?: WebGLCanvasRenderMode;
    "render-mode"?: WebGLCanvasRenderMode;
    pauseWhenOffscreen?: boolean;
    "pause-when-offscreen"?: boolean;
    pauseWhenHidden?: boolean;
    "pause-when-hidden"?: boolean;
}

/**
 * Real-time performance telemetry metrics captured by the WebGL canvas host element.
 */
export interface WebGLCanvasMetrics {
    fps: number;
    frameTimeMs: number;
}

/**
 * Context provided by an enclosing WebGL canvas host element.
 */
export interface IWebGLCanvasContext {
    readonly gl: WebGL2RenderingContext | null;
    readonly contextManager: IWebGLContextManager;
    readonly dimensions: CanvasDimensions;
    readonly isContextLost: boolean;
    readonly metrics: WebGLCanvasMetrics;
    subscribe(subscriber: WebGLSubscriber): () => void;
    requestRender(): void;
}

/**
 * Context token providing access to the WebGL2 rendering surface and context.
 */
export const webglCanvasContext = createContext<IWebGLCanvasContext>(
    Symbol("rj-webgl-canvas-context")
);

declare global {
    interface HTMLElementTagNameMap {
        "rj-webgl-canvas": WebGLCanvasElement;
    }
}
