import React from "react";
import { useGalaxy } from "../galaxy_context";
import { SliderRow } from "../../components/slider_row/slider_row";

/**
 * Settings section controlling camera vantage offset, distance, field of view, 3D rotations, and parallax.
 */
export function CameraPerspectiveSection() {
    const { params, updateParameters } = useGalaxy();

    return (
        <details open className="settings-section">
            <summary>Camera & Perspective</summary>
            <div className="section-content">
                <SliderRow
                    label="Horizontal Offset (Eye Space X)"
                    value={params.centerOffsetX}
                    min={-15}
                    max={15}
                    step={0.2}
                    onChange={(val) => updateParameters({ centerOffsetX: val })}
                />
                <SliderRow
                    label="Vertical Offset (Eye Space Y)"
                    value={params.centerOffsetY}
                    min={-10}
                    max={10}
                    step={0.2}
                    onChange={(val) => updateParameters({ centerOffsetY: val })}
                />
                <SliderRow
                    label="Camera Vantage Distance"
                    value={params.cameraDistance}
                    min={5}
                    max={40}
                    step={0.5}
                    onChange={(val) => updateParameters({ cameraDistance: val })}
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
                    onChange={(val) => updateParameters({ pitchAngle: val })}
                />
                <SliderRow
                    label="Yaw Angle (Azimuth)"
                    value={params.yawAngle}
                    min={-3.14}
                    max={3.14}
                    step={0.02}
                    unit=" rad"
                    onChange={(val) => updateParameters({ yawAngle: val })}
                />
                <SliderRow
                    label="Roll Angle"
                    value={params.rollAngle}
                    min={-1.5}
                    max={1.5}
                    step={0.01}
                    unit=" rad"
                    onChange={(val) => updateParameters({ rollAngle: val })}
                />
                <SliderRow
                    label="Pointer Parallax Sensitivity"
                    value={params.mouseSensitivity}
                    min={0}
                    max={1.2}
                    step={0.05}
                    onChange={(val) => updateParameters({ mouseSensitivity: val })}
                />
            </div>
        </details>
    );
}
