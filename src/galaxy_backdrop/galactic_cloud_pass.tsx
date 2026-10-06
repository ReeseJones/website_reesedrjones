import { useEffect, useRef } from "react";
import { useWebGLPass } from "../components/webgl_canvas/use_webgl_pass";
import { useWebGLContext } from "../components/webgl_canvas/webgl_context";
import { GalacticCloudRenderer } from "./galactic_cloud_renderer";
import type { GalacticCloudPassProps } from "./galactic_cloud_pass_types";

/**
 * Renderless pass component for the Galactic Cloud & Infinite Horizon background simulation.
 * Subscribes GalacticCloudRenderer lifecycle callbacks to the enclosing <WebGLCanvas /> at priority -10.
 */
export function GalacticCloudPass(props: GalacticCloudPassProps): null {
    const { controller, params: rawParams, priority = -10 } = props;
    const activeParams = controller?.params ?? rawParams;
    const { contextManager } = useWebGLContext();

    const rendererRef = useRef<GalacticCloudRenderer | null>(null);

    useWebGLPass({
        priority,
        init: (gl, dims) => {
            const renderer = new GalacticCloudRenderer(contextManager, activeParams);
            renderer.init(gl, dims);
            rendererRef.current = renderer;
        },
        render: (gl, timeInfo, dims) => {
            rendererRef.current?.renderFrame(gl, timeInfo, dims);
        },
        resize: (gl, dims) => {
            rendererRef.current?.updateProjection(gl, dims);
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
        if (activeParams) {
            rendererRef.current?.updateParameters(activeParams);
        }
    }, [activeParams]);

    return null;
}
