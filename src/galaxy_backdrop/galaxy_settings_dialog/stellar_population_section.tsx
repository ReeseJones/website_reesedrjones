import { SliderRow } from "../../components/slider_row/slider_row";
import { GalaxyParameters } from "../parameters/index";

export interface SectionProps {
    params: GalaxyParameters;
    onChange: (partial: Partial<GalaxyParameters>) => void;
}

/**
 * Settings section controlling stellar particle population count, arm winding, density, and disc geometry.
 */
export function StellarPopulationSection({ params, onChange }: SectionProps) {
    return (
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
                    onChange={(val) => onChange({ starCount: val })}
                />
                <SliderRow
                    label="Spiral Arm Count"
                    value={params.armCount}
                    min={1}
                    max={8}
                    step={1}
                    displayDecimals={0}
                    onChange={(val) => onChange({ armCount: val })}
                />
                <SliderRow
                    label="Logarithmic Arm Winding"
                    value={params.armWinding}
                    min={0.1}
                    max={1.5}
                    step={0.02}
                    onChange={(val) => onChange({ armWinding: val })}
                />
                <SliderRow
                    label="Arm Stellar Dispersion"
                    value={params.armDispersion}
                    min={0.05}
                    max={0.8}
                    step={0.01}
                    onChange={(val) => onChange({ armDispersion: val })}
                />
                <SliderRow
                    label="Spur Bridge Frequency"
                    value={params.spurFrequency}
                    min={0.0}
                    max={0.6}
                    step={0.02}
                    onChange={(val) => onChange({ spurFrequency: val })}
                />
                <SliderRow
                    label="Core Density Ratio"
                    value={params.coreDensityRatio}
                    min={0.05}
                    max={0.5}
                    step={0.01}
                    onChange={(val) => onChange({ coreDensityRatio: val })}
                />
                <SliderRow
                    label="Nuclear Core Radius"
                    value={params.coreRadius}
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    onChange={(val) => onChange({ coreRadius: val })}
                />
                <SliderRow
                    label="Galactic Disk Radius"
                    value={params.diskRadius}
                    min={5.0}
                    max={30.0}
                    step={0.5}
                    onChange={(val) => onChange({ diskRadius: val })}
                />
                <SliderRow
                    label="Disk Vertical Thickness"
                    value={params.diskThickness}
                    min={0.2}
                    max={3.0}
                    step={0.05}
                    onChange={(val) => onChange({ diskThickness: val })}
                />
            </div>
        </details>
    );
}
