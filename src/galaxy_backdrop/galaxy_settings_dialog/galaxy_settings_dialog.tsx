import "./galaxy_settings_dialog.scss";

import { useCallback, useState } from "react";
import { GALAXY_PRESETS, GalaxyParameters } from "../parameters/index";
import { Dialog } from "../../components/dialog/dialog";
import { GearIcon } from "../../components/icons/gear_icon";
import { RenderStyleSection } from "./render_style_section";
import { CameraPerspectiveSection } from "./camera_perspective_section";
import { StellarPopulationSection } from "./stellar_population_section";
import { ColorsGlowSection } from "./colors_glow_section";
import { ParticleSizesSection } from "./particle_sizes_section";
import { MotionDynamicsSection } from "./motion_dynamics_section";
import { GalacticCloudSection } from "./galactic_cloud_section";

export interface GalaxySettingsDialogProps {
    /** Dialog visibility state */
    isOpen: boolean;
    /** Callback invoked when closing the dialog modal */
    onClose: () => void;
    /** Current parameter configuration */
    params: GalaxyParameters;
    /** Currently active preset ID */
    currentPresetId: string;
    /** Event emitted when parameters are modified */
    onChange: (partial: Partial<GalaxyParameters>) => void;
    /** Callback to reset parameters to factory defaults */
    onReset: () => void;
    /** Callback to apply a preset by ID */
    onApplyPreset: (presetId: string) => void;
}

/**
 * Pure prop-driven settings dialog modal for real-time 3D galaxy tuning.
 * Emits parameter change events to its parent without depending on any custom React Context.
 */
export function GalaxySettingsDialog(props: GalaxySettingsDialogProps) {
    const {
        isOpen,
        onClose,
        params,
        currentPresetId,
        onChange,
        onReset,
        onApplyPreset,
    } = props;

    const [copied, setCopied] = useState(false);

    const handleCopyJson = useCallback(() => {
        navigator.clipboard.writeText(JSON.stringify(params, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [params]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            onClick={onClose}
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
                    onClick={onClose}
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
                    onChange={(e) => onApplyPreset(e.target.value)}
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
                    onClick={onReset}
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
                <RenderStyleSection params={params} onChange={onChange} />
                <CameraPerspectiveSection params={params} onChange={onChange} />
                <GalacticCloudSection params={params} onChange={onChange} />
                <StellarPopulationSection params={params} onChange={onChange} />
                <ColorsGlowSection params={params} onChange={onChange} />
                <ParticleSizesSection params={params} onChange={onChange} />
                <MotionDynamicsSection params={params} onChange={onChange} />
            </div>
        </Dialog>
    );
}
