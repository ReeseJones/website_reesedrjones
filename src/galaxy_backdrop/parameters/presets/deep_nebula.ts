import { GalaxyPreset } from "../types";
import { DEFAULT_ORB_PARAMETERS } from "./orb";

export const deepNebulaPreset: GalaxyPreset = {
    id: "deep_nebula",
    name: "Deep Interstellar Nebula",
    params: {
        ...DEFAULT_ORB_PARAMETERS,
        accentColor: { r: 0.85, g: 0.18, b: 0.78 },
        armInnerColor: { r: 0.15, g: 0.95, b: 0.88 },
        armOuterColor: { r: 0.08, g: 0.22, b: 0.88 },
        coreBlazeColor: { r: 1.0, g: 0.95, b: 0.75 },
        pointScale: 48.0,
    },
};
