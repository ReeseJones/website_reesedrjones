import type { Vector2Like, Vector3Like } from "../../maths/vector_types";
import { BillboardMode, SpriteSizeMode } from "../sprites/sprite_instance_types";
import {
    DEFAULT_PIN_ANCHOR_X,
    DEFAULT_PIN_ANCHOR_Y,
    DEFAULT_SPRITE_SIZE_X,
    DEFAULT_SPRITE_SIZE_Y,
    DEFAULT_SPRITE_RENDER_ORDER,
} from "../sprites/sprite_constants";

/**
 * Custom element HTML tag name for SpriteInstanceElement.
 */
export const TAG_RJ_SPRITE_INSTANCE = "rj-sprite-instance" as const;

/**
 * Default node name for SpriteInstanceElement.
 */
export const DEFAULT_SPRITE_INSTANCE_NAME = "SpriteInstance" as const;

/**
 * Default hidden flag for SpriteInstanceElement (visible by default).
 */
export const DEFAULT_SPRITE_INSTANCE_HIDDEN = false as const;

/**
 * Default render queue priority order for SpriteInstanceElement.
 */
export const DEFAULT_SPRITE_INSTANCE_RENDER_ORDER = DEFAULT_SPRITE_RENDER_ORDER;

/**
 * Default 3D translation coordinates { x, y, z }.
 */
export const DEFAULT_SPRITE_INSTANCE_POSITION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default Euler rotation angles { x: pitch, y: yaw, z: roll } in radians.
 */
export const DEFAULT_SPRITE_INSTANCE_ROTATION: Vector3Like = { x: 0, y: 0, z: 0 };

/**
 * Default scale factors { x: sx, y: sy, z: sz }.
 */
export const DEFAULT_SPRITE_INSTANCE_SCALE: Vector3Like = { x: 1, y: 1, z: 1 };

/**
 * Default normalized 2D anchor point { x, y }.
 */
export const DEFAULT_SPRITE_INSTANCE_ANCHOR: Vector2Like = {
    x: DEFAULT_PIN_ANCHOR_X,
    y: DEFAULT_PIN_ANCHOR_Y,
};

/**
 * Default sprite dimensions { x: width, y: height }.
 */
export const DEFAULT_SPRITE_INSTANCE_SIZE: Vector2Like = {
    x: DEFAULT_SPRITE_SIZE_X,
    y: DEFAULT_SPRITE_SIZE_Y,
};

/**
 * Default sizing mode.
 */
export const DEFAULT_SPRITE_INSTANCE_SIZE_MODE = SpriteSizeMode.ScreenSpace;

/**
 * Default billboarding constraint.
 */
export const DEFAULT_SPRITE_INSTANCE_BILLBOARD_MODE = BillboardMode.Spherical;
