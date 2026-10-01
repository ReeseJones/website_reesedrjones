import React from "react";
import { useGalaxy } from "../galaxy_context";
import { SliderRow } from "../../components/slider_row/slider_row";

/**
 * Settings section controlling point sprite scaling, minimum/maximum rasterized diameters, and near-plane fade.
 */
export function ParticleSizesSection() {
    const { params, updateParameters } = useGalaxy();

    return (
        <details open className="settings-section">
            <summary>Point Sizes & Luminosity Scale</summary>
            <div className="section-content">
                <SliderRow
                    label="Base Point Scale Multiplier"
                    value={params.pointScale}
                    min={0.5}
                    max={80.0}
                    step={0.5}
                    onChange={(val) => updateParameters({ pointScale: val })}
                />
                <SliderRow
                    label="Minimum Point Size"
                    value={params.minPointSize}
                    min={0.5}
                    max={8.0}
                    step={0.1}
                    unit="px"
                    onChange={(val) => updateParameters({ minPointSize: val })}
                />
                <SliderRow
                    label="Maximum Point Size"
                    value={params.maxPointSize}
                    min={1.0}
                    max={120.0}
                    step={1.0}
                    unit="px"
                    onChange={(val) => updateParameters({ maxPointSize: val })}
                />
                <SliderRow
                    label="Near Lens Fade Distance"
                    value={params.nearFadeDistance}
                    min={0.2}
                    max={6.0}
                    step={0.1}
                    onChange={(val) => updateParameters({ nearFadeDistance: val })}
                />
            </div>
        </details>
    );
}
