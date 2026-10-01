import { GalaxyParameters } from "../parameters/index";

export interface SectionProps {
    params: GalaxyParameters;
    onChange: (partial: Partial<GalaxyParameters>) => void;
}

/**
 * Settings section for selecting the star rendering style (crystalline pin-prick vs. volumetric orb bokeh).
 */
export function RenderStyleSection({ params, onChange }: SectionProps) {
    return (
        <details open className="settings-section">
            <summary>Render Style</summary>
            <div className="section-content">
                <div className="style-toggle-row">
                    <button
                        type="button"
                        className={params.style === "pinprick" ? "active" : ""}
                        onClick={() => onChange({ style: "pinprick" })}
                    >
                        Pin-prick (Crystalline)
                    </button>
                    <button
                        type="button"
                        className={params.style === "orb" ? "active" : ""}
                        onClick={() => onChange({ style: "orb" })}
                    >
                        Volumetric Orb Bokeh
                    </button>
                </div>
            </div>
        </details>
    );
}
