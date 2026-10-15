import type {
    CanvasDimensions,
    TimeInfo,
    WebGLSubscriber,
    WebGLContextOptions,
} from "../../components/webgl_canvas/types";
import type { IWebGLCanvasContext } from "./scene_element_types";
import type { WebGLCanvasElement } from "./webgl_canvas_element";
import type { NormalizedRgbaTuple } from "./converters/rgba_color_converter_types";

export type {
    CanvasDimensions,
    TimeInfo,
    WebGLSubscriber,
    WebGLContextOptions,
    IWebGLCanvasContext,
    NormalizedRgbaTuple,
};

export type WebGLCanvasRenderMode = "continuous" | "on-demand";

/**
 * Public declarative property inputs for the WebGLCanvasElement (<rj-webgl-canvas>).
 */
export interface WebGLCanvasElementProps {
    dprCap?: number;
    autoClear?: boolean;
    clearColor?: NormalizedRgbaTuple;
    renderMode?: WebGLCanvasRenderMode;
    pauseWhenOffscreen?: boolean;
    pauseWhenHidden?: boolean;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-webgl-canvas": WebGLCanvasElement;
    }
}
