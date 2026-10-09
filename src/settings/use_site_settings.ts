import { useCallback, useState } from "react";
import {
    DEFAULT_SITE_SETTINGS,
    STORAGE_KEY_SITE_SETTINGS,
    type DeepPartial,
    type SiteSettings,
    type SiteSettingsContextValue,
    type UseSiteSettingsOptions,
} from "./site_settings_types";

/**
 * Merges a partial patch into existing SiteSettings immutably.
 *
 * @param base Base settings state to extend.
 * @param patch Partial patch object containing modifications.
 * @returns New immutable SiteSettings object.
 */
export function mergeSiteSettings(
    base: SiteSettings,
    patch?: DeepPartial<SiteSettings> | null
): SiteSettings {
    if (!patch) {
        return base;
    }

    return {
        ...base,
        debug: {
            ...base.debug,
            ...(patch.debug ?? {}),
        },
    };
}

/**
 * Loads persisted SiteSettings from localStorage with safe fallback to default values.
 *
 * @param storageKey Key used in localStorage, or null/undefined to bypass storage.
 * @param initialSettings Optional override values merged on initialization.
 * @returns Merged SiteSettings.
 */
export function loadSiteSettings(
    storageKey?: string | null,
    initialSettings?: DeepPartial<SiteSettings>
): SiteSettings {
    let merged = DEFAULT_SITE_SETTINGS;

    if (initialSettings) {
        merged = mergeSiteSettings(merged, initialSettings);
    }

    if (typeof window === "undefined" || !storageKey) {
        return merged;
    }

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
            const parsed = JSON.parse(raw) as DeepPartial<SiteSettings>;
            if (parsed && typeof parsed === "object") {
                merged = mergeSiteSettings(merged, parsed);
            }
        }
    } catch {
        // Fallback to defaults when storage access is denied or JSON is malformed
    }

    return merged;
}

/**
 * Persists SiteSettings to localStorage safely.
 *
 * @param storageKey Key used in localStorage, or null/undefined to bypass storage.
 * @param settings Settings object to serialize.
 */
export function saveSiteSettings(
    storageKey: string | null | undefined,
    settings: SiteSettings
): void {
    if (typeof window === "undefined" || !storageKey) {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
        // Gracefully handle storage quota limits or disabled localStorage
    }
}

/**
 * Removes persisted site settings from localStorage.
 *
 * @param storageKey Key used in localStorage.
 */
export function removeStoredSiteSettings(storageKey?: string | null): void {
    if (typeof window === "undefined" || !storageKey) {
        return;
    }

    try {
        window.localStorage.removeItem(storageKey);
    } catch {
        // Gracefully handle storage removal failures
    }
}

/**
 * Hook providing centralized SiteSettings state management, mutation, and persistence.
 *
 * @param options Storage key and optional initial settings overrides.
 * @returns Context value containing active settings and mutator callbacks.
 */
export function useSiteSettings(
    options: UseSiteSettingsOptions = {}
): SiteSettingsContextValue {
    const { storageKey = STORAGE_KEY_SITE_SETTINGS, initialSettings } = options;

    const [settings, setSettings] = useState<SiteSettings>(() =>
        loadSiteSettings(storageKey, initialSettings)
    );

    const updateSettings = useCallback(
        (patch: DeepPartial<SiteSettings>) => {
            setSettings((prev) => {
                const next = mergeSiteSettings(prev, patch);
                saveSiteSettings(storageKey, next);
                return next;
            });
        },
        [storageKey]
    );

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SITE_SETTINGS);
        removeStoredSiteSettings(storageKey);
    }, [storageKey]);

    return {
        settings,
        updateSettings,
        resetSettings,
    };
}
