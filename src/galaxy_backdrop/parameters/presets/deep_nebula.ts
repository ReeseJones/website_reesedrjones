import { GalaxyPreset } from "../types";
import { DEFAULT_ORB_PARAMETERS } from "./orb";

export const deepNebulaPreset: GalaxyPreset = {
    id: "deep_nebula",
    name: "Deep Interstellar Nebula",
    params: {
        ...DEFAULT_ORB_PARAMETERS,
        accentColor: [0.85, 0.18, 0.78],
        armInnerColor: [0.15, 0.95, 0.88],
        armOuterColor: [0.08, 0.22, 0.88],
        coreBlazeColor: [1.0, 0.95, 0.75],
        pointScale: 48.0,
    },
};
