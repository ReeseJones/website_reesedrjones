import type { NormalizedRgbTuple, NormalizedRgbaTuple } from "./colors_types";

export const COLOR_MIN = 0;
export const COLOR_MAX = 1;
export const HEX_BYTE_MAX = 255;
export const HEX_RADIX = 16;
export const HEX_BYTE_PAD_LENGTH = 2;
export const HEX_PAD_CHAR = "0";
export const DEFAULT_OPAQUE_ALPHA = 1.0;
export const DEFAULT_FALLBACK_RGBA: NormalizedRgbaTuple = [0, 0, 0, 1];
export const DEFAULT_FALLBACK_RGB: NormalizedRgbTuple = [1, 1, 1];

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
