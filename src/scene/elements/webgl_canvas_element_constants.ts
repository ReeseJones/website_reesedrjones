import type { NormalizedRgbaTuple } from "./converters/rgba_color_converter_types";

/**
 * HTML custom element tag name for the WebGL canvas wrapper Web Component.
 */
export const TAG_RJ_WEBGL_CANVAS = "rj-webgl-canvas";

/**
 * Default configuration values for <rj-webgl-canvas>.
 */
export const DEFAULT_DPR_CAP = 1.5;
export const DEFAULT_AUTO_CLEAR = true;
export const DEFAULT_CLEAR_COLOR: NormalizedRgbaTuple = [0, 0, 0, 0];
export const DEFAULT_RENDER_MODE: "continuous" = "continuous";
export const DEFAULT_PAUSE_WHEN_OFFSCREEN = true;
export const DEFAULT_PAUSE_WHEN_HIDDEN = true;

/**
 * Viewport origin coordinates.
 */
export const VIEWPORT_X = 0;
export const VIEWPORT_Y = 0;

/**
 * Default WebGL context initialization attributes.
 */
export const DEFAULT_CONTEXT_ALPHA = true;
export const DEFAULT_CONTEXT_ANTIALIAS = false;
export const DEFAULT_CONTEXT_DEPTH = true;
export const DEFAULT_CONTEXT_POWER_PREFERENCE: WebGLPowerPreference = "high-performance";
export const DEFAULT_CONTEXT_PRESERVE_DRAWING_BUFFER = false;

export const DEFAULT_WEBGL_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
    alpha: DEFAULT_CONTEXT_ALPHA,
    antialias: DEFAULT_CONTEXT_ANTIALIAS,
    depth: DEFAULT_CONTEXT_DEPTH,
    powerPreference: DEFAULT_CONTEXT_POWER_PREFERENCE,
    preserveDrawingBuffer: DEFAULT_CONTEXT_PRESERVE_DRAWING_BUFFER,
};

/**
 * Debug context simulator default delay.
 */
export const CONTEXT_SIMULATE_LOSS_DEFAULT_DELAY_MS = 1500;
