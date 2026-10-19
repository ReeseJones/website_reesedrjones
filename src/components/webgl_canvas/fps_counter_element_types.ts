import type { FpsCounterElement } from "./fps_counter_element";

/**
 * Screen corner position variants for the FPS counter overlay.
 */
export type FpsCounterPosition =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";

/**
 * Display modes for the Lit FPS counter element.
 */
export type FpsCounterDisplayMode = "both" | "fps" | "frame-time" | "none";

/**
 * Declarative property inputs for Lit FPS counter elements (<rj-fps-counter>).
 */
export interface FpsCounterElementProps {
    frameTimeMs?: number;
    "frame-time-ms"?: number;
    mode?: FpsCounterDisplayMode;
    position?: FpsCounterPosition;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-fps-counter": FpsCounterElement;
    }
}
