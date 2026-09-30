import { useCallback, useEffect, useRef, useState } from "react";
import { GalaxyRenderer } from "../galaxy_backdrop/galaxy_renderer";
import { GalaxyParameters } from "../galaxy_backdrop/galaxy_parameters";

export const useGalaxyBackdrop = (customParams?: Partial<GalaxyParameters>) => {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const [isReady, setIsReady] = useState(false);
    const rendererRef = useRef<GalaxyRenderer | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!container) {
            setIsReady(false);
            return;
        }

        // Create the canvas element with the hero-effect styling
        const canvas = document.createElement("canvas");
        canvas.classList.add("hero-effect");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.pointerEvents = "none"; // Ensure background does not block UI clicks

        container.appendChild(canvas);

        const renderer = new GalaxyRenderer(canvas, customParams);
        const success = renderer.initialize();

        if (success) {
            rendererRef.current = renderer;
            if (isMounted) {
                setIsReady(true);
            }
        } else {
            console.error("Failed to initialize GalaxyRenderer");
        }

        // Resize handling using ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
            renderer.resize();
        });
        resizeObserver.observe(container);

        const handleWindowResize = () => {
            renderer.resize();
        };
        window.addEventListener("resize", handleWindowResize, { passive: true });

        return () => {
            isMounted = false;
            resizeObserver.disconnect();
            window.removeEventListener("resize", handleWindowResize);

            if (rendererRef.current) {
                rendererRef.current.destroy();
                rendererRef.current = null;
            }

            canvas.remove();
            setIsReady(false);
        };
    }, [container]);

    const setBackdropContainer = useCallback((node: HTMLElement | null) => {
        if (node && node.isConnected) {
            setContainer(node);
        } else {
            setContainer(null);
        }
    }, []);

    return [setBackdropContainer, isReady] as const;
};
