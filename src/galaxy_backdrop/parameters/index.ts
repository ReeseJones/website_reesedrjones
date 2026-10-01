import { GalacticCloudParameters, GalaxyParameters, GalaxyPreset } from "./types";
import { DEFAULT_ORB_PARAMETERS, orbPreset } from "./presets/orb";
import { DEFAULT_PINPRICK_PARAMETERS, pinprickPreset } from "./presets/pinprick";
import { denseCorePreset } from "./presets/dense_core";
import { deepNebulaPreset } from "./presets/deep_nebula";
import { slowMajesticPreset } from "./presets/slow_majestic";
import { MOBILE_GALAXY_PARAMETERS } from "./mobile";

export type { StarRenderStyle, GalacticCloudParameters, GalaxyParameters, GalaxyPreset } from "./types";

export {
    DEFAULT_ORB_PARAMETERS,
    DEFAULT_PINPRICK_PARAMETERS,
    MOBILE_GALAXY_PARAMETERS,
};

// Default active parameters (volumetric orb style active by default)
export const DEFAULT_GALAXY_PARAMETERS: GalaxyParameters = DEFAULT_ORB_PARAMETERS;

export const GALAXY_PRESETS: GalaxyPreset[] = [
    orbPreset,
    pinprickPreset,
    denseCorePreset,
    deepNebulaPreset,
    slowMajesticPreset,
];
