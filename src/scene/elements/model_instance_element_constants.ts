import type { Vector3Like } from "../../maths/vector_types";

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
 * Default 3D translation coordinates { x, y, z }.
 */
export const DEFAULT_MODEL_INSTANCE_POSITION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default Euler rotation angles { x: pitch, y: yaw, z: roll } in radians.
 */
export const DEFAULT_MODEL_INSTANCE_ROTATION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default scale factors { x: sx, y: sy, z: sz }.
 */
export const DEFAULT_MODEL_INSTANCE_SCALE: Vector3Like = { x: 1, y: 1, z: 1 };
