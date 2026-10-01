import "./galaxy_settings_dialog.scss";

import React, { useCallback, useState } from "react";
import { useGalaxy } from "../galaxy_context";
import { GALAXY_PRESETS } from "../parameters/index";
import { Dialog } from "../../components/dialog/dialog";
import { GearIcon } from "../../components/icons/gear_icon";
import { RenderStyleSection } from "./render_style_section";
import { CameraPerspectiveSection } from "./camera_perspective_section";
import { StellarPopulationSection } from "./stellar_population_section";
import { ColorsGlowSection } from "./colors_glow_section";
import { ParticleSizesSection } from "./particle_sizes_section";
import { MotionDynamicsSection } from "./motion_dynamics_section";

/**
 * Main settings dialog modal for real-time backdrop tuning, preset selection, and parameter export.
 * Composed of modular section components for rendering style, perspective, population, color, point sizes, and dynamics.
 */
export function GalaxySettingsDialog() {
    const {
        params,
        resetParameters,
        applyPreset,
        currentPresetId,
        isSettingsOpen,
        closeSettings,
    } = useGalaxy();

    const [copied, setCopied] = useState(false);

    const handleCopyJson = useCallback(() => {
        navigator.clipboard.writeText(JSON.stringify(params, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [params]);

    return (
        <Dialog
            isOpen={isSettingsOpen}
            onClose={closeSettings}
            onClick={closeSettings}
            className="galaxy-settings-dialog"
        >
            {/* Header */}
            <div className="header-row">
                <h3 className="header-title">
                    <GearIcon />
                    Galaxy Backdrop Settings
                </h3>
                <button
                    type="button"
                    className="close-btn"
                    onClick={closeSettings}
                    aria-label="Close dialog"
                >
                    ✕
                </button>
            </div>

            {/* Toolbar */}
            <div className="toolbar-row">
                <select
                    className="preset-select"
                    value={currentPresetId}
                    onChange={(e) => applyPreset(e.target.value)}
                    aria-label="Select Galaxy Preset"
                >
                    {GALAXY_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                    {currentPresetId === "custom" && (
                        <option value="custom">Custom (Modified)</option>
                    )}
                </select>

                <button
                    type="button"
                    className="action-btn"
                    onClick={resetParameters}
                    title="Revert all parameters to factory defaults"
                >
                    Reset Defaults
                </button>

                <button
                    type="button"
                    className={`action-btn ${copied ? "copied-btn" : ""}`}
                    onClick={handleCopyJson}
                    title="Copy configuration JSON to clipboard"
                >
                    {copied ? "Copied!" : "Copy JSON"}
                </button>
            </div>

            {/* Settings Body */}
            <div className="settings-body">
                <RenderStyleSection />
                <CameraPerspectiveSection />
                <StellarPopulationSection />
                <ColorsGlowSection />
                <ParticleSizesSection />
                <MotionDynamicsSection />
            </div>
        </Dialog>
    );
}
