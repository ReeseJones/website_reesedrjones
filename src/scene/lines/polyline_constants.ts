import type { RgbaLike } from "../../helpers/colors_types";

/**
 * Standard configuration constants and defaults for screen-space polyline ribbon routes.
 */

export const DEFAULT_POLYLINE_WIDTH = 4.0;
export const DEFAULT_POLYLINE_MITER_LIMIT = 3.0;

export const DEFAULT_POLYLINE_COLOR_R = 0.1;
export const DEFAULT_POLYLINE_COLOR_G = 0.4;
export const DEFAULT_POLYLINE_COLOR_B = 1.0;
export const DEFAULT_POLYLINE_COLOR_A = 1.0;

export const DEFAULT_POLYLINE_COLOR: RgbaLike = {
    r: DEFAULT_POLYLINE_COLOR_R,
    g: DEFAULT_POLYLINE_COLOR_G,
    b: DEFAULT_POLYLINE_COLOR_B,
    a: DEFAULT_POLYLINE_COLOR_A,
};

export const DEFAULT_POLYLINE_GLOW_R = 0.8;
export const DEFAULT_POLYLINE_GLOW_G = 0.95;
export const DEFAULT_POLYLINE_GLOW_B = 1.0;
export const DEFAULT_POLYLINE_GLOW_A = 1.0;

export const DEFAULT_POLYLINE_GLOW_COLOR: RgbaLike = {
    r: DEFAULT_POLYLINE_GLOW_R,
    g: DEFAULT_POLYLINE_GLOW_G,
    b: DEFAULT_POLYLINE_GLOW_B,
    a: DEFAULT_POLYLINE_GLOW_A,
};

export const DEFAULT_POLYLINE_GLOW_INTENSITY = 1.0;
export const DEFAULT_POLYLINE_DASH_SPEED = 0.0;
export const DEFAULT_POLYLINE_DASH_FREQUENCY = 0.1;
export const DEFAULT_POLYLINE_NEAR_EPSILON = 0.001;
export const DEFAULT_POLYLINE_RENDER_ORDER = 2000;

export const POLYLINE_FLOATS_PER_VERTEX = 11;
export const POLYLINE_STRIDE_BYTES = 44;
export const POLYLINE_POSITION_COMPONENTS = 3;
export const POLYLINE_SIDE_PROGRESS_COMPONENTS = 2;
export const POLYLINE_INDICES_PER_SEGMENT = 6;
export const POLYLINE_VERTICES_PER_POINT = 2;
export const POLYLINE_SIDE_POSITIVE = 1.0;
export const POLYLINE_SIDE_NEGATIVE = -1.0;
export const MIN_POLYLINE_POINTS = 2;
export const POLYLINE_EPSILON = 0.0001;
