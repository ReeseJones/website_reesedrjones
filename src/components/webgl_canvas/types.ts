import React from "react";
import type { WebGLContextManager } from "../../webgl/context_manager";

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

export interface TimeInfo {
    /** Total elapsed time in seconds since the canvas initialized */
    time: number;
    /** Delta time in seconds since the previous frame (clamped to prevent physics explosion) */
    dt: number;
    /** Monotonically increasing frame counter */
    frameCount: number;
}

/**
 * Contract implemented by any layer, pass, or observer registered with the canvas.
 */
export interface WebGLSubscriber {
    /** Unique identifier for the subscriber */
    id: string;
    /** Execution order: lower numbers render first (e.g. 0 = background, 10 = scene, 100 = overlay) */
    priority: number;
    /** Called when the subscriber is registered or when context becomes available */
    init?: (gl: WebGL2RenderingContext, dims: CanvasDimensions) => void;
    /** Called on each animation tick to draw or compute frame updates */
    render?: (gl: WebGL2RenderingContext, timeInfo: TimeInfo, dims: CanvasDimensions) => void;
    /** Called whenever the canvas backing dimensions change */
    resize?: (gl: WebGL2RenderingContext, dims: CanvasDimensions) => void;
    /** Called when the browser signals GPU context loss. Invalidate GPU resource handles here. */
    onContextLost?: (event: WebGLContextEvent) => void;
    /** Called when the browser restores the WebGL context. Recreate shaders and buffers here. */
    onContextRestored?: (gl: WebGL2RenderingContext, dims: CanvasDimensions) => void;
    /** Called when the subscriber unregisters */
    destroy?: () => void;
}

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

export interface WebGLCanvasContextValue {
    /** The active WebGL2 context (null if unmounted or lost) */
    gl: WebGL2RenderingContext | null;
    /** Central WebGL Context & GPU Resource Manager scoped to this canvas */
    contextManager: WebGLContextManager;
    /** True if the client device supports the requested WebGL version */
    isSupported: boolean;
    /** True if the WebGL context is currently lost */
    isContextLost: boolean;
    /** Current backing store and CSS dimensions */
    dimensions: CanvasDimensions;
    /** Registers a subscriber and returns an unsubscribe callback */
    subscribe: (subscriber: WebGLSubscriber) => () => void;
    /** Manually triggers a single frame render (useful for on-demand mode) */
    requestRender: () => void;
}

export interface WebGLCanvasProps extends React.ComponentPropsWithoutRef<"canvas"> {
    /** Configuration options for context, DPR, and throttling */
    options?: WebGLContextOptions;
    /** Fallback UI rendered if WebGL is unsupported */
    fallback?: React.ReactNode;
    /** Child components: headless WebGL passes and/or DOM overlays */
    children?: React.ReactNode;
    /** Optional callback ref to the underlying HTMLCanvasElement */
    canvasRef?: React.Ref<HTMLCanvasElement>;
    /** Direct callback when WebGL context is created */
    onContextCreated?: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => void;
}
