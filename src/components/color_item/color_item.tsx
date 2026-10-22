import "./color_item.scss";

import React from "react";
import type { RgbLike } from "../../helpers/colors_types";
import { hexToRgbLike, rgbLikeToHex, rgbToHex } from "../../helpers/colors";
import type { ColorItemProps } from "./color_item_types";

export type { ColorItemProps } from "./color_item_types";

/**
 * Reusable labeled color picker control with interactive color swatch and synchronized uppercase hex readout.
 * Converts between normalized RgbLike state and native browser hexadecimal color values.
 */
export function ColorItem({
    label,
    color,
    rgb,
    onChange,
    inputProps,
    className,
    ...rest
}: ColorItemProps) {
    const hex = color
        ? rgbLikeToHex(color)
        : rgb
          ? Array.isArray(rgb)
              ? rgbToHex(rgb)
              : rgbLikeToHex(rgb)
          : "#FFFFFF";
    const rootClasses = ["color-item", className].filter(Boolean).join(" ");

    return (
        <div className={rootClasses} {...rest}>
            <span className="color-label">{label}</span>
            <div className="color-input-wrapper">
                <input
                    type="color"
                    className="color-swatch"
                    value={hex}
                    aria-label={inputProps?.["aria-label"] ?? label}
                    onChange={(e) => onChange(hexToRgbLike(e.target.value))}
                    {...inputProps}
                />
                <span className="color-hex">{hex.toUpperCase()}</span>
            </div>
        </div>
    );
}
