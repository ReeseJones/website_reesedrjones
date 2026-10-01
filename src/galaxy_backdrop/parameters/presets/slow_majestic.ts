import { GalaxyPreset } from "../types";
import { DEFAULT_PINPRICK_PARAMETERS } from "./pinprick";

export const slowMajesticPreset: GalaxyPreset = {
    id: "slow_majestic",
    name: "Slow Majestic Spiral",
    params: {
        ...DEFAULT_PINPRICK_PARAMETERS,
        rotationSpeed: -0.018,
        armWinding: 0.65,
        spurFrequency: 0.28,
        driftSpeed: 0.10,
    },
};
