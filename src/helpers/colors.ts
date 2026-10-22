import type {
    NormalizedRgbTuple,
    NormalizedRgbaTuple,
    RgbLike,
    RgbaLike,
} from "./colors_types";

export const COLOR_MIN = 0;
export const COLOR_MAX = 1;
export const HEX_BYTE_MAX = 255;
export const HEX_RADIX = 16;
export const HEX_BYTE_PAD_LENGTH = 2;
export const HEX_PAD_CHAR = "0";
export const DEFAULT_OPAQUE_ALPHA = 1.0;
export const DEFAULT_FALLBACK_RGBA: NormalizedRgbaTuple = [0, 0, 0, 1];
export const DEFAULT_FALLBACK_RGB: NormalizedRgbTuple = [1, 1, 1];
export const DEFAULT_FALLBACK_RGB_LIKE: RgbLike = { r: 1, g: 1, b: 1 };
export const DEFAULT_FALLBACK_RGBA_LIKE: RgbaLike = { r: 0, g: 0, b: 0, a: 1 };

export const HEX_SHORT_RGB_LENGTH = 3;
export const HEX_SHORT_RGBA_LENGTH = 4;
export const HEX_FULL_RGB_LENGTH = 6;
export const HEX_FULL_RGBA_LENGTH = 8;
export const MIN_FLOAT_PARTS_LENGTH = 3;
export const FULL_FLOAT_PARTS_LENGTH = 4;
export const RGBA_TUPLE_LENGTH = 4;
export const RGB_TUPLE_LENGTH = 3;
export const RGB_DECIMAL_PRECISION = 3;

/**
 * Convert RGB array with components in [0, 1] to hexadecimal string '#rrggbb'.
 */
export function rgbToHex(rgb: NormalizedRgbTuple | readonly [number, number, number]): string {
    const r = Math.round(Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgb[0])) * HEX_BYTE_MAX)
        .toString(HEX_RADIX)
        .padStart(HEX_BYTE_PAD_LENGTH, HEX_PAD_CHAR);
    const g = Math.round(Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgb[1])) * HEX_BYTE_MAX)
        .toString(HEX_RADIX)
        .padStart(HEX_BYTE_PAD_LENGTH, HEX_PAD_CHAR);
    const b = Math.round(Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgb[2])) * HEX_BYTE_MAX)
        .toString(HEX_RADIX)
        .padStart(HEX_BYTE_PAD_LENGTH, HEX_PAD_CHAR);
    return `#${r}${g}${b}`;
}

/**
 * Convert hexadecimal color string ('#rrggbb' or 'rrggbb') to normalized RGB array in [0, 1].
 */
export function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, HEX_RADIX);
    if (isNaN(bigint)) return [1, 1, 1];
    const r = Number((((bigint >> 16) & HEX_BYTE_MAX) / HEX_BYTE_MAX).toFixed(RGB_DECIMAL_PRECISION));
    const g = Number((((bigint >> 8) & HEX_BYTE_MAX) / HEX_BYTE_MAX).toFixed(RGB_DECIMAL_PRECISION));
    const b = Number(((bigint & HEX_BYTE_MAX) / HEX_BYTE_MAX).toFixed(RGB_DECIMAL_PRECISION));
    return [r, g, b];
}

function parseComponent(part: string | undefined, defaultVal: number): number {
    if (part === undefined) {
        return defaultVal;
    }
    const parsed = Number.parseFloat(part);
    if (!Number.isFinite(parsed)) {
        return defaultVal;
    }
    return Math.min(COLOR_MAX, Math.max(COLOR_MIN, parsed));
}

/**
 * Parses color strings (#rgb, #rgba, #rrggbb, #rrggbbaa, or space/comma-delimited floats)
 * into a normalized RGBA tuple [r, g, b, a] with components clamped to [0, 1].
 */
export function parseRgbaColor(value: string | null): NormalizedRgbaTuple {
    if (!value || typeof value !== "string") {
        return DEFAULT_FALLBACK_RGBA;
    }

    const trimmed = value.trim().toLowerCase();

    if (trimmed.startsWith("#")) {
        const hex = trimmed.slice(1);
        if (hex.length === HEX_SHORT_RGB_LENGTH || hex.length === HEX_SHORT_RGBA_LENGTH) {
            const r = Number.parseInt(hex[0] + hex[0], HEX_RADIX) / HEX_BYTE_MAX;
            const g = Number.parseInt(hex[1] + hex[1], HEX_RADIX) / HEX_BYTE_MAX;
            const b = Number.parseInt(hex[2] + hex[2], HEX_RADIX) / HEX_BYTE_MAX;
            const a =
                hex.length === HEX_SHORT_RGBA_LENGTH
                    ? Number.parseInt(hex[3] + hex[3], HEX_RADIX) / HEX_BYTE_MAX
                    : DEFAULT_OPAQUE_ALPHA;

            if (
                Number.isFinite(r) &&
                Number.isFinite(g) &&
                Number.isFinite(b) &&
                Number.isFinite(a)
            ) {
                return [
                    Math.min(COLOR_MAX, Math.max(COLOR_MIN, r)),
                    Math.min(COLOR_MAX, Math.max(COLOR_MIN, g)),
                    Math.min(COLOR_MAX, Math.max(COLOR_MIN, b)),
                    Math.min(COLOR_MAX, Math.max(COLOR_MIN, a)),
                ];
            }
            return DEFAULT_FALLBACK_RGBA;
        }

        if (hex.length === HEX_FULL_RGB_LENGTH || hex.length === HEX_FULL_RGBA_LENGTH) {
            const r = Number.parseInt(hex.slice(0, 2), HEX_RADIX) / HEX_BYTE_MAX;
            const g = Number.parseInt(hex.slice(2, 4), HEX_RADIX) / HEX_BYTE_MAX;
            const b = Number.parseInt(hex.slice(4, 6), HEX_RADIX) / HEX_BYTE_MAX;
            const a =
                hex.length === HEX_FULL_RGBA_LENGTH
                    ? Number.parseInt(hex.slice(6, 8), HEX_RADIX) / HEX_BYTE_MAX
                    : DEFAULT_OPAQUE_ALPHA;

            if (
                Number.isFinite(r) &&
                Number.isFinite(g) &&
                Number.isFinite(b) &&
                Number.isFinite(a)
            ) {
                return [
                    Math.min(COLOR_MAX, Math.max(COLOR_MIN, r)),
                    Math.min(COLOR_MAX, Math.max(COLOR_MIN, g)),
                    Math.min(COLOR_MAX, Math.max(COLOR_MIN, b)),
                    Math.min(COLOR_MAX, Math.max(COLOR_MIN, a)),
                ];
            }
            return DEFAULT_FALLBACK_RGBA;
        }

        return DEFAULT_FALLBACK_RGBA;
    }

    const parts = trimmed.split(/[\s,]+/);
    if (parts.length >= MIN_FLOAT_PARTS_LENGTH) {
        const r = parseComponent(parts[0], COLOR_MIN);
        const g = parseComponent(parts[1], COLOR_MIN);
        const b = parseComponent(parts[2], COLOR_MIN);
        const a =
            parts.length >= FULL_FLOAT_PARTS_LENGTH
                ? parseComponent(parts[3], DEFAULT_OPAQUE_ALPHA)
                : DEFAULT_OPAQUE_ALPHA;

        return [r, g, b, a];
    }

    return DEFAULT_FALLBACK_RGBA;
}

/**
 * Converts a normalized RGBA tuple [r, g, b, a] into a hexadecimal color string
 * ('#rrggbb' if alpha is 1, or '#rrggbbaa' if alpha < 1).
 */
export function rgbaToHex(rgba: NormalizedRgbaTuple): string | null {
    if (!rgba || !Array.isArray(rgba) || rgba.length < RGBA_TUPLE_LENGTH) {
        return null;
    }

    if (!rgba.every((component) => typeof component === "number" && Number.isFinite(component))) {
        return null;
    }

    const toHexByte = (val: number): string => {
        const clamped = Math.min(HEX_BYTE_MAX, Math.max(COLOR_MIN, Math.round(val * HEX_BYTE_MAX)));
        return clamped.toString(HEX_RADIX).padStart(HEX_BYTE_PAD_LENGTH, HEX_PAD_CHAR);
    };

    const hex = `#${toHexByte(rgba[0])}${toHexByte(rgba[1])}${toHexByte(rgba[2])}`;
    return rgba[3] < COLOR_MAX ? `${hex}${toHexByte(rgba[3])}` : hex;
}

/**
 * Converts an RgbLike object into a normalized RGB tuple [r, g, b].
 */
export function rgbLikeToTuple(rgb: RgbLike): NormalizedRgbTuple {
    if (!rgb || typeof rgb !== "object") {
        return DEFAULT_FALLBACK_RGB;
    }
    const r = typeof rgb.r === "number" && Number.isFinite(rgb.r)
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgb.r))
        : 1;
    const g = typeof rgb.g === "number" && Number.isFinite(rgb.g)
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgb.g))
        : 1;
    const b = typeof rgb.b === "number" && Number.isFinite(rgb.b)
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgb.b))
        : 1;
    return [r, g, b];
}

/**
 * Converts an RgbaLike object into a normalized RGBA tuple [r, g, b, a].
 */
export function rgbaLikeToTuple(rgba: RgbaLike): NormalizedRgbaTuple {
    if (!rgba || typeof rgba !== "object") {
        return DEFAULT_FALLBACK_RGBA;
    }
    const r = typeof rgba.r === "number" && Number.isFinite(rgba.r)
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgba.r))
        : 0;
    const g = typeof rgba.g === "number" && Number.isFinite(rgba.g)
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgba.g))
        : 0;
    const b = typeof rgba.b === "number" && Number.isFinite(rgba.b)
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgba.b))
        : 0;
    const a = typeof rgba.a === "number" && Number.isFinite(rgba.a)
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, rgba.a))
        : DEFAULT_OPAQUE_ALPHA;
    return [r, g, b, a];
}

/**
 * Converts a normalized RGB tuple into an RgbLike object.
 */
export function tupleToRgbLike(tuple: NormalizedRgbTuple | readonly [number, number, number]): RgbLike {
    if (!tuple || !Array.isArray(tuple) || tuple.length < RGB_TUPLE_LENGTH) {
        return { ...DEFAULT_FALLBACK_RGB_LIKE };
    }
    const r = typeof tuple[0] === "number" && Number.isFinite(tuple[0])
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, tuple[0]))
        : 1;
    const g = typeof tuple[1] === "number" && Number.isFinite(tuple[1])
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, tuple[1]))
        : 1;
    const b = typeof tuple[2] === "number" && Number.isFinite(tuple[2])
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, tuple[2]))
        : 1;
    return { r, g, b };
}

/**
 * Converts a normalized RGBA tuple into an RgbaLike object.
 */
export function tupleToRgbaLike(tuple: NormalizedRgbaTuple | readonly [number, number, number, number]): RgbaLike {
    if (!tuple || !Array.isArray(tuple) || tuple.length < RGBA_TUPLE_LENGTH) {
        return { ...DEFAULT_FALLBACK_RGBA_LIKE };
    }
    const r = typeof tuple[0] === "number" && Number.isFinite(tuple[0])
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, tuple[0]))
        : 0;
    const g = typeof tuple[1] === "number" && Number.isFinite(tuple[1])
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, tuple[1]))
        : 0;
    const b = typeof tuple[2] === "number" && Number.isFinite(tuple[2])
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, tuple[2]))
        : 0;
    const a = typeof tuple[3] === "number" && Number.isFinite(tuple[3])
        ? Math.min(COLOR_MAX, Math.max(COLOR_MIN, tuple[3]))
        : DEFAULT_OPAQUE_ALPHA;
    return { r, g, b, a };
}

/**
 * Converts an RgbLike object into a hexadecimal string '#rrggbb'.
 */
export function rgbLikeToHex(rgb: RgbLike): string {
    const tuple = rgbLikeToTuple(rgb);
    return rgbToHex(tuple);
}

/**
 * Converts an RgbaLike object into a hexadecimal string ('#rrggbb' if opaque, '#rrggbbaa' otherwise).
 */
export function rgbaLikeToHex(rgba: RgbaLike): string {
    const tuple = rgbaLikeToTuple(rgba);
    const toHexByte = (val: number): string => {
        const clamped = Math.min(HEX_BYTE_MAX, Math.max(COLOR_MIN, Math.round(val * HEX_BYTE_MAX)));
        return clamped.toString(HEX_RADIX).padStart(HEX_BYTE_PAD_LENGTH, HEX_PAD_CHAR);
    };

    const hex = `#${toHexByte(tuple[0])}${toHexByte(tuple[1])}${toHexByte(tuple[2])}`;
    return tuple[3] < COLOR_MAX ? `${hex}${toHexByte(tuple[3])}` : hex;
}

/**
 * Converts a hexadecimal string ('#rrggbb', 'rrggbb', or short '#rgb') to an RgbLike object.
 */
export function hexToRgbLike(hex: string): RgbLike {
    if (!hex || typeof hex !== "string") {
        return { ...DEFAULT_FALLBACK_RGB_LIKE };
    }
    let clean = hex.trim().replace(/^#/, "");
    if (clean.length === HEX_SHORT_RGB_LENGTH) {
        clean = `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
    }
    if (clean.length !== HEX_FULL_RGB_LENGTH || !/^[0-9a-fA-F]{6}$/.test(clean)) {
        return { ...DEFAULT_FALLBACK_RGB_LIKE };
    }
    const bigint = parseInt(clean, HEX_RADIX);
    if (isNaN(bigint)) {
        return { ...DEFAULT_FALLBACK_RGB_LIKE };
    }
    const r = Number((((bigint >> 16) & HEX_BYTE_MAX) / HEX_BYTE_MAX).toFixed(RGB_DECIMAL_PRECISION));
    const g = Number((((bigint >> 8) & HEX_BYTE_MAX) / HEX_BYTE_MAX).toFixed(RGB_DECIMAL_PRECISION));
    const b = Number(((bigint & HEX_BYTE_MAX) / HEX_BYTE_MAX).toFixed(RGB_DECIMAL_PRECISION));
    return { r, g, b };
}

/**
 * Converts a hexadecimal color string or float color string into an RgbaLike object.
 */
export function hexToRgbaLike(hex: string | null): RgbaLike {
    if (!hex || typeof hex !== "string") {
        return { ...DEFAULT_FALLBACK_RGBA_LIKE };
    }
    const trimmed = hex.trim();
    let tuple = parseRgbaColor(trimmed);
    if (tuple === DEFAULT_FALLBACK_RGBA && !trimmed.startsWith("#")) {
        tuple = parseRgbaColor(`#${trimmed}`);
    }
    return {
        r: tuple[0],
        g: tuple[1],
        b: tuple[2],
        a: tuple[3],
    };
}
