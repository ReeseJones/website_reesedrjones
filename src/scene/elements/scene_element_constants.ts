/**
 * HTML custom element tag name for the root scene Web Component.
 */
export const TAG_RJ_SCENE = "rj-scene";

/**
 * Custom event name dispatched whenever the active scene camera changes.
 */
export const EVENT_ACTIVE_CAMERA_CHANGED = "scene-camera-changed";

/**
 * Custom event name dispatched when a scene graph node attaches to the DOM hierarchy.
 */
export const EVENT_SCENE_NODE_ATTACHED = "scene-node-attached";

/**
 * Custom event name dispatched when a scene graph node detaches from the DOM hierarchy.
 */
export const EVENT_SCENE_NODE_DETACHED = "scene-node-detached";

/**
 * Default pass execution priority in the WebGL canvas compositor pipeline.
 * Matches DEFAULT_SCENE_PASS_PRIORITY from src/scene/react/scene_react_constants.ts.
 */
export const DEFAULT_SCENE_PASS_PRIORITY = 10;

/**
 * Default flag indicating whether depth buffer should be cleared before rendering the scene pass.
 */
export const DEFAULT_SCENE_CLEAR_DEPTH = true;

/**
 * HTML attribute name corresponding to the priority reactive property.
 */
export const ATTR_PRIORITY = "priority";

/**
 * HTML attribute name corresponding to the clearDepth reactive property.
 */
export const ATTR_CLEAR_DEPTH = "clear-depth";

/**
 * Default debug name assigned to the underlying programmatic root Scene instance.
 */
export const DEFAULT_SCENE_ROOT_NAME = "SceneRoot";
