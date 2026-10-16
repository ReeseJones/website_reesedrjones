import type {
    CanvasDimensions,
    TimeInfo,
    WebGLContextOptions,
} from "../../webgl/canvas/canvas_types";
import type { WebGLSubscriber } from "../../webgl/canvas/subscriber_types";
import type { IWebGLCanvasContext } from "./scene_element_types";
import type { WebGLCanvasElement } from "./webgl_canvas_element";

export type {
    CanvasDimensions,
    TimeInfo,
    WebGLSubscriber,
    WebGLContextOptions,
    IWebGLCanvasContext,
};

export type WebGLCanvasRenderMode = "continuous" | "on-demand";

/**
 * Public declarative property inputs for the WebGLCanvasElement (<rj-webgl-canvas>).
 */
export interface WebGLCanvasElementProps {
    dprCap?: number;
    renderMode?: WebGLCanvasRenderMode;
    pauseWhenOffscreen?: boolean;
    pauseWhenHidden?: boolean;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-webgl-canvas": WebGLCanvasElement;
    }
}
