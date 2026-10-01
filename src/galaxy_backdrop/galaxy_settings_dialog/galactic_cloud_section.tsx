import { ColorItem } from "../../components/color_item/color_item";
import { SliderRow } from "../../components/slider_row/slider_row";
import { GalaxyParameters } from "../parameters/index";

export interface SectionProps {
    params: GalaxyParameters;
    onChange: (partial: Partial<GalaxyParameters>) => void;
}

/**
 * Settings section controlling the infinite celestial horizon plane background options.
 */
export function GalacticCloudSection({ params, onChange }: SectionProps) {
    return (
        <details open className="settings-section">
            <summary>Celestial Horizon Plane</summary>
            <div className="section-content">
                <div className="checkbox-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                        <input
                            type="checkbox"
                            checked={params.cloudEnabled ?? true}
                            onChange={(e) => onChange({ cloudEnabled: e.target.checked })}
                        />
                        Enable Celestial Horizon Line
                    </label>
                </div>

                <SliderRow
                    label="Horizon Line Intensity"
                    value={params.horizonIntensity ?? 0.85}
                    min={0.0}
                    max={2.0}
                    step={0.05}
                    onChange={(val) => onChange({ horizonIntensity: val })}
                />

                <SliderRow
                    label="Horizon Band Thickness"
                    value={params.horizonThickness ?? 0.22}
                    min={0.05}
                    max={1.0}
                    step={0.01}
                    onChange={(val) => onChange({ horizonThickness: val })}
                />

                <SliderRow
                    label="Infinity Parallax Scale"
                    value={params.cloudParallaxFactor ?? 0.25}
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    onChange={(val) => onChange({ cloudParallaxFactor: val })}
                />

                <div className="colors-grid" style={{ marginTop: "0.75rem" }}>
                    <ColorItem
                        label="Center Line Color"
                        rgb={params.horizonColorCenter ?? [1.0, 0.84, 0.66]}
                        onChange={(rgb) => onChange({ horizonColorCenter: rgb })}
                    />
                    <ColorItem
                        label="Outer Band Color"
                        rgb={params.horizonColorOuter ?? [0.15, 0.25, 0.85]}
                        onChange={(rgb) => onChange({ horizonColorOuter: rgb })}
                    />
                </div>
            </div>
        </details>
    );
}
