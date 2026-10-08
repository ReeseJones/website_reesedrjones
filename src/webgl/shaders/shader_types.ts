import type {
    GalaxyPinprickVertInputs,
    GalaxyPinprickVertUniforms,
    GalaxyPinprickVertOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_pinprick.vert";
import type {
    GalaxyPinprickFragInputs,
    GalaxyPinprickFragUniforms,
    GalaxyPinprickFragOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_pinprick.frag";
import type {
    GalaxyOrbVertInputs,
    GalaxyOrbVertUniforms,
    GalaxyOrbVertOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_orb.vert";
import type {
    GalaxyOrbFragInputs,
    GalaxyOrbFragUniforms,
    GalaxyOrbFragOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_orb.frag";
import type {
    GalacticCloudVertInputs,
    GalacticCloudVertUniforms,
    GalacticCloudVertOutputs,
} from "../../galaxy_backdrop/shaders/galactic_cloud.vert";
import type {
    GalacticCloudFragInputs,
    GalacticCloudFragUniforms,
    GalacticCloudFragOutputs,
} from "../../galaxy_backdrop/shaders/galactic_cloud.frag";
import type {
    MeshStandardVertInputs,
    MeshStandardVertUniforms,
    MeshStandardVertOutputs,
} from "../../scene/shaders/mesh_standard.vert";
import type {
    UnlitFragInputs,
    UnlitFragUniforms,
    UnlitFragOutputs,
} from "../../scene/shaders/unlit.frag";
import type {
    SkyboxVertInputs,
    SkyboxVertUniforms,
    SkyboxVertOutputs,
} from "../../scene/shaders/skybox.vert";
import type {
    SkyboxFragInputs,
    SkyboxFragUniforms,
    SkyboxFragOutputs,
} from "../../scene/shaders/skybox.frag";

/**
 * Canonical arrays of registered vertex and fragment shader keys.
 */
export const VERTEX_SHADER_KEYS = [
    "galaxy_pinprick",
    "galaxy_orb",
    "galactic_cloud",
    "mesh_standard",
    "skybox",
] as const;
export type VertexShaderKey = (typeof VERTEX_SHADER_KEYS)[number];

export const FRAGMENT_SHADER_KEYS = [
    "galaxy_pinprick",
    "galaxy_orb",
    "galactic_cloud",
    "unlit",
    "skybox",
] as const;
export type FragmentShaderKey = (typeof FRAGMENT_SHADER_KEYS)[number];

/**
 * Canonical arrays of registered shader program keys grouped by functional domain.
 */
export const GALAXY_SHADER_KEYS = ["galaxy_pinprick", "galaxy_orb"] as const;
export type GalaxyShaderKey = (typeof GALAXY_SHADER_KEYS)[number];

export const UNLIT_SHADER_KEYS = ["unlit"] as const;
export type UnlitShaderKey = (typeof UNLIT_SHADER_KEYS)[number];

export const SKYBOX_SHADER_KEYS = ["skybox"] as const;
export type SkyboxShaderKey = (typeof SKYBOX_SHADER_KEYS)[number];

export const GENERATIVE_SHADER_KEYS = ["galactic_cloud"] as const;
export type GenerativeShaderKey = (typeof GENERATIVE_SHADER_KEYS)[number];

export type MaterialShaderKey = GalaxyShaderKey | UnlitShaderKey | SkyboxShaderKey | GenerativeShaderKey;

/**
 * Canonical array of all registered shader program keys available in the engine.
 */
export const AVAILABLE_SHADER_KEYS = [
    ...GALAXY_SHADER_KEYS,
    ...UNLIT_SHADER_KEYS,
    ...SKYBOX_SHADER_KEYS,
    ...GENERATIVE_SHADER_KEYS,
] as const;

/**
 * Strongly typed union of valid shader program identifiers.
 * Guarantees materials and renderers only reference registered shader programs.
 */
export type ShaderKey = MaterialShaderKey | GenerativeShaderKey;

/**
 * Mapping table from canonical VertexShaderKey to auto-generated GLSL input attributes layout.
 */
export interface VertexInputMap {
    galaxy_pinprick: GalaxyPinprickVertInputs;
    galaxy_orb: GalaxyOrbVertInputs;
    galactic_cloud: GalacticCloudVertInputs;
    mesh_standard: MeshStandardVertInputs;
    skybox: SkyboxVertInputs;
}

/**
 * Mapping table from canonical VertexShaderKey to auto-generated GLSL uniform interface.
 */
export interface VertexUniformMap {
    galaxy_pinprick: GalaxyPinprickVertUniforms;
    galaxy_orb: GalaxyOrbVertUniforms;
    galactic_cloud: GalacticCloudVertUniforms;
    mesh_standard: MeshStandardVertUniforms;
    skybox: SkyboxVertUniforms;
}

/**
 * Mapping table from canonical FragmentShaderKey to auto-generated GLSL uniform interface.
 */
export interface FragmentUniformMap {
    galaxy_pinprick: GalaxyPinprickFragUniforms;
    galaxy_orb: GalaxyOrbFragUniforms;
    galactic_cloud: GalacticCloudFragUniforms;
    unlit: UnlitFragUniforms;
    skybox: SkyboxFragUniforms;
}

/**
 * Mapping table from canonical VertexShaderKey to auto-generated GLSL output varyings.
 */
export interface VertexOutputMap {
    galaxy_pinprick: GalaxyPinprickVertOutputs;
    galaxy_orb: GalaxyOrbVertOutputs;
    galactic_cloud: GalacticCloudVertOutputs;
    mesh_standard: MeshStandardVertOutputs;
    skybox: SkyboxVertOutputs;
}

/**
 * Mapping table from canonical FragmentShaderKey to auto-generated GLSL input varyings.
 */
export interface FragmentInputMap {
    galaxy_pinprick: GalaxyPinprickFragInputs;
    galaxy_orb: GalaxyOrbFragInputs;
    galactic_cloud: GalacticCloudFragInputs;
    unlit: UnlitFragInputs;
    skybox: SkyboxFragInputs;
}

/**
 * Mapping table from canonical FragmentShaderKey to auto-generated GLSL output render targets.
 */
export interface FragmentOutputMap {
    galaxy_pinprick: GalaxyPinprickFragOutputs;
    galaxy_orb: GalaxyOrbFragOutputs;
    galactic_cloud: GalacticCloudFragOutputs;
    unlit: UnlitFragOutputs;
    skybox: SkyboxFragOutputs;
}

/**
 * Single source of truth for pairing vertex and fragment stages into programs.
 */
export interface ShaderProgramStageMap {
    galaxy_pinprick: { vertex: "galaxy_pinprick"; fragment: "galaxy_pinprick" };
    galaxy_orb: { vertex: "galaxy_orb"; fragment: "galaxy_orb" };
    galactic_cloud: { vertex: "galactic_cloud"; fragment: "galactic_cloud" };
    unlit: { vertex: "mesh_standard"; fragment: "unlit" };
    skybox: { vertex: "skybox"; fragment: "skybox" };
}

/**
 * Resolves the strongly-typed uniform dictionary interface for a given ShaderKey
 * composed from its constituent vertex and fragment shader stages.
 */
export type ShaderUniformsOf<K extends ShaderKey> =
    VertexUniformMap[ShaderProgramStageMap[K]["vertex"]] &
    FragmentUniformMap[ShaderProgramStageMap[K]["fragment"]];

/**
 * Compile-time varying compatibility check:
 * A fragment stage is compatible when every input varying it reads matches a same-typed output varying of the vertex stage.
 */
export type StagesCompatible<V extends VertexShaderKey, F extends FragmentShaderKey> =
    FragmentInputMap[F] extends Pick<VertexOutputMap[V], keyof FragmentInputMap[F] & keyof VertexOutputMap[V]>
        ? (keyof FragmentInputMap[F] extends keyof VertexOutputMap[V] ? true : false)
        : false;

/**
 * Program keys whose stages are incompatible (evaluates to never when all programs are valid).
 */
export type IncompatibleShaderPrograms = {
    [K in ShaderKey]: StagesCompatible<ShaderProgramStageMap[K]["vertex"], ShaderProgramStageMap[K]["fragment"]> extends true
        ? never
        : K;
}[ShaderKey];

/**
 * Type-only compile-time assertion: tsc errors and names the offending program keys if incompatible.
 */
type AssertNoIncompatiblePrograms<T extends never> = T;
export type ShaderStageCompatibilityCheck = AssertNoIncompatiblePrograms<IncompatibleShaderPrograms>;

export interface ShaderStageDef {
    source: string;
    label?: string;
}

export interface ShaderProgramDef<K extends ShaderKey = ShaderKey> {
    vertex: ShaderProgramStageMap[K]["vertex"];
    fragment: ShaderProgramStageMap[K]["fragment"];
    label?: string;
    samplers?: Record<string, number>;
}
