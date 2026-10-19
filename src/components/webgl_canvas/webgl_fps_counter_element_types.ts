import type { FpsCounterDisplayMode, FpsCounterPosition } from "./fps_counter_element_types";
import type { WebGLFpsCounterElement } from "./webgl_fps_counter_element";

/**
 * Declarative property inputs for Lit WebGL FPS counter elements (<rj-webgl-fps-counter>).
 */
export interface WebGLFpsCounterElementProps {
    position?: FpsCounterPosition;
    mode?: FpsCounterDisplayMode;
    updateIntervalMs?: number;
    "update-interval-ms"?: number;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-webgl-fps-counter": WebGLFpsCounterElement;
    }
}
