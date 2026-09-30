/**
 * Convert RGB array with components in [0, 1] to hexadecimal string '#rrggbb'.
 */
export function rgbToHex(rgb: [number, number, number]): string {
    const r = Math.round(Math.min(1, Math.max(0, rgb[0])) * 255)
        .toString(16)
        .padStart(2, "0");
    const g = Math.round(Math.min(1, Math.max(0, rgb[1])) * 255)
        .toString(16)
        .padStart(2, "0");
    const b = Math.round(Math.min(1, Math.max(0, rgb[2])) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${r}${g}${b}`;
}

/**
 * Convert hexadecimal color string ('#rrggbb' or 'rrggbb') to normalized RGB array in [0, 1].
 */
export function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    if (isNaN(bigint)) return [1, 1, 1];
    const r = Number((((bigint >> 16) & 255) / 255).toFixed(3));
    const g = Number((((bigint >> 8) & 255) / 255).toFixed(3));
    const b = Number(((bigint & 255) / 255).toFixed(3));
    return [r, g, b];
}

// Alias to support alternative casing/naming
export const hexToRbg = hexToRgb;
