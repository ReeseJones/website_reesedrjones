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
                        rgb={params.coreColor}
                        onChange={(rgb) => onChange({ coreColor: rgb })}
                    />
                    <ColorItem
                        label="Core Blaze"
                        rgb={params.coreBlazeColor}
                        onChange={(rgb) => onChange({ coreBlazeColor: rgb })}
                    />
                    <ColorItem
                        label="Inner Arms"
                        rgb={params.armInnerColor}
                        onChange={(rgb) => onChange({ armInnerColor: rgb })}
                    />
                    <ColorItem
                        label="Outer Arms"
                        rgb={params.armOuterColor}
                        onChange={(rgb) => onChange({ armOuterColor: rgb })}
                    />
                    <ColorItem
                        label="Interstellar Dust"
                        rgb={params.accentColor}
                        onChange={(rgb) => onChange({ accentColor: rgb })}
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
