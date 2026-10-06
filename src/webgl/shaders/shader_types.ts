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

import type { GalaxyPinprickUniforms } from "../../galaxy_backdrop/shaders/galaxy_pinprick.frag";
import type { GalaxyOrbUniforms } from "../../galaxy_backdrop/shaders/galaxy_orb.frag";
import type { GalacticCloudUniforms } from "../../galaxy_backdrop/shaders/galactic_cloud.frag";
import type { UnlitUniforms } from "../../scene/shaders/unlit.frag";
import type { SkyboxUniforms } from "../../scene/shaders/skybox.frag";

/**
 * Mapping table from canonical ShaderKey to auto-generated GLSL uniform interface.
 */
export interface ShaderUniformMap {
    galaxy_pinprick: GalaxyPinprickUniforms;
    galaxy_orb: GalaxyOrbUniforms;
    galactic_cloud: GalacticCloudUniforms;
    unlit: UnlitUniforms;
    skybox: SkyboxUniforms;
}

/**
 * Resolves the strongly-typed uniform dictionary interface for a given ShaderKey.
 */
export type ShaderUniformsOf<K extends ShaderKey> = K extends keyof ShaderUniformMap
    ? ShaderUniformMap[K]
    : Record<string, unknown>;
