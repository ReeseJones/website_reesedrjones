import type { ComplexAttributeConverter } from "lit";
import type { RgbaLike } from "../../helpers/colors_types";
import { hexToRgbaLike, rgbaLikeToHex } from "../../helpers/colors";

/**
 * Lit ComplexAttributeConverter translating between HTML color attribute strings (#rgb, #rgba,
 * #rrggbb, #rrggbbaa, or space/comma-delimited floats) and normalized WebGL RgbaLike objects ({ r, g, b, a }).
 */
export const rgbaColorConverter = {
    fromAttribute: hexToRgbaLike,
    toAttribute: rgbaLikeToHex,
} satisfies ComplexAttributeConverter<RgbaLike>;
