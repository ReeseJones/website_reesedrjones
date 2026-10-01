import { createContext, useContext } from "react";
import { WebGLCanvasContextValue } from "./types";

export const WebGLCanvasContext = createContext<WebGLCanvasContextValue | null>(null);

/**
 * Hook to access the parent WebGL canvas context.
 * Provides gl context, dimensions, context loss state, and subscription registration.
 */
export function useWebGLContext(): WebGLCanvasContextValue {
    const ctx = useContext(WebGLCanvasContext);
    if (!ctx) {
        throw new Error("useWebGLContext must be used within a <WebGLCanvas> component.");
    }
    return ctx;
}
