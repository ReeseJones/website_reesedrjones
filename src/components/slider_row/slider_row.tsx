import "./slider_row.scss";

import React from "react";

export interface SliderRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    /**
     * Descriptive label displayed for the slider control.
     */
    label: string;

    /**
     * Current numeric value for the range slider.
     */
    value: number;

    /**
     * Minimum allowable value for the range slider.
     */
    min: number;

    /**
     * Maximum allowable value for the range slider.
     */
    max: number;

    /**
     * Step granularity for the range slider.
     */
    step: number;

    /**
     * Optional unit string displayed as a suffix after the formatted value (e.g., "px", "°", " rad/s").
     */
    unit?: string;

    /**
     * Number of decimal places to format the display value when step < 1 (default: 2).
     */
    displayDecimals?: number;

    /**
     * Callback triggered when the slider value is adjusted by user interaction.
     */
    onChange: (val: number) => void;

    /**
     * Optional HTML attributes forwarded directly to the `<input type="range">` element.
     */
    inputProps?: Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        "type" | "min" | "max" | "step" | "value" | "onChange"
    >;
}

/**
 * Reusable labeled range slider component with synchronized numeric readout and unit formatting.
 * Conforms to normal DOM flow and expands to fill parent container width with self-contained styling.
 */
export function SliderRow({
    label,
    value,
    min,
    max,
    step,
    unit = "",
    displayDecimals = 2,
    onChange,
    inputProps,
    className,
    ...rest
}: SliderRowProps) {
    const formatted =
        step >= 1
            ? `${Math.round(value).toLocaleString()}${unit}`
            : `${value.toFixed(displayDecimals)}${unit}`;

    const rootClasses = ["slider-row", "control-row", className].filter(Boolean).join(" ");

    return (
        <div className={rootClasses} {...rest}>
            <div className="label-container">
                <span className="control-label">{label}</span>
                <span className="control-value">{formatted}</span>
            </div>
            <input
                type="range"
                className="slider-input"
                min={min}
                max={max}
                step={step}
                value={value}
                aria-label={inputProps?.["aria-label"] ?? label}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                {...inputProps}
            />
        </div>
    );
}
