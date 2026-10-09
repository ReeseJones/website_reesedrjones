import type { DeepPartial, SiteSettings } from "../../settings/site_settings_types";

/**
 * Props for the GeneralSettingsSection component.
 */
export interface GeneralSettingsSectionProps {
    /** Explicit site settings state (falls back to useSiteSettingsContext if omitted) */
    settings?: SiteSettings;
    /** Mutator callback for settings updates */
    onChange?: (patch: DeepPartial<SiteSettings>) => void;
    /** Callback to reset site settings to default values */
    onReset?: () => void;
}
