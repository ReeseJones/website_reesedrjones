import type { Vector3Tuple } from "../../lit/converters/vector3_converter_types";

/**
 * Custom element HTML tag name for Node3DElement.
 */
export const TAG_RJ_NODE_3D = "rj-node-3d" as const;

/**
 * Default node name for Node3DElement.
 */
export const DEFAULT_NODE_3D_NAME = "" as const;

/**
 * Default visibility flag for Node3DElement.
 */
export const DEFAULT_NODE_3D_VISIBLE = true as const;

/**
 * Default 3D translation coordinates [x, y, z].
 */
export const DEFAULT_NODE_3D_POSITION: Vector3Tuple = [0, 0, 0];

/**
 * Default Euler rotation angles [pitch, yaw, roll] in radians.
 */
export const DEFAULT_NODE_3D_ROTATION: Vector3Tuple = [0, 0, 0];

/**
 * Default scale factors [sx, sy, sz].
 */
export const DEFAULT_NODE_3D_SCALE: Vector3Tuple = [1, 1, 1];

/**
 * Component index constants for 3D vector tuples.
 */
export const VECTOR_INDEX_X = 0 as const;
export const VECTOR_INDEX_Y = 1 as const;
export const VECTOR_INDEX_Z = 2 as const;
