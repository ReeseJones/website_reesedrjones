import React from "react";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type {
    CanvasDimensions,
    TimeInfo,
    WebGLContextOptions,
} from "../../webgl/canvas/canvas_types";
import type { WebGLSubscriber } from "../../webgl/canvas/subscriber_types";

export type {
    CanvasDimensions,
    TimeInfo,
    WebGLContextOptions,
    WebGLSubscriber,
};

export interface WebGLCanvasContextValue {
    /** The active WebGL2 context (null if unmounted or lost) */
    gl: WebGL2RenderingContext | null;
    /** Central WebGL Context & GPU Resource Manager scoped to this canvas */
    contextManager: IWebGLContextManager;
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
