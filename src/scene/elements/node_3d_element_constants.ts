import type { Vector3Like } from "../../maths/vector_types";

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
 * Default 3D translation coordinates { x, y, z }.
 */
export const DEFAULT_NODE_3D_POSITION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default Euler rotation angles { x: pitch, y: yaw, z: roll } in radians.
 */
export const DEFAULT_NODE_3D_ROTATION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default scale factors { x: sx, y: sy, z: sz }.
 */
export const DEFAULT_NODE_3D_SCALE: Vector3Like = { x: 1, y: 1, z: 1 };
