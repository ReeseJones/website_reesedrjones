import "./general_settings_section.scss";

import React, { useContext } from "react";
import { SiteSettingsContext } from "../../settings/site_settings_context";
import type { GeneralSettingsSectionProps } from "./general_settings_section_types";

/**
 * Settings section for global site preferences, including performance telemetry and diagnostics.
 */
export function GeneralSettingsSection(
    props: GeneralSettingsSectionProps
): React.JSX.Element {
    const ambientContext = useContext(SiteSettingsContext);

    const settings = props.settings ?? ambientContext?.settings;
    const onChange = props.onChange ?? ambientContext?.updateSettings;
    const onReset = props.onReset ?? ambientContext?.resetSettings;

    if (!settings || !onChange) {
        throw new Error(
            "GeneralSettingsSection requires either explicit settings/onChange props or an enclosing SiteSettingsProvider"
        );
    }

    const handleToggleFps = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({
            debug: {
                showFps: e.target.checked,
            },
        });
    };

    return (
        <div className="general-settings-section">
            <div className="settings-group">
                <h4 className="group-title">Diagnostics &amp; Performance</h4>

                <div className="setting-row">
                    <div className="setting-info">
                        <label
                            htmlFor="setting-show-fps"
                            className="setting-title"
                        >
                            Show FPS Counter
                        </label>
                        <p className="setting-description">
                            Displays real-time WebGL frame rate, frame delta, and render duration.
                        </p>
                    </div>

                    <label className="toggle-switch">
                        <input
                            id="setting-show-fps"
                            type="checkbox"
                            role="switch"
                            aria-checked={settings.debug.showFps}
                            checked={settings.debug.showFps}
                            onChange={handleToggleFps}
                        />
                        <span className="toggle-slider" aria-hidden="true" />
                    </label>
                </div>
            </div>

            {onReset && (
                <div className="actions-row">
                    <button
                        type="button"
                        className="action-btn"
                        onClick={onReset}
                        title="Revert all general settings to factory defaults"
                    >
                        Reset General Defaults
                    </button>
                </div>
            )}
        </div>
    );
}
