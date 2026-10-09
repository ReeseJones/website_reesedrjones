import type React from "react";

/**
 * Screen corner position variants for the FPS counter overlay.
 */
export type FpsCounterPosition =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";

/** Default throttle window in milliseconds before recalculating and updating FPS text. */
export const DEFAULT_UPDATE_INTERVAL_MS = 250;

/** Default screen corner position for the overlay. */
export const DEFAULT_POSITION: FpsCounterPosition = "top-left";

/** Default subscriber priority in the WebGL render pipeline (telemetry observer). */
export const FPS_COUNTER_PRIORITY = 100;

/** Conversion factor from seconds to milliseconds. */
export const MS_PER_SECOND = 1000;

/** Decimal precision for frame duration in milliseconds. */
export const DECIMAL_PLACES = 1;

/** Initial text content rendered before the first interval tick finishes. */
export const INITIAL_FPS_TEXT = "-- FPS (-- ms)";

/**
 * Props for the FpsCounter component.
 */
export interface FpsCounterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "ref"> {
    /** Screen corner position for the overlay counter. Defaults to "top-left". */
    position?: FpsCounterPosition;
    /** Throttle window in milliseconds for recalculating and updating display. Defaults to 250. */
    updateIntervalMs?: number;
    /** Subscriber priority within the WebGL render loop. Defaults to 100. */
    priority?: number;
    /** Optional additional CSS class name(s). */
    className?: string;
    /** Optional inline styles applied to the root element. */
    style?: React.CSSProperties;
    /** React 19 direct ref to the outer container DOM element. */
    ref?: React.Ref<HTMLDivElement>;
}
