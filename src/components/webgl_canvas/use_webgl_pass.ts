import { useEffect, useRef } from "react";
import { useWebGLContext } from "./webgl_context";
import { WebGLSubscriber } from "./types";

export type WebGLPassOptions = Omit<WebGLSubscriber, "id">;

/**
 * Hook to register a comprehensive multi-lifecycle render pass with the enclosing <WebGLCanvas>.
 * Supports init, render, resize, onContextLost, onContextRestored, and destroy callbacks.
 *
 * @param pass The pass definition and lifecycle callbacks.
 */
export function useWebGLPass(pass: WebGLPassOptions): void {
    const { subscribe } = useWebGLContext();
    const passRef = useRef(pass);
    passRef.current = pass;

    useEffect(() => {
        const id = Math.random().toString(36).substring(2, 9);
        return subscribe({
            id,
            get priority() {
                return passRef.current.priority;
            },
            init: (gl, dims) => {
                passRef.current.init?.(gl, dims);
            },
            render: (gl, timeInfo, dims) => {
                passRef.current.render?.(gl, timeInfo, dims);
            },
            resize: (gl, dims) => {
                passRef.current.resize?.(gl, dims);
            },
            onContextLost: (event) => {
                passRef.current.onContextLost?.(event);
            },
            onContextRestored: (gl, dims) => {
                passRef.current.onContextRestored?.(gl, dims);
            },
            destroy: () => {
                passRef.current.destroy?.();
            },
        });
    }, [subscribe]);
}
