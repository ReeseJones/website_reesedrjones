/**
 * HTML custom element tag name for the WebGL canvas wrapper Web Component.
 */
export const TAG_RJ_WEBGL_CANVAS = "rj-webgl-canvas";

/**
 * Default configuration values for <rj-webgl-canvas>.
 */
export const DEFAULT_DPR_CAP = 1.5;
export const DEFAULT_RENDER_MODE: "continuous" = "continuous";
export const DEFAULT_PAUSE_WHEN_OFFSCREEN = true;
export const DEFAULT_PAUSE_WHEN_HIDDEN = true;
export const DEFAULT_RESIZE_DEBOUNCE_MS = 100;

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

/**
 * Throttle interval in seconds for calculating FPS telemetry metrics.
 */
export const DEFAULT_METRICS_INTERVAL_SEC = 0.25;

/**
 * Milliseconds per second conversion constant.
 */
export const MS_PER_SECOND = 1000;

