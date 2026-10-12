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
        render: (_gl, timeInfo, dims) => {
            rendererRef.current?.render(scene, camera, {
                timeInfo,
                dimensions: dims,
                clearDepth,
            });
        },
        destroy: () => {
            rendererRef.current?.reset();
            rendererRef.current = null;
        },
    });

    useEffect(() => {
        return () => {
            rendererRef.current?.reset();
            rendererRef.current = null;
        };
    }, []);

    return null;
}
