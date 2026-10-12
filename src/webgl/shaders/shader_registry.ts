import type {
    VertexShaderKey,
    FragmentShaderKey,
    ShaderKey,
    ShaderStageDef,
    ShaderProgramDef,
} from "./shader_types";
import galaxyPinprickVert from "../../galaxy_backdrop/shaders/galaxy_pinprick.vert";
import galaxyPinprickFrag from "../../galaxy_backdrop/shaders/galaxy_pinprick.frag";
import galaxyOrbVert from "../../galaxy_backdrop/shaders/galaxy_orb.vert";
import galaxyOrbFrag from "../../galaxy_backdrop/shaders/galaxy_orb.frag";
import galacticCloudVert from "../../galaxy_backdrop/shaders/galactic_cloud.vert";
import galacticCloudFrag from "../../galaxy_backdrop/shaders/galactic_cloud.frag";
import meshStandardVert from "../../scene/shaders/mesh_standard.vert";
import unlitFrag from "../../scene/shaders/unlit.frag";
import skyboxVert from "../../scene/shaders/skybox.vert";
import skyboxFrag from "../../scene/shaders/skybox.frag";

export const VERTEX_SHADER_DEFS: Record<VertexShaderKey, ShaderStageDef> = {
    galaxy_pinprick: {
        source: galaxyPinprickVert,
        label: "galaxy_pinprick.vert",
    },
    galaxy_orb: {
        source: galaxyOrbVert,
        label: "galaxy_orb.vert",
    },
    galactic_cloud: {
        source: galacticCloudVert,
        label: "galactic_cloud.vert",
    },
    mesh_standard: {
        source: meshStandardVert,
        label: "mesh_standard.vert",
    },
    skybox: {
        source: skyboxVert,
        label: "skybox.vert",
    },
};

export const FRAGMENT_SHADER_DEFS: Record<FragmentShaderKey, ShaderStageDef> = {
    galaxy_pinprick: {
        source: galaxyPinprickFrag,
        label: "galaxy_pinprick.frag",
    },
    galaxy_orb: {
        source: galaxyOrbFrag,
        label: "galaxy_orb.frag",
    },
    galactic_cloud: {
        source: galacticCloudFrag,
        label: "galactic_cloud.frag",
    },
    unlit: {
        source: unlitFrag,
        label: "unlit.frag",
    },
    skybox: {
        source: skyboxFrag,
        label: "skybox.frag",
    },
};

export const SHADER_PROGRAM_DEFS: { [K in ShaderKey]: ShaderProgramDef<K> } = {
    galaxy_pinprick: {
        vertex: "galaxy_pinprick",
        fragment: "galaxy_pinprick",
        label: "galaxy_pinprick",
    },
    galaxy_orb: {
        vertex: "galaxy_orb",
        fragment: "galaxy_orb",
        label: "galaxy_orb",
    },
    galactic_cloud: {
        vertex: "galactic_cloud",
        fragment: "galactic_cloud",
        label: "galactic_cloud",
    },
    unlit: {
        vertex: "mesh_standard",
        fragment: "unlit",
        label: "unlit",
    },
    skybox: {
        vertex: "skybox",
        fragment: "skybox",
        label: "skybox",
    },
};
