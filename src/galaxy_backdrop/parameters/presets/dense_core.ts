import { GalaxyPreset } from "../types";
import { DEFAULT_PINPRICK_PARAMETERS } from "./pinprick";

export const denseCorePreset: GalaxyPreset = {
    id: "dense_core",
    name: "Hyper-Dense Nucleus",
    params: {
        ...DEFAULT_PINPRICK_PARAMETERS,
        starCount: 380000,
        coreDensityRatio: 0.30,
        coreGlowBoost: 2.0,
        rotationSpeed: -0.055,
    },
};
