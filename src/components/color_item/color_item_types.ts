import type React from "react";
import type { RgbLike } from "../../helpers/colors_types";

export interface ColorItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "color"> {
    /**
     * Descriptive label displayed for the color item.
     */
    label: string;

    /**
     * Semantic RGB color object where each channel is in the range [0, 1].
     */
    color?: RgbLike;

    /**
     * Normalized RGB color input, supporting either RgbLike or 3-element tuple [r, g, b].
     */
    rgb?: RgbLike | [number, number, number];

    /**
     * Callback triggered when the user picks a new color, providing the updated normalized RgbLike object.
     */
    onChange: (color: RgbLike) => void;

    /**
     * Optional HTML attributes forwarded directly to the `<input type="color">` element.
     */
    inputProps?: Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        "type" | "value" | "onChange"
    >;
}
