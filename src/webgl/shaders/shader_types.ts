/**
 * Canonical arrays of registered shader program keys grouped by functional domain.
 */
export const GALAXY_SHADER_KEYS = ["galaxy_pinprick", "galaxy_orb"] as const;
export type GalaxyShaderKey = (typeof GALAXY_SHADER_KEYS)[number];

export const UNLIT_SHADER_KEYS = ["unlit"] as const;
export type UnlitShaderKey = (typeof UNLIT_SHADER_KEYS)[number];

export const SKYBOX_SHADER_KEYS = ["skybox"] as const;
export type SkyboxShaderKey = (typeof SKYBOX_SHADER_KEYS)[number];

export type MaterialShaderKey = GalaxyShaderKey | UnlitShaderKey | SkyboxShaderKey;

export const GENERATIVE_SHADER_KEYS = ["galactic_cloud"] as const;
export type GenerativeShaderKey = (typeof GENERATIVE_SHADER_KEYS)[number];

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
