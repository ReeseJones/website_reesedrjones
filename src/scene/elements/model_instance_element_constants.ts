import type { Vector3Tuple } from "../../lit/converters/vector3_converter_types";

/**
 * Custom element HTML tag name for ModelInstanceElement.
 */
export const TAG_RJ_MODEL_INSTANCE = "rj-model-instance" as const;

/**
 * Default node name for ModelInstanceElement.
 */
export const DEFAULT_MODEL_INSTANCE_NAME = "ModelInstance" as const;

/**
 * Default visibility flag for ModelInstanceElement.
 */
export const DEFAULT_MODEL_INSTANCE_VISIBLE = true as const;

/**
 * Default render queue priority order for ModelInstanceElement.
 */
export const DEFAULT_MODEL_INSTANCE_RENDER_ORDER = 0 as const;

/**
 * Default 3D translation coordinates [x, y, z].
 */
export const DEFAULT_MODEL_INSTANCE_POSITION: Vector3Tuple = [0, 0, 0];

/**
 * Default Euler rotation angles [pitch, yaw, roll] in radians.
 */
export const DEFAULT_MODEL_INSTANCE_ROTATION: Vector3Tuple = [0, 0, 0];

/**
 * Default scale factors [sx, sy, sz].
 */
export const DEFAULT_MODEL_INSTANCE_SCALE: Vector3Tuple = [1, 1, 1];

/**
 * Component index constants for 3D vector tuples.
 */
export const VECTOR_INDEX_X = 0 as const;
export const VECTOR_INDEX_Y = 1 as const;
export const VECTOR_INDEX_Z = 2 as const;
