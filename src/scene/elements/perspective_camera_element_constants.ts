import type { Vector3Tuple } from "../../lit/converters/vector3_converter_types";

/**
 * Custom element HTML tag name for PerspectiveCameraElement.
 */
export const TAG_RJ_PERSPECTIVE_CAMERA = "rj-perspective-camera" as const;

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
 * Default 3D translation coordinates [x, y, z].
 */
export const DEFAULT_CAMERA_POSITION: Vector3Tuple = [0, 0, 0];

/**
 * Default Euler rotation angles [pitch, yaw, roll] in radians.
 */
export const DEFAULT_CAMERA_ROTATION: Vector3Tuple = [0, 0, 0];

/**
 * Default scale factors [sx, sy, sz].
 */
export const DEFAULT_CAMERA_SCALE: Vector3Tuple = [1, 1, 1];

/**
 * Component index constants for 3D vector tuples.
 */
export const VECTOR_INDEX_X = 0 as const;
export const VECTOR_INDEX_Y = 1 as const;
export const VECTOR_INDEX_Z = 2 as const;
