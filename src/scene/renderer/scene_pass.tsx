import { useEffect, useRef } from "react";
import { useWebGLContext } from "../../components/webgl_canvas/webgl_context";
import { useWebGLPass } from "../../components/webgl_canvas/use_webgl_pass";
import { SceneRenderer } from "./scene_renderer";
import type { ScenePassProps } from "./scene_pass_types";

/**
 * Headless declarative bridge component connecting a 3D Scene and Camera
 * to the enclosing <WebGLCanvas> multi-pass render pipeline.
 */
export function ScenePass({
    scene,
    camera,
    priority = 10,
    clearDepth = true,
}: ScenePassProps): null {
    const { contextManager } = useWebGLContext();
    const rendererRef = useRef<SceneRenderer | null>(null);

    if (!rendererRef.current || rendererRef.current.contextManager !== contextManager) {
        rendererRef.current = new SceneRenderer(contextManager);
    }

    useWebGLPass({
        priority,
        init: (gl, dims) => {
            rendererRef.current?.init(gl, dims);
        },
        render: (gl, timeInfo, dims) => {
            if (clearDepth) {
                contextManager.setDepthMask(true);
                gl.clear(gl.DEPTH_BUFFER_BIT);
            }
            rendererRef.current?.renderFrame(gl, scene, camera, timeInfo, dims);
        },
        resize: (_gl, _dims) => {
            // Camera aspect ratio and projection matrices are synchronized on renderFrame
        },
        onContextLost: () => {
            rendererRef.current?.onContextLost();
        },
        onContextRestored: (gl, dims) => {
            rendererRef.current?.onContextRestored(gl, dims);
        },
        destroy: () => {
            rendererRef.current?.destroy();
            rendererRef.current = null;
        },
    });

    useEffect(() => {
        return () => {
            rendererRef.current?.destroy();
            rendererRef.current = null;
        };
    }, []);

    return null;
}
