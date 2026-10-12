import React, { createContext, useContext, useMemo } from "react";
import { useSiteSettings } from "./use_site_settings";
import type {
    SiteSettingsContextValue,
    SiteSettingsProviderProps,
} from "./site_settings_types";

export const SiteSettingsContext =
    createContext<SiteSettingsContextValue | null>(null);

/**
 * Ambient React Context provider for global site settings.
 */
export function SiteSettingsProvider(
    props: SiteSettingsProviderProps
): React.JSX.Element {
    const { children, initialSettings, storageKey } = props;

    const siteSettings = useSiteSettings({
        storageKey,
        initialSettings,
    });

    const contextValue = useMemo<SiteSettingsContextValue>(() => ({
        settings: siteSettings.settings,
        updateSettings: siteSettings.updateSettings,
        resetSettings: siteSettings.resetSettings,
    }), [siteSettings.settings, siteSettings.updateSettings, siteSettings.resetSettings]);

    return (
        <SiteSettingsContext.Provider value={contextValue}>
            {children}
        </SiteSettingsContext.Provider>
    );
}

/**
 * Hook to consume site settings within a SiteSettingsProvider.
 *
 * @throws Error when invoked outside a SiteSettingsProvider subtree.
 */
export function useSiteSettingsContext(): SiteSettingsContextValue {
    const context = useContext(SiteSettingsContext);
    if (!context) {
        throw new Error(
            "useSiteSettingsContext must be used within a SiteSettingsProvider"
        );
    }
    return context;
}
