import type { ReactNode } from "react";

/**
 * Storage key utilized for persisting site settings in localStorage.
 */
export const STORAGE_KEY_SITE_SETTINGS = "site_settings_v1";

/**
 * Recursive partial helper type enabling deep partial modifications.
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Debugging, telemetry, and diagnostic preferences.
 */
export interface DebugSettings {
    /** Whether to display the real-time WebGL FPS counter overlay */
    showFps: boolean;
}

/**
 * Global site settings preference structure.
 */
export interface SiteSettings {
    /** Debugging and diagnostics options */
    debug: DebugSettings;
}

/**
 * Factory defaults for site settings.
 */
export const DEFAULT_DEBUG_SETTINGS: Readonly<DebugSettings> = Object.freeze({
    showFps: false,
});

export const DEFAULT_SITE_SETTINGS: Readonly<SiteSettings> = Object.freeze({
    debug: DEFAULT_DEBUG_SETTINGS,
});

/**
 * Context value interface for site settings consumers.
 */
export interface SiteSettingsContextValue {
    /** Current active site settings */
    settings: SiteSettings;
    /** Mutator for updating partial site settings */
    updateSettings: (patch: DeepPartial<SiteSettings>) => void;
    /** Reverts all site settings to factory defaults */
    resetSettings: () => void;
}

/**
 * Configuration options for the useSiteSettings hook.
 */
export interface UseSiteSettingsOptions {
    /** Optional storage key for localStorage persistence (null disables persistence) */
    storageKey?: string | null;
    /** Initial settings overrides */
    initialSettings?: DeepPartial<SiteSettings>;
}

/**
 * Props for the SiteSettingsProvider component.
 */
export interface SiteSettingsProviderProps {
    children: ReactNode;
    /** Initial settings overrides */
    initialSettings?: DeepPartial<SiteSettings>;
    /** Optional storage key for localStorage persistence */
    storageKey?: string | null;
}
