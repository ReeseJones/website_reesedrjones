/**
 * Backing store and CSS viewport dimensions of a WebGL canvas.
 */
export interface CanvasDimensions {
    /** Backing store width in physical device pixels (canvas.width) */
    width: number;
    /** Backing store height in physical device pixels (canvas.height) */
    height: number;
    /** Layout width in CSS pixels */
    cssWidth: number;
    /** Layout height in CSS pixels */
    cssHeight: number;
    /** Effective device pixel ratio applied (clamped by dprCap) */
    dpr: number;
    /** Aspect ratio (width / height) */
    aspect: number;
}

/**
 * Timing metrics passed to animation frame renders.
 */
export interface TimeInfo {
    /** Total elapsed time in seconds since the canvas or animation manager initialized */
    time: number;
    /** Delta time in seconds since the previous frame (clamped to prevent physics explosion) */
    dt: number;
    /** Monotonically increasing frame counter */
    frameCount: number;
}

/**
 * Configuration options for initializing and managing WebGL contexts.
 */
export interface WebGLContextOptions {
    /** Target WebGL API version. Defaults to "webgl2" with optional fallback to "webgl". */
    version?: "webgl2" | "webgl";
    /** WebGL context initialization attributes passed to getContext() */
    attributes?: WebGLContextAttributes;
    /** Maximum allowed device pixel ratio. Defaults to 1.5. */
    dprCap?: number;
    /** Render loop mode: "continuous" runs requestAnimationFrame; "on-demand" renders only when requested. */
    renderMode?: "continuous" | "on-demand";
    /** Automatically pause the render loop when scrolled off-screen. Defaults to true. */
    pauseWhenOffscreen?: boolean;
    /** Automatically pause the render loop when the browser tab is hidden. Defaults to true. */
    pauseWhenHidden?: boolean;
    /** Automatically clear the color buffer before executing passes every frame. Defaults to true. */
    autoClear?: boolean;
    /** Clear color RGBA tuple (0.0 to 1.0) used when autoClear is enabled. Defaults to [0, 0, 0, 0]. */
    clearColor?: [number, number, number, number];
}
