import "./color_item.scss";

import React from "react";
import { hexToRgb, rgbToHex } from "../../helpers/colors";

export interface ColorItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    /**
     * Descriptive label displayed for the color item.
     */
    label: string;

    /**
     * Normalized RGB color triplet where each channel is in the range [0, 1].
     */
    rgb: [number, number, number];

    /**
     * Callback triggered when the user picks a new color, providing the updated normalized RGB triplet.
     */
    onChange: (rgb: [number, number, number]) => void;

    /**
     * Optional HTML attributes forwarded directly to the `<input type="color">` element.
     */
    inputProps?: Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        "type" | "value" | "onChange"
    >;
}

/**
 * Reusable labeled color picker control with interactive color swatch and synchronized uppercase hex readout.
 * Converts between normalized RGB triplet state and native browser hexadecimal color values.
 */
export function ColorItem({
    label,
    rgb,
    onChange,
    inputProps,
    className,
    ...rest
}: ColorItemProps) {
    const hex = rgbToHex(rgb);
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
                    onChange={(e) => onChange(hexToRgb(e.target.value))}
                    {...inputProps}
                />
                <span className="color-hex">{hex.toUpperCase()}</span>
            </div>
        </div>
    );
}
