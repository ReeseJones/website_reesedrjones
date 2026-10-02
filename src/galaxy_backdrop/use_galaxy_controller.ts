import { useCallback, useRef, useState } from "react";
import {
    DEFAULT_GALAXY_PARAMETERS,
    GALAXY_PRESETS,
    GalaxyParameters,
    MOBILE_GALAXY_PARAMETERS,
} from "./parameters/index";

import type {
    GalaxyControllerOptions,
    GalaxyController,
} from "./galaxy_controller_types";

export const DEFAULT_STORAGE_KEY = "galaxy_backdrop_parameters";

function getInitialParameters(
    storageKey?: string | null,
    initialParams?: Partial<GalaxyParameters>
): GalaxyParameters {
    const isMobile =
        typeof window !== "undefined" &&
        (window.innerWidth < 768 ||
            /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

    const baseParams: GalaxyParameters = {
        ...DEFAULT_GALAXY_PARAMETERS,
        ...(isMobile ? MOBILE_GALAXY_PARAMETERS : {}),
        ...initialParams,
    };

    if (typeof window !== "undefined" && storageKey) {
        try {
            const saved = localStorage.getItem(storageKey);
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

/**
 * Encapsulated hook managing parameter state, localStorage persistence, and preset switching
 * for an independent 3D galaxy simulation instance.
 */
export function useGalaxyController(
    options: GalaxyControllerOptions = {}
): GalaxyController {
    const { storageKey = DEFAULT_STORAGE_KEY, initialParams } = options;

    const [params, setParams] = useState<GalaxyParameters>(() =>
        getInitialParameters(storageKey, initialParams)
    );
    const paramsRef = useRef<GalaxyParameters>(params);
    paramsRef.current = params;

    const updateParameters = useCallback(
        (partial: Partial<GalaxyParameters>) => {
            setParams((prev) => {
                const next = { ...prev, ...partial };
                paramsRef.current = next;

                if (typeof window !== "undefined" && storageKey) {
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(next));
                    } catch (e) {
                        console.warn("Could not save galaxy parameters", e);
                    }
                }
                return next;
            });
        },
        [storageKey]
    );

    const resetParameters = useCallback(() => {
        const isMobile =
            typeof window !== "undefined" &&
            (window.innerWidth < 768 ||
                /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

        const defaults: GalaxyParameters = {
            ...DEFAULT_GALAXY_PARAMETERS,
            ...(isMobile ? MOBILE_GALAXY_PARAMETERS : {}),
            ...initialParams,
        };

        paramsRef.current = defaults;
        setParams(defaults);

        if (typeof window !== "undefined" && storageKey) {
            try {
                localStorage.removeItem(storageKey);
            } catch (e) {
                console.warn("Could not remove stored galaxy parameters", e);
            }
        }
    }, [storageKey, initialParams]);

    const applyPreset = useCallback(
        (presetId: string) => {
            const preset = GALAXY_PRESETS.find((p) => p.id === presetId);
            if (preset) {
                updateParameters(preset.params);
            }
        },
        [updateParameters]
    );

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

    return {
        params,
        updateParameters,
        resetParameters,
        applyPreset,
        currentPresetId,
    };
}
