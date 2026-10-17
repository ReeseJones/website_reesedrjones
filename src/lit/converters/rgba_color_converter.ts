import type { ComplexAttributeConverter } from "lit";
import type { NormalizedRgbaTuple } from "../../helpers/colors_types";
import { parseRgbaColor, rgbaToHex } from "../../helpers/colors";

/**
 * Lit ComplexAttributeConverter translating between HTML color attribute strings (#rgb, #rgba,
 * #rrggbb, #rrggbbaa, or space/comma-delimited floats) and normalized WebGL [r, g, b, a] tuples.
 */
export const rgbaColorConverter = {
    fromAttribute: parseRgbaColor,
    toAttribute: rgbaToHex,
} satisfies ComplexAttributeConverter<NormalizedRgbaTuple>;
