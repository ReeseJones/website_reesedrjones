import React from "react";
import { useGalaxy } from "../galaxy_context";
import { SliderRow } from "../../components/slider_row/slider_row";

/**
 * Settings section controlling angular pattern rotation, differential orbital shear, and micro-scintillation drift.
 */
export function MotionDynamicsSection() {
    const { params, updateParameters } = useGalaxy();

    return (
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
                    onChange={(val) => updateParameters({ rotationSpeed: val })}
                />
                <SliderRow
                    label="Differential Orbital Spin"
                    value={params.differentialSpeed}
                    min={0.0}
                    max={0.08}
                    step={0.002}
                    displayDecimals={3}
                    onChange={(val) => updateParameters({ differentialSpeed: val })}
                />
                <SliderRow
                    label="Micro-Drift Speed"
                    value={params.driftSpeed}
                    min={0.0}
                    max={0.5}
                    step={0.01}
                    onChange={(val) => updateParameters({ driftSpeed: val })}
                />
                <SliderRow
                    label="Drift Amplitude"
                    value={params.driftAmplitude}
                    min={0.0}
                    max={0.4}
                    step={0.01}
                    onChange={(val) => updateParameters({ driftAmplitude: val })}
                />
            </div>
        </details>
    );
}
