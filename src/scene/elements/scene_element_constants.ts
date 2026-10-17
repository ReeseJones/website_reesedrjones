/**
 * HTML custom element tag name for the root scene Web Component.
 */
export const TAG_RJ_SCENE = "rj-scene" as const;

/**
 * Default pass execution priority in the WebGL canvas compositor pipeline.
 * Matches DEFAULT_SCENE_PASS_PRIORITY from src/scene/react/scene_react_constants.ts.
 */
export const DEFAULT_SCENE_PASS_PRIORITY = 10 as const;

/**
 * Default flag indicating whether depth buffer should be cleared before rendering the scene pass.
 */
export const DEFAULT_SCENE_CLEAR_DEPTH = true as const;

/**
 * Default debug name assigned to the underlying programmatic root Scene instance.
 */
export const DEFAULT_SCENE_ROOT_NAME = "SceneRoot" as const;
