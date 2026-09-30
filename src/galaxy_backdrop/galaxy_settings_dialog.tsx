import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGalaxy } from "./galaxy_context";
import { GALAXY_PRESETS, GalaxyParameters } from "./galaxy_parameters";
import { hexToRgb, rgbToHex } from "../helpers/colors";
import { GearIcon } from "../components/icons/gear_icon";
import "./galaxy_settings_dialog.scss";

interface SliderRowProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    displayDecimals?: number;
    onChange: (val: number) => void;
}

function SliderRow({
    label,
    value,
    min,
    max,
    step,
    unit = "",
    displayDecimals = 2,
    onChange,
}: SliderRowProps) {
    const formatted =
        step >= 1
            ? `${Math.round(value).toLocaleString()}${unit}`
            : `${value.toFixed(displayDecimals)}${unit}`;

    return (
        <div className="control-row">
            <div className="label-container">
                <span className="control-label">{label}</span>
                <span className="control-value">{formatted}</span>
            </div>
            <input
                type="range"
                className="slider-input"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
            />
        </div>
    );
}

interface ColorItemProps {
    label: string;
    rgb: [number, number, number];
    onChange: (rgb: [number, number, number]) => void;
}

function ColorItem({ label, rgb, onChange }: ColorItemProps) {
    const hex = rgbToHex(rgb);
    return (
        <div className="color-item">
            <span className="color-label">{label}</span>
            <div className="color-input-wrapper">
                <input
                    type="color"
                    className="color-swatch"
                    value={hex}
                    onChange={(e) => onChange(hexToRgb(e.target.value))}
                />
                <span className="color-hex">{hex.toUpperCase()}</span>
            </div>
        </div>
    );
}

export function GalaxySettingsDialog() {
    const {
        params,
        updateParameters,
        resetParameters,
        applyPreset,
        currentPresetId,
        isSettingsOpen,
        closeSettings,
    } = useGalaxy();

    const dialogRef = useRef<HTMLDialogElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isSettingsOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else {
            if (dialog.open) {
                dialog.close();
            }
        }
    }, [isSettingsOpen]);

    const handleCopyJson = useCallback(() => {
        navigator.clipboard.writeText(JSON.stringify(params, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [params]);

    return (
        <dialog
            ref={dialogRef}
            className="galaxy-settings-dialog"
            onClose={closeSettings}
            onClick={closeSettings}
        >
            <div
                className="dialog-content"
                onClick={(e) => e.stopPropagation()}
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
                    {/* 1. Style & Mode */}
                    <details open className="settings-section">
                        <summary>Render Style</summary>
                        <div className="section-content">
                            <div className="style-toggle-row">
                                <button
                                    type="button"
                                    className={
                                        params.style === "pinprick" ? "active" : ""
                                    }
                                    onClick={() =>
                                        updateParameters({ style: "pinprick" })
                                    }
                                >
                                    Pin-prick (Crystalline)
                                </button>
                                <button
                                    type="button"
                                    className={
                                        params.style === "orb" ? "active" : ""
                                    }
                                    onClick={() => updateParameters({ style: "orb" })}
                                >
                                    Volumetric Orb Bokeh
                                </button>
                            </div>
                        </div>
                    </details>

                    {/* 2. Position & Camera */}
                    <details open className="settings-section">
                        <summary>Camera & Perspective</summary>
                        <div className="section-content">
                            <SliderRow
                                label="Horizontal Offset (Eye Space X)"
                                value={params.centerOffsetX}
                                min={-15}
                                max={15}
                                step={0.2}
                                onChange={(val) =>
                                    updateParameters({ centerOffsetX: val })
                                }
                            />
                            <SliderRow
                                label="Vertical Offset (Eye Space Y)"
                                value={params.centerOffsetY}
                                min={-10}
                                max={10}
                                step={0.2}
                                onChange={(val) =>
                                    updateParameters({ centerOffsetY: val })
                                }
                            />
                            <SliderRow
                                label="Camera Vantage Distance"
                                value={params.cameraDistance}
                                min={5}
                                max={40}
                                step={0.5}
                                onChange={(val) =>
                                    updateParameters({ cameraDistance: val })
                                }
                            />
                            <SliderRow
                                label="Field of View (FOV)"
                                value={params.fov}
                                min={30}
                                max={110}
                                step={1}
                                unit="°"
                                displayDecimals={0}
                                onChange={(val) => updateParameters({ fov: val })}
                            />
                            <SliderRow
                                label="Pitch Cant (Grazing Tilt)"
                                value={params.pitchAngle}
                                min={-1.5}
                                max={1.5}
                                step={0.01}
                                unit=" rad"
                                onChange={(val) =>
                                    updateParameters({ pitchAngle: val })
                                }
                            />
                            <SliderRow
                                label="Yaw Angle (Azimuth)"
                                value={params.yawAngle}
                                min={-3.14}
                                max={3.14}
                                step={0.02}
                                unit=" rad"
                                onChange={(val) =>
                                    updateParameters({ yawAngle: val })
                                }
                            />
                            <SliderRow
                                label="Roll Angle"
                                value={params.rollAngle}
                                min={-1.5}
                                max={1.5}
                                step={0.01}
                                unit=" rad"
                                onChange={(val) =>
                                    updateParameters({ rollAngle: val })
                                }
                            />
                            <SliderRow
                                label="Pointer Parallax Sensitivity"
                                value={params.mouseSensitivity}
                                min={0}
                                max={1.2}
                                step={0.05}
                                onChange={(val) =>
                                    updateParameters({ mouseSensitivity: val })
                                }
                            />
                        </div>
                    </details>

                    {/* 3. Stellar Population */}
                    <details open className="settings-section">
                        <summary>Stellar Population & Spiral Arms</summary>
                        <div className="section-content">
                            <SliderRow
                                label="Total Star Count"
                                value={params.starCount}
                                min={20000}
                                max={500000}
                                step={10000}
                                displayDecimals={0}
                                onChange={(val) =>
                                    updateParameters({ starCount: val })
                                }
                            />
                            <SliderRow
                                label="Spiral Arm Count"
                                value={params.armCount}
                                min={1}
                                max={8}
                                step={1}
                                displayDecimals={0}
                                onChange={(val) =>
                                    updateParameters({ armCount: val })
                                }
                            />
                            <SliderRow
                                label="Logarithmic Arm Winding"
                                value={params.armWinding}
                                min={0.1}
                                max={1.5}
                                step={0.02}
                                onChange={(val) =>
                                    updateParameters({ armWinding: val })
                                }
                            />
                            <SliderRow
                                label="Arm Stellar Dispersion"
                                value={params.armDispersion}
                                min={0.05}
                                max={0.8}
                                step={0.01}
                                onChange={(val) =>
                                    updateParameters({ armDispersion: val })
                                }
                            />
                            <SliderRow
                                label="Spur Bridge Frequency"
                                value={params.spurFrequency}
                                min={0.0}
                                max={0.6}
                                step={0.02}
                                onChange={(val) =>
                                    updateParameters({ spurFrequency: val })
                                }
                            />
                            <SliderRow
                                label="Core Density Ratio"
                                value={params.coreDensityRatio}
                                min={0.05}
                                max={0.5}
                                step={0.01}
                                onChange={(val) =>
                                    updateParameters({ coreDensityRatio: val })
                                }
                            />
                            <SliderRow
                                label="Nuclear Core Radius"
                                value={params.coreRadius}
                                min={0.5}
                                max={5.0}
                                step={0.1}
                                onChange={(val) =>
                                    updateParameters({ coreRadius: val })
                                }
                            />
                            <SliderRow
                                label="Galactic Disk Radius"
                                value={params.diskRadius}
                                min={5.0}
                                max={30.0}
                                step={0.5}
                                onChange={(val) =>
                                    updateParameters({ diskRadius: val })
                                }
                            />
                            <SliderRow
                                label="Disk Vertical Thickness"
                                value={params.diskThickness}
                                min={0.2}
                                max={3.0}
                                step={0.05}
                                onChange={(val) =>
                                    updateParameters({ diskThickness: val })
                                }
                            />
                        </div>
                    </details>

                    {/* 4. Colors & Glow */}
                    <details open className="settings-section">
                        <summary>Colors & Nuclear Glow</summary>
                        <div className="section-content">
                            <div className="colors-grid">
                                <ColorItem
                                    label="Core Bulge"
                                    rgb={params.coreColor}
                                    onChange={(rgb) =>
                                        updateParameters({ coreColor: rgb })
                                    }
                                />
                                <ColorItem
                                    label="Core Blaze"
                                    rgb={params.coreBlazeColor}
                                    onChange={(rgb) =>
                                        updateParameters({ coreBlazeColor: rgb })
                                    }
                                />
                                <ColorItem
                                    label="Inner Arms"
                                    rgb={params.armInnerColor}
                                    onChange={(rgb) =>
                                        updateParameters({ armInnerColor: rgb })
                                    }
                                />
                                <ColorItem
                                    label="Outer Arms"
                                    rgb={params.armOuterColor}
                                    onChange={(rgb) =>
                                        updateParameters({ armOuterColor: rgb })
                                    }
                                />
                                <ColorItem
                                    label="Interstellar Dust"
                                    rgb={params.accentColor}
                                    onChange={(rgb) =>
                                        updateParameters({ accentColor: rgb })
                                    }
                                />
                            </div>
                            <SliderRow
                                label="Nuclear Core Glow Boost"
                                value={params.coreGlowBoost}
                                min={0.5}
                                max={5.0}
                                step={0.05}
                                onChange={(val) =>
                                    updateParameters({ coreGlowBoost: val })
                                }
                            />
                        </div>
                    </details>

                    {/* 5. Particle Sizes */}
                    <details open className="settings-section">
                        <summary>Point Sizes & Luminosity Scale</summary>
                        <div className="section-content">
                            <SliderRow
                                label="Base Point Scale Multiplier"
                                value={params.pointScale}
                                min={0.5}
                                max={80.0}
                                step={0.5}
                                onChange={(val) =>
                                    updateParameters({ pointScale: val })
                                }
                            />
                            <SliderRow
                                label="Minimum Point Size"
                                value={params.minPointSize}
                                min={0.5}
                                max={8.0}
                                step={0.1}
                                unit="px"
                                onChange={(val) =>
                                    updateParameters({ minPointSize: val })
                                }
                            />
                            <SliderRow
                                label="Maximum Point Size"
                                value={params.maxPointSize}
                                min={1.0}
                                max={120.0}
                                step={1.0}
                                unit="px"
                                onChange={(val) =>
                                    updateParameters({ maxPointSize: val })
                                }
                            />
                            <SliderRow
                                label="Near Lens Fade Distance"
                                value={params.nearFadeDistance}
                                min={0.2}
                                max={6.0}
                                step={0.1}
                                onChange={(val) =>
                                    updateParameters({ nearFadeDistance: val })
                                }
                            />
                        </div>
                    </details>

                    {/* 6. Motion & Dynamics */}
                    <details open className="settings-section">
                        <summary>Motion & Dynamics</summary>
                        <div className="section-content">
                            <SliderRow
                                label="Galactic Rotation Speed"
                                value={params.rotationSpeed}
                                min={-0.15}
                                max={0.15}
                                step={0.005}
                                unit=" rad/s"
                                displayDecimals={3}
                                onChange={(val) =>
                                    updateParameters({ rotationSpeed: val })
                                }
                            />
                            <SliderRow
                                label="Differential Orbital Spin"
                                value={params.differentialSpeed}
                                min={0.0}
                                max={0.08}
                                step={0.002}
                                displayDecimals={3}
                                onChange={(val) =>
                                    updateParameters({ differentialSpeed: val })
                                }
                            />
                            <SliderRow
                                label="Micro-Drift Speed"
                                value={params.driftSpeed}
                                min={0.0}
                                max={0.5}
                                step={0.01}
                                onChange={(val) =>
                                    updateParameters({ driftSpeed: val })
                                }
                            />
                            <SliderRow
                                label="Drift Amplitude"
                                value={params.driftAmplitude}
                                min={0.0}
                                max={0.4}
                                step={0.01}
                                onChange={(val) =>
                                    updateParameters({ driftAmplitude: val })
                                }
                            />
                        </div>
                    </details>
                </div>
            </div>
        </dialog>
    );
}
