import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    DEFAULT_GALAXY_PARAMETERS,
    GALAXY_PRESETS,
    GalaxyParameters,
    MOBILE_GALAXY_PARAMETERS,
} from "./parameters/index";
import { GalaxyRenderer } from "./galaxy_renderer";

const STORAGE_KEY = "galaxy_backdrop_parameters";

export interface GalaxyContextValue {
    params: GalaxyParameters;
    updateParameters: (partial: Partial<GalaxyParameters>) => void;
    resetParameters: () => void;
    applyPreset: (presetId: string) => void;
    currentPresetId: string;
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    toggleSettings: () => void;
    setBackdropContainer: (node: HTMLElement | null) => void;
    isReady: boolean;
}

const GalaxyContext = createContext<GalaxyContextValue | null>(null);

function getInitialParameters(): GalaxyParameters {
    const isMobile =
        typeof window !== "undefined" &&
        (window.innerWidth < 768 ||
            /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

    const baseParams: GalaxyParameters = {
        ...DEFAULT_GALAXY_PARAMETERS,
        ...(isMobile ? MOBILE_GALAXY_PARAMETERS : {}),
    };

    if (typeof window !== "undefined") {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...baseParams, ...parsed };
            }
        } catch (e) {
            console.warn("Could not load stored galaxy parameters", e);
        }
    }
    return baseParams;
}

export function GalaxyProvider({ children }: { children: React.ReactNode }) {
    const [params, setParams] = useState<GalaxyParameters>(getInitialParameters);
    const paramsRef = useRef<GalaxyParameters>(params);
    paramsRef.current = params;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const [isReady, setIsReady] = useState(false);
    const rendererRef = useRef<GalaxyRenderer | null>(null);

    const openSettings = useCallback(() => setIsSettingsOpen(true), []);
    const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
    const toggleSettings = useCallback(() => setIsSettingsOpen((prev) => !prev), []);

    const setBackdropContainer = useCallback((node: HTMLElement | null) => {
        if (node && node.isConnected) {
            setContainer(node);
        } else {
            setContainer(null);
        }
    }, []);

    const updateParameters = useCallback((partial: Partial<GalaxyParameters>) => {
        setParams((prev) => {
            const next = { ...prev, ...partial };
            paramsRef.current = next;
            rendererRef.current?.updateParameters(partial);
            if (typeof window !== "undefined") {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                } catch (e) {
                    console.warn("Could not save galaxy parameters", e);
                }
            }
            return next;
        });
    }, []);

    const resetParameters = useCallback(() => {
        const isMobile =
            typeof window !== "undefined" &&
            (window.innerWidth < 768 ||
                /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

        const defaults: GalaxyParameters = {
            ...DEFAULT_GALAXY_PARAMETERS,
            ...(isMobile ? MOBILE_GALAXY_PARAMETERS : {}),
        };

        paramsRef.current = defaults;
        setParams(defaults);
        rendererRef.current?.updateParameters(defaults);

        if (typeof window !== "undefined") {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {
                console.warn("Could not remove stored galaxy parameters", e);
            }
        }
    }, []);

    const applyPreset = useCallback(
        (presetId: string) => {
            const preset = GALAXY_PRESETS.find((p) => p.id === presetId);
            if (preset) {
                updateParameters(preset.params);
            }
        },
        [updateParameters]
    );

    // Compute active preset ID if matching
    const currentPresetId = (() => {
        for (const preset of GALAXY_PRESETS) {
            const keys = Object.keys(preset.params) as (keyof GalaxyParameters)[];
            const matches = keys.every(
                (k) => JSON.stringify(preset.params[k]) === JSON.stringify(params[k])
            );
            if (matches) return preset.id;
        }
        return "custom";
    })();

    useEffect(() => {
        let isMounted = true;
        if (!container) {
            setIsReady(false);
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.classList.add("hero-effect");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.pointerEvents = "none";

        container.appendChild(canvas);

        const renderer = new GalaxyRenderer(canvas, paramsRef.current);
        const success = renderer.initialize();

        if (success) {
            rendererRef.current = renderer;
            if (isMounted) {
                setIsReady(true);
            }
        } else {
            console.error("Failed to initialize GalaxyRenderer");
        }

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

    const contextValue: GalaxyContextValue = {
        params,
        updateParameters,
        resetParameters,
        applyPreset,
        currentPresetId,
        isSettingsOpen,
        openSettings,
        closeSettings,
        toggleSettings,
        setBackdropContainer,
        isReady,
    };

    return (
        <GalaxyContext.Provider value={contextValue}>
            {children}
        </GalaxyContext.Provider>
    );
}

export function useGalaxy(): GalaxyContextValue {
    const ctx = useContext(GalaxyContext);
    if (!ctx) {
        throw new Error("useGalaxy must be used within a GalaxyProvider");
    }
    return ctx;
}
