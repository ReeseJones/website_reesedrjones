import { ColorItem } from "../../components/color_item/color_item";
import { SliderRow } from "../../components/slider_row/slider_row";
import { GalaxyParameters } from "../parameters/index";

export interface SectionProps {
    params: GalaxyParameters;
    onChange: (partial: Partial<GalaxyParameters>) => void;
}

/**
 * Settings section controlling chromatic palette channels and nuclear core luminosity boost.
 */
export function ColorsGlowSection({ params, onChange }: SectionProps) {
    return (
        <details open className="settings-section">
            <summary>Colors & Nuclear Glow</summary>
            <div className="section-content">
                <div className="colors-grid">
                    <ColorItem
                        label="Core Bulge"
                        color={params.coreColor}
                        onChange={(color) => onChange({ coreColor: color })}
                    />
                    <ColorItem
                        label="Core Blaze"
                        color={params.coreBlazeColor}
                        onChange={(color) => onChange({ coreBlazeColor: color })}
                    />
                    <ColorItem
                        label="Inner Arms"
                        color={params.armInnerColor}
                        onChange={(color) => onChange({ armInnerColor: color })}
                    />
                    <ColorItem
                        label="Outer Arms"
                        color={params.armOuterColor}
                        onChange={(color) => onChange({ armOuterColor: color })}
                    />
                    <ColorItem
                        label="Interstellar Dust"
                        color={params.accentColor}
                        onChange={(color) => onChange({ accentColor: color })}
                    />
                </div>
                <SliderRow
                    label="Nuclear Core Glow Boost"
                    value={params.coreGlowBoost}
                    min={0.5}
                    max={5.0}
                    step={0.05}
                    onChange={(val) => onChange({ coreGlowBoost: val })}
                />
            </div>
        </details>
    );
}
