import { useCallback, useEffect, useRef, useState } from "react";
import {
    CanvasDimensions,
    TimeInfo,
    WebGLContextOptions,
    WebGLSubscriber,
} from "./types";

const DEFAULT_OPTIONS: Required<WebGLContextOptions> = {
    version: "webgl2",
    dprCap: 1.5,
    renderMode: "continuous",
    pauseWhenOffscreen: true,
    pauseWhenHidden: true,
    attributes: {
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
    },
};

export interface UseWebGLCanvasOptions {
    options?: WebGLContextOptions;
    onContextCreated?: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => void;
}

export function useWebGLCanvas(config?: UseWebGLCanvasOptions) {
    const options = {
        ...DEFAULT_OPTIONS,
        ...config?.options,
        attributes: {
            ...DEFAULT_OPTIONS.attributes,
            ...config?.options?.attributes,
        },
    };
    const onContextCreated = config?.onContextCreated;

    const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null);
    const [isSupported, setIsSupported] = useState(true);
    const [isContextLost, setIsContextLost] = useState(false);
    const [dimensions, setDimensions] = useState<CanvasDimensions>({
        width: 1,
        height: 1,
        cssWidth: 1,
        cssHeight: 1,
        dpr: 1,
        aspect: 1,
    });

    const glRef = useRef<WebGL2RenderingContext | null>(null);
    const dimensionsRef = useRef<CanvasDimensions>(dimensions);
    dimensionsRef.current = dimensions;

    const subscribersRef = useRef<Map<string, WebGLSubscriber>>(new Map());

    // Loop & timing references
    const rafIdRef = useRef<number | null>(null);
    const isOffscreenRef = useRef(false);
    const isHiddenRef = useRef(false);
    const lastTimeRef = useRef(0);
    const startTimeRef = useRef(0);
    const frameCountRef = useRef(0);

    const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
        setCanvasNode(node);
    }, []);

    // Compute dimensions and resize backing buffer
    const updateDimensions = useCallback(
        (canvas: HTMLCanvasElement, gl: WebGL2RenderingContext): CanvasDimensions => {
            const dpr = Math.min(
                typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
                options.dprCap
            );
            const rect = canvas.getBoundingClientRect();
            const displayWidth = Math.max(1, Math.floor(rect.width * dpr));
            const displayHeight = Math.max(1, Math.floor(rect.height * dpr));

            if (
                canvas.width !== displayWidth ||
                canvas.height !== displayHeight
            ) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                gl.viewport(0, 0, displayWidth, displayHeight);
            }

            const nextDims: CanvasDimensions = {
                width: displayWidth,
                height: displayHeight,
                cssWidth: rect.width,
                cssHeight: rect.height,
                dpr,
                aspect: displayWidth / Math.max(1, displayHeight),
            };

            dimensionsRef.current = nextDims;
            setDimensions(nextDims);
            return nextDims;
        },
        [options.dprCap]
    );

    // Frame execution tick
    const executeFrame = useCallback((now: number) => {
        const gl = glRef.current;
        if (!gl || isOffscreenRef.current || isHiddenRef.current) return;

        const rawDt = (now - lastTimeRef.current) / 1000;
        const dt = Math.min(Math.max(rawDt, 0.0001), 0.1);
        lastTimeRef.current = now;
        const time = (now - startTimeRef.current) / 1000;
        frameCountRef.current++;

        const timeInfo: TimeInfo = {
            time,
            dt,
            frameCount: frameCountRef.current,
        };

        const sorted = Array.from(subscribersRef.current.values()).sort(
            (a, b) => a.priority - b.priority
        );

        const dims = dimensionsRef.current;
        for (const sub of sorted) {
            sub.render?.(gl, timeInfo, dims);
        }
    }, []);

    // Subscribe a new pass or observer
    const subscribe = useCallback(
        (subscriber: WebGLSubscriber) => {
            subscribersRef.current.set(subscriber.id, subscriber);
            const gl = glRef.current;
            if (gl && !isContextLost) {
                subscriber.init?.(gl, dimensionsRef.current);
            }
            return () => {
                subscriber.destroy?.();
                subscribersRef.current.delete(subscriber.id);
            };
        },
        [isContextLost]
    );

    // Manually trigger a render
    const requestRender = useCallback(() => {
        if (typeof window !== "undefined") {
            executeFrame(performance.now());
        }
    }, [executeFrame]);

    useEffect(() => {
        if (!canvasNode) return;

        // 1. Context Acquisition
        const gl = canvasNode.getContext(
            options.version,
            options.attributes
        ) as WebGL2RenderingContext | null;

        if (!gl) {
            console.error(
                `WebGL canvas: Failed to acquire ${options.version} context.`
            );
            setIsSupported(false);
            return;
        }

        glRef.current = gl;
        setIsSupported(true);
        setIsContextLost(false);

        const initialDims = updateDimensions(canvasNode, gl);
        onContextCreated?.(gl, canvasNode);

        // Initialize any already-registered subscribers
        for (const sub of subscribersRef.current.values()) {
            sub.init?.(gl, initialDims);
        }

        // 2. Context Loss & Restored Handling
        const handleContextLost = (e: Event) => {
            // CRITICAL: Tells browser we intend to restore, preventing permanent disposal
            e.preventDefault();
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            setIsContextLost(true);
            for (const sub of subscribersRef.current.values()) {
                sub.onContextLost?.(e as WebGLContextEvent);
            }
        };

        const handleContextRestored = () => {
            setIsContextLost(false);
            const restoredDims = updateDimensions(canvasNode, gl);
            for (const sub of subscribersRef.current.values()) {
                sub.onContextRestored?.(gl, restoredDims);
            }
            lastTimeRef.current = performance.now();
            startLoop();
        };

        canvasNode.addEventListener("webglcontextlost", handleContextLost, false);
        canvasNode.addEventListener(
            "webglcontextrestored",
            handleContextRestored,
            false
        );

        // 3. Render Loop
        const loop = (now: number) => {
            executeFrame(now);
            if (options.renderMode === "continuous") {
                rafIdRef.current = requestAnimationFrame(loop);
            }
        };

        const startLoop = () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            if (
                options.renderMode === "continuous" &&
                !isOffscreenRef.current &&
                !isHiddenRef.current
            ) {
                rafIdRef.current = requestAnimationFrame(loop);
            }
        };

        startTimeRef.current = performance.now();
        lastTimeRef.current = startTimeRef.current;
        startLoop();

        // 4. ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
            if (!glRef.current) return;
            const newDims = updateDimensions(canvasNode, glRef.current);
            for (const sub of subscribersRef.current.values()) {
                sub.resize?.(glRef.current, newDims);
            }
            if (options.renderMode === "on-demand") {
                executeFrame(performance.now());
            }
        });
        resizeObserver.observe(canvasNode);

        // 5. Throttling: IntersectionObserver (Off-screen Pausing)
        let intersectionObserver: IntersectionObserver | null = null;
        if (options.pauseWhenOffscreen && typeof IntersectionObserver !== "undefined") {
            intersectionObserver = new IntersectionObserver(([entry]) => {
                const isOffscreen = entry.intersectionRatio === 0;
                isOffscreenRef.current = isOffscreen;
                if (!isOffscreen) {
                    lastTimeRef.current = performance.now();
                    startLoop();
                } else if (rafIdRef.current !== null) {
                    cancelAnimationFrame(rafIdRef.current);
                    rafIdRef.current = null;
                }
            });
            intersectionObserver.observe(canvasNode);
        }

        // 6. Throttling: Visibility Change (Background Tab Pausing)
        const handleVisibilityChange = () => {
            if (!options.pauseWhenHidden) return;
            isHiddenRef.current = document.hidden;
            if (!document.hidden) {
                lastTimeRef.current = performance.now();
                startLoop();
            } else if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange, false);

        // 7. Cleanup & Deterministic Context Disposal
        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }

            canvasNode.removeEventListener("webglcontextlost", handleContextLost);
            canvasNode.removeEventListener(
                "webglcontextrestored",
                handleContextRestored
            );
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );

            resizeObserver.disconnect();
            intersectionObserver?.disconnect();

            // Destroy all subscribers
            for (const sub of subscribersRef.current.values()) {
                sub.destroy?.();
            }

            // Explicitly force context loss on unmount to free the browser's context quota slot immediately
            if (glRef.current) {
                const loseExt = glRef.current.getExtension("WEBGL_lose_context");
                loseExt?.loseContext();
                glRef.current = null;
            }
        };
    }, [
        canvasNode,
        options.version,
        options.dprCap,
        options.renderMode,
        options.pauseWhenOffscreen,
        options.pauseWhenHidden,
        updateDimensions,
        executeFrame,
        onContextCreated,
    ]);

    return {
        canvasRef,
        gl: glRef.current,
        isSupported,
        isContextLost,
        dimensions,
        subscribe,
        requestRender,
    };
}
