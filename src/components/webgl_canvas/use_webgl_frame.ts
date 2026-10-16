import { useEffect, useRef } from "react";
import { useWebGLContext } from "./webgl_context";
import type { CanvasDimensions, TimeInfo } from "../../webgl/canvas/canvas_types";

export type WebGLFrameCallback = (
    gl: WebGL2RenderingContext,
    timeInfo: TimeInfo,
    dimensions: CanvasDimensions
) => void;

/**
 * Hook to execute imperative render logic on every animation frame tick.
 * Automatically registers with the enclosing <WebGLCanvas> multi-subscriber pipeline.
 *
 * @param callback The render function executed each frame tick.
 * @param priority Execution order (lower numbers run earlier, default: 0).
 */
export function useWebGLFrame(callback: WebGLFrameCallback, priority = 0): void {
    const { subscribe } = useWebGLContext();
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        return subscribe({
            priority,
            render: (gl, timeInfo, dims) => {
                callbackRef.current(gl, timeInfo, dims);
            },
        });
    }, [subscribe, priority]);
}
