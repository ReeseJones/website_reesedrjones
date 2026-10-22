import type { Vector3Like } from "../../maths/vector_types";

/**
 * Custom element HTML tag name for PerspectiveCameraElement.
 */
export const TAG_RJ_PERSPECTIVE_CAMERA = "rj-perspective-camera" as const;

/**
 * Default name for the underlying PerspectiveCamera instance node.
 */
export const DEFAULT_CAMERA_NAME = "PerspectiveCamera" as const;

/**
 * Default camera vertical field of view in degrees.
 */
export const DEFAULT_CAMERA_FOV = 60 as const;

/**
 * Default near clipping plane distance.
 */
export const DEFAULT_CAMERA_NEAR = 0.1 as const;

/**
 * Default far clipping plane distance.
 */
export const DEFAULT_CAMERA_FAR = 1000 as const;

/**
 * Default camera viewport aspect ratio (width / height).
 */
export const DEFAULT_CAMERA_ASPECT = 1.0 as const;

/**
 * Default flag determining whether the camera is appointed as active camera.
 */
export const DEFAULT_CAMERA_MAKE_DEFAULT = false as const;

/**
 * Default visibility flag for the camera scene node.
 */
export const DEFAULT_CAMERA_VISIBLE = true as const;

/**
 * Default 3D translation coordinates { x, y, z }.
 */
export const DEFAULT_CAMERA_POSITION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default Euler rotation angles { x: pitch, y: yaw, z: roll } in radians.
 */
export const DEFAULT_CAMERA_ROTATION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default scale factors { x: sx, y: sy, z: sz }.
 */
export const DEFAULT_CAMERA_SCALE: Vector3Like = { x: 1, y: 1, z: 1 };
