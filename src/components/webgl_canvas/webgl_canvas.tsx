import "./webgl_canvas.scss";
import React, { useCallback, useMemo } from "react";
import { WebGLCanvasProps, WebGLCanvasContextValue } from "./types";
import { WebGLCanvasContext } from "./webgl_context";
import { useWebGLCanvas } from "./use_webgl_canvas";

/**
 * Reusable WebGL canvas host component.
 * Manages the WebGL context, DPR scaling, context loss/recovery, off-screen throttling,
 * and provides a scoped multi-subscriber render pipeline for child layers and overlays.
 */
export function WebGLCanvas(props: WebGLCanvasProps): React.JSX.Element | null {
    const {
        options,
        fallback,
        className,
        style,
        children,
        canvasRef: externalCanvasRef,
        onContextCreated,
        ...canvasAttrs
    } = props;

    const {
        canvasRef: internalCanvasRef,
        gl,
        isSupported,
        isContextLost,
        dimensions,
        subscribe,
        requestRender,
    } = useWebGLCanvas({
        options,
        onContextCreated,
    });

    const setCanvasRef = useCallback(
        (node: HTMLCanvasElement | null) => {
            internalCanvasRef(node);
            if (typeof externalCanvasRef === "function") {
                externalCanvasRef(node);
            } else if (externalCanvasRef && "current" in externalCanvasRef) {
                (
                    externalCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>
                ).current = node;
            }
        },
        [internalCanvasRef, externalCanvasRef]
    );

    const contextValue = useMemo<WebGLCanvasContextValue>(
        () => ({
            gl,
            isSupported,
            isContextLost,
            dimensions,
            subscribe,
            requestRender,
        }),
        [gl, isSupported, isContextLost, dimensions, subscribe, requestRender]
    );

    if (!isSupported) {
        return fallback ? <>{fallback}</> : null;
    }

    const classes = className ? `webgl-canvas ${className}` : "webgl-canvas";

    return (
        <WebGLCanvasContext.Provider value={contextValue}>
            <canvas
                ref={setCanvasRef}
                className={classes}
                style={style}
                {...canvasAttrs}
            />
            {children}
        </WebGLCanvasContext.Provider>
    );
}
