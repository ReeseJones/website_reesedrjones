import React from "react";
import { useGalaxy } from "../galaxy_context";
import { ColorItem } from "../../components/color_item/color_item";
import { SliderRow } from "../../components/slider_row/slider_row";

/**
 * Settings section controlling chromatic palette channels and nuclear core luminosity boost.
 */
export function ColorsGlowSection() {
    const { params, updateParameters } = useGalaxy();

    return (
        <details open className="settings-section">
            <summary>Colors & Nuclear Glow</summary>
            <div className="section-content">
                <div className="colors-grid">
                    <ColorItem
                        label="Core Bulge"
                        rgb={params.coreColor}
                        onChange={(rgb) => updateParameters({ coreColor: rgb })}
                    />
                    <ColorItem
                        label="Core Blaze"
                        rgb={params.coreBlazeColor}
                        onChange={(rgb) => updateParameters({ coreBlazeColor: rgb })}
                    />
                    <ColorItem
                        label="Inner Arms"
                        rgb={params.armInnerColor}
                        onChange={(rgb) => updateParameters({ armInnerColor: rgb })}
                    />
                    <ColorItem
                        label="Outer Arms"
                        rgb={params.armOuterColor}
                        onChange={(rgb) => updateParameters({ armOuterColor: rgb })}
                    />
                    <ColorItem
                        label="Interstellar Dust"
                        rgb={params.accentColor}
                        onChange={(rgb) => updateParameters({ accentColor: rgb })}
                    />
                </div>
                <SliderRow
                    label="Nuclear Core Glow Boost"
                    value={params.coreGlowBoost}
                    min={0.5}
                    max={5.0}
                    step={0.05}
                    onChange={(val) => updateParameters({ coreGlowBoost: val })}
                />
            </div>
        </details>
    );
}
