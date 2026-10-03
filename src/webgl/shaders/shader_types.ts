/**
 * Canonical array of all registered shader program keys available in the engine.
 */
export const AVAILABLE_SHADER_KEYS = [
    "galaxy_pinprick",
    "galaxy_orb",
    "galactic_cloud",
    "unlit",
    "skybox",
] as const;

/**
 * Strongly typed union of valid shader program identifiers.
 * Guarantees materials and renderers only reference registered shader programs.
 */
export type ShaderKey = (typeof AVAILABLE_SHADER_KEYS)[number];
