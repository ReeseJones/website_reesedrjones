/* Auto-generated shader stage registry types. Do not edit directly. */

import type {
    GalacticCloudVertInputs,
    GalacticCloudVertUniforms,
    GalacticCloudVertOutputs,
} from "../../galaxy_backdrop/shaders/galactic_cloud.vert";
import type {
    GalaxyOrbVertInputs,
    GalaxyOrbVertUniforms,
    GalaxyOrbVertOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_orb.vert";
import type {
    GalaxyPinprickVertInputs,
    GalaxyPinprickVertUniforms,
    GalaxyPinprickVertOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_pinprick.vert";
import type {
    MeshStandardVertInputs,
    MeshStandardVertUniforms,
    MeshStandardVertOutputs,
} from "../../scene/shaders/mesh_standard.vert";
import type {
    SkyboxVertInputs,
    SkyboxVertUniforms,
    SkyboxVertOutputs,
} from "../../scene/shaders/skybox.vert";
import type {
    GalacticCloudFragInputs,
    GalacticCloudFragUniforms,
    GalacticCloudFragOutputs,
} from "../../galaxy_backdrop/shaders/galactic_cloud.frag";
import type {
    GalaxyOrbFragInputs,
    GalaxyOrbFragUniforms,
    GalaxyOrbFragOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_orb.frag";
import type {
    GalaxyPinprickFragInputs,
    GalaxyPinprickFragUniforms,
    GalaxyPinprickFragOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_pinprick.frag";
import type {
    SkyboxFragInputs,
    SkyboxFragUniforms,
    SkyboxFragOutputs,
} from "../../scene/shaders/skybox.frag";
import type {
    UnlitFragInputs,
    UnlitFragUniforms,
    UnlitFragOutputs,
} from "../../scene/shaders/unlit.frag";

export const VERTEX_SHADER_KEYS = [
    "galactic_cloud",
    "galaxy_orb",
    "galaxy_pinprick",
    "mesh_standard",
    "skybox",
] as const;
export type VertexShaderKey = (typeof VERTEX_SHADER_KEYS)[number];

export const FRAGMENT_SHADER_KEYS = [
    "galactic_cloud",
    "galaxy_orb",
    "galaxy_pinprick",
    "skybox",
    "unlit",
] as const;
export type FragmentShaderKey = (typeof FRAGMENT_SHADER_KEYS)[number];

export interface VertexInputMap {
    galactic_cloud: GalacticCloudVertInputs;
    galaxy_orb: GalaxyOrbVertInputs;
    galaxy_pinprick: GalaxyPinprickVertInputs;
    mesh_standard: MeshStandardVertInputs;
    skybox: SkyboxVertInputs;
}

export interface VertexUniformMap {
    galactic_cloud: GalacticCloudVertUniforms;
    galaxy_orb: GalaxyOrbVertUniforms;
    galaxy_pinprick: GalaxyPinprickVertUniforms;
    mesh_standard: MeshStandardVertUniforms;
    skybox: SkyboxVertUniforms;
}

export interface VertexOutputMap {
    galactic_cloud: GalacticCloudVertOutputs;
    galaxy_orb: GalaxyOrbVertOutputs;
    galaxy_pinprick: GalaxyPinprickVertOutputs;
    mesh_standard: MeshStandardVertOutputs;
    skybox: SkyboxVertOutputs;
}

export interface FragmentInputMap {
    galactic_cloud: GalacticCloudFragInputs;
    galaxy_orb: GalaxyOrbFragInputs;
    galaxy_pinprick: GalaxyPinprickFragInputs;
    skybox: SkyboxFragInputs;
    unlit: UnlitFragInputs;
}

export interface FragmentUniformMap {
    galactic_cloud: GalacticCloudFragUniforms;
    galaxy_orb: GalaxyOrbFragUniforms;
    galaxy_pinprick: GalaxyPinprickFragUniforms;
    skybox: SkyboxFragUniforms;
    unlit: UnlitFragUniforms;
}

export interface FragmentOutputMap {
    galactic_cloud: GalacticCloudFragOutputs;
    galaxy_orb: GalaxyOrbFragOutputs;
    galaxy_pinprick: GalaxyPinprickFragOutputs;
    skybox: SkyboxFragOutputs;
    unlit: UnlitFragOutputs;
}
