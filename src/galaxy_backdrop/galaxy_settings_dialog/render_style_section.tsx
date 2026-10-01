import React from "react";
import { useGalaxy } from "../galaxy_context";

/**
 * Settings section for selecting the star rendering style (crystalline pin-prick vs. volumetric orb bokeh).
 */
export function RenderStyleSection() {
    const { params, updateParameters } = useGalaxy();

    return (
        <details open className="settings-section">
            <summary>Render Style</summary>
            <div className="section-content">
                <div className="style-toggle-row">
                    <button
                        type="button"
                        className={params.style === "pinprick" ? "active" : ""}
                        onClick={() => updateParameters({ style: "pinprick" })}
                    >
                        Pin-prick (Crystalline)
                    </button>
                    <button
                        type="button"
                        className={params.style === "orb" ? "active" : ""}
                        onClick={() => updateParameters({ style: "orb" })}
                    >
                        Volumetric Orb Bokeh
                    </button>
                </div>
            </div>
        </details>
    );
}
