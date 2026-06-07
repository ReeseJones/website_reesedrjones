import * as React from "react";
import * as PIXI from "pixi.js";
import { useEffect, useRef, useState } from "react";

export const usePixiApp = () => {
    const [appContainer, setAppContainer] = useState<HTMLElement | null>(null);
    const [appInitialized, setAppInitialized] = useState(false);
    const [appReady, setAppReady] = useState(false);
    const pixiApp = useRef<PIXI.Application | null>(null);

    // Load Pixi App on mount and destroy on unmount.
    useEffect(() => {
        console.log("Creating new pixi app");
        let isMounted = true;
        pixiApp.current = new PIXI.Application();

        const initPromise = pixiApp.current.init({
            resolution: window.devicePixelRatio || 1,
            backgroundColor: 0,
        }).then(() => {
            if(!isMounted) {
                return;
            }
            // After pixiApp is initialized it may be used.
            pixiApp.current?.canvas.classList.add("hero-effect");
            setAppInitialized(true);
            console.log("Pixi app initialized");
        }).catch((error) => {
            if(!isMounted) {
                return;
            }
            console.log("Pixi app initialized failed with error: ", error);
            setAppInitialized(false);
        });

        return () => {
            isMounted = false;
            console.log("destroying pixi app");
            const appRef = pixiApp.current;
            initPromise.finally(() => {
                appRef?.destroy();
                console.log("Pixi app destroyed");
            });
        };
    }, []);

    // Add pixi canvas to the DOM.
    useEffect(() => {
        let isMounted = true;
        // No app set yet
        if (!pixiApp.current) {
            return;
        }

        // App not initialized yet, wait for initialization before adding to the DOM.
        if(!appInitialized) {
            return;
        }

        if (appContainer != null) {
            console.log("Adding Pixi Canvas to the DOM");
            appContainer.appendChild(pixiApp.current.canvas);
            pixiApp.current.resizeTo = appContainer;
            // Force onetime resize.
            setTimeout(() => {
                if(!isMounted) {
                    return;
                }
                pixiApp.current?.resize();
                setAppReady(true);
            }, 1);
        } else {
            pixiApp.current.canvas.remove();
            console.log("Container Cleared: Pixi Canvas from the DOM");
            setAppReady(false);
        }

        // Remove pixi canvas from the DOM on cleanup.
        return () => {  
            isMounted = false;
            pixiApp.current?.canvas?.remove();
            console.log("Unmounted: Pixi Canvas from the DOM");
        };
    }, [appContainer, appInitialized]);

/*
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
*/

    const setPixiAppContainer = React.useCallback((node?: HTMLElement | null) => {
        if (node && node.isConnected) {
            setAppContainer(node);
        }
    }, []);

    return [setPixiAppContainer, pixiApp, appReady] as const;
};
