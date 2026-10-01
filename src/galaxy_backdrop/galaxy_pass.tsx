import { useEffect, useRef } from "react";
import { useWebGLPass } from "../components/webgl_canvas/use_webgl_pass";
import { GalaxyRenderer } from "./galaxy_renderer";
import { GalaxyParameters } from "./parameters/index";
import { GalaxyController } from "./use_galaxy_controller";

export interface GalaxyPassProps {
    /** Target parameters or controller instance */
    params?: GalaxyParameters;
    controller?: GalaxyController;
    /** Subscriber priority (default: 0 for background simulation) */
    priority?: number;
}

/**
 * Renderless pass component for the 3D Galaxy Backdrop simulation.
 * Subscribes GalaxyRenderer lifecycle callbacks to the enclosing <WebGLCanvas />.
 */
export function GalaxyPass(props: GalaxyPassProps): null {
    const { controller, params: rawParams, priority = 0 } = props;
    const activeParams = controller?.params ?? rawParams;

    const rendererRef = useRef<GalaxyRenderer | null>(null);

    useWebGLPass({
        priority,
        init: (gl, dims) => {
            const renderer = new GalaxyRenderer(activeParams);
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
