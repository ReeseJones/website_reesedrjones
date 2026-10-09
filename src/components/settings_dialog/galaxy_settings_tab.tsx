import "./galaxy_settings_tab.scss";

import React, { useCallback, useState } from "react";
import { GALAXY_PRESETS } from "../../galaxy_backdrop/parameters/index";
import { RenderStyleSection } from "../../galaxy_backdrop/galaxy_settings_dialog/render_style_section";
import { CameraPerspectiveSection } from "../../galaxy_backdrop/galaxy_settings_dialog/camera_perspective_section";
import { StellarPopulationSection } from "../../galaxy_backdrop/galaxy_settings_dialog/stellar_population_section";
import { ColorsGlowSection } from "../../galaxy_backdrop/galaxy_settings_dialog/colors_glow_section";
import { ParticleSizesSection } from "../../galaxy_backdrop/galaxy_settings_dialog/particle_sizes_section";
import { MotionDynamicsSection } from "../../galaxy_backdrop/galaxy_settings_dialog/motion_dynamics_section";
import { GalacticCloudSection } from "../../galaxy_backdrop/galaxy_settings_dialog/galactic_cloud_section";
import { classNameMap } from "../../lib/classNameMap";
import type { GalaxySettingsTabProps } from "./galaxy_settings_tab_types";

const COPIED_FEEDBACK_DURATION_MS = 2000;
const CUSTOM_PRESET_ID = "custom";
const JSON_INDENT_SPACES = 2;

/**
 * Tab component adapter that houses galaxy preset management, parameters export, and the 7 tuning sections.
 */
export function GalaxySettingsTab(
    props: GalaxySettingsTabProps
): React.JSX.Element {
    const { controller } = props;

    const params = controller?.params ?? props.params;
    const currentPresetId =
        controller?.currentPresetId ?? props.currentPresetId ?? "default";
    const onChange = controller?.updateParameters ?? props.onChange;
    const onReset = controller?.resetParameters ?? props.onReset;
    const onApplyPreset = controller?.applyPreset ?? props.onApplyPreset;

    const [copied, setCopied] = useState(false);

    const handleCopyJson = useCallback(() => {
        if (!params) {
            return;
        }
        navigator.clipboard.writeText(
            JSON.stringify(params, null, JSON_INDENT_SPACES)
        );
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION_MS);
    }, [params]);

    if (!params || !onChange || !onReset || !onApplyPreset) {
        throw new Error(
            "GalaxySettingsTab requires either a controller prop or explicit params, currentPresetId, onChange, onReset, and onApplyPreset props"
        );
    }

    const copyBtnClass = classNameMap({
        "action-btn": true,
        "copied-btn": copied,
    });

    return (
        <div className="galaxy-settings-tab">
            {/* Toolbar */}
            <div className="toolbar-row">
                <select
                    className="preset-select"
                    value={currentPresetId}
                    onChange={(e) => onApplyPreset(e.target.value)}
                    aria-label="Select Galaxy Preset"
                >
                    {GALAXY_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                    {currentPresetId === CUSTOM_PRESET_ID && (
                        <option value={CUSTOM_PRESET_ID}>Custom (Modified)</option>
                    )}
                </select>

                <button
                    type="button"
                    className="action-btn"
                    onClick={onReset}
                    title="Revert all parameters to factory defaults"
                >
                    Reset Defaults
                </button>

                <button
                    type="button"
                    className={copyBtnClass}
                    onClick={handleCopyJson}
                    title="Copy configuration JSON to clipboard"
                >
                    {copied ? "Copied!" : "Copy JSON"}
                </button>
            </div>

            {/* Tuning Sections */}
            <div className="settings-sections-list">
                <RenderStyleSection params={params} onChange={onChange} />
                <CameraPerspectiveSection params={params} onChange={onChange} />
                <GalacticCloudSection params={params} onChange={onChange} />
                <StellarPopulationSection params={params} onChange={onChange} />
                <ColorsGlowSection params={params} onChange={onChange} />
                <ParticleSizesSection params={params} onChange={onChange} />
                <MotionDynamicsSection params={params} onChange={onChange} />
            </div>
        </div>
    );
}
