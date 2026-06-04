import * as React from "react";
import * as PIXI from "pixi.js";
import { useEffect, useRef, useState } from "react";

export const usePixiApp = () => {
    const [appContainer, setAppContainer] = useState<HTMLElement | null>(null);
    const [viewMounted, setViewMounted] = useState(false);
    const [appInitialized, setAppInitialized] = useState(false);

    const pixiApp = useRef<PIXI.Application | null>(null);

    useEffect(() => {
        console.log("Creating new pixi app");
        const tempApp = new PIXI.Application();

        const initPromise = tempApp.init({
            resolution: window.devicePixelRatio || 1,
            backgroundColor: 0
        }).then(() => {
            tempApp.canvas.classList.add("hero-effect");
            pixiApp.current = tempApp;
            setAppInitialized(true);
        });

        return () => {
            console.log("destroying pixi app");
            initPromise.finally(() => {
                pixiApp.current?.destroy(true, true);
                pixiApp.current = null;
                setAppInitialized(false);
            })
        };
    }, []);

    // Add pixi canvas to the DOM.
    useEffect(() => {
        if (appContainer !== null && pixiApp.current) {
            console.log("Added pixi view");
            pixiApp.current.resizeTo = window;
            appContainer.appendChild(pixiApp.current.canvas);
            setTimeout(() => pixiApp.current?.resize(), 1);
        }

        // Remove pixi canvas from the DOM on cleanup.
        return () => {
            if (pixiApp.current && appContainer) {
                console.log("removed pixi view");
                
                pixiApp.current.canvas.remove();
                setViewMounted(false);
                pixiApp.current.resizeTo = undefined as any;
            }
        };
    }, [appContainer, appInitialized]);

    useEffect(() => {
        const resizeChecker = setInterval(() => {
            const resizeTarget = pixiApp.current?.resizeTo;
            const view = pixiApp.current?.canvas;
            if (resizeTarget && view) {
                if (
                    window.innerWidth === view.offsetWidth &&
                    window.innerHeight === view.offsetHeight
                ) {
                    if (!viewMounted) {
                        console.log("Mounted the view");
                        setViewMounted(true);
                    }
                } else {
                    if (viewMounted) {
                        console.log("View Unmounted");
                        setViewMounted(false);
                    }
                }
            }
        }, 100);

        return () => {
            clearInterval(resizeChecker);
        };
    }, [viewMounted]);

    const containerMounting = React.useCallback((node: HTMLDivElement) => {
        if (node) {
            setAppContainer(node);
        }
    }, []);

    return [containerMounting, pixiApp, viewMounted] as const;
};
