import type { Vector3Like } from "../../maths/vector_types";
import type { RgbaLike } from "../../helpers/colors_types";
import {
    DEFAULT_POLYLINE_WIDTH,
    DEFAULT_POLYLINE_MITER_LIMIT,
    DEFAULT_POLYLINE_COLOR,
    DEFAULT_POLYLINE_GLOW_COLOR,
    DEFAULT_POLYLINE_GLOW_INTENSITY,
    DEFAULT_POLYLINE_DASH_SPEED,
    DEFAULT_POLYLINE_DASH_FREQUENCY,
    DEFAULT_POLYLINE_RENDER_ORDER,
} from "../lines/polyline_constants";

/**
 * Custom element HTML tag name for PolylineInstanceElement.
 */
export const TAG_RJ_POLYLINE = "rj-polyline" as const;

/**
 * Default node name for PolylineInstanceElement.
 */
export const DEFAULT_POLYLINE_NAME = "Polyline" as const;

/**
 * Default hidden flag for PolylineInstanceElement (visible by default).
 */
export const DEFAULT_POLYLINE_HIDDEN = false as const;

/**
 * Default render queue priority order for PolylineInstanceElement.
 */
export const DEFAULT_POLYLINE_ELEMENT_RENDER_ORDER = DEFAULT_POLYLINE_RENDER_ORDER;

/**
 * Default 3D translation coordinates { x, y, z }.
 */
export const DEFAULT_POLYLINE_ELEMENT_POSITION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default Euler rotation angles { x: pitch, y: yaw, z: roll } in radians.
 */
export const DEFAULT_POLYLINE_ELEMENT_ROTATION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default scale factors { x: sx, y: sy, z: sz }.
 */
export const DEFAULT_POLYLINE_ELEMENT_SCALE: Vector3Like = { x: 1, y: 1, z: 1 };

/**
 * Default empty route waypoints sequence.
 */
export const DEFAULT_POLYLINE_ELEMENT_POINTS: readonly Vector3Like[] = [];

export const DEFAULT_POLYLINE_ELEMENT_WIDTH = DEFAULT_POLYLINE_WIDTH;
export const DEFAULT_POLYLINE_ELEMENT_MITER_LIMIT = DEFAULT_POLYLINE_MITER_LIMIT;
export const DEFAULT_POLYLINE_ELEMENT_COLOR: RgbaLike = DEFAULT_POLYLINE_COLOR;
export const DEFAULT_POLYLINE_ELEMENT_GLOW_COLOR: RgbaLike = DEFAULT_POLYLINE_GLOW_COLOR;
export const DEFAULT_POLYLINE_ELEMENT_GLOW_INTENSITY = DEFAULT_POLYLINE_GLOW_INTENSITY;
export const DEFAULT_POLYLINE_ELEMENT_DASH_SPEED = DEFAULT_POLYLINE_DASH_SPEED;
export const DEFAULT_POLYLINE_ELEMENT_DASH_FREQUENCY = DEFAULT_POLYLINE_DASH_FREQUENCY;
