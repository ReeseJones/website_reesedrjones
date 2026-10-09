import "./fps_counter.scss";
import React, { useRef } from "react";
import { classNameMap } from "../../lib/classNameMap";
import { useWebGLFrame } from "./use_webgl_frame";
import {
    DECIMAL_PLACES,
    DEFAULT_POSITION,
    DEFAULT_UPDATE_INTERVAL_MS,
    FPS_COUNTER_PRIORITY,
    INITIAL_FPS_TEXT,
    MS_PER_SECOND,
    type FpsCounterProps,
} from "./fps_counter_types";

/**
 * Formats average frames-per-second and frame duration into a display string.
 *
 * @param fps Average frames per second.
 * @param frameTimeMs Average frame duration in milliseconds.
 * @returns Human-readable formatted string, e.g. "60 FPS (16.7 ms)".
 */
export function formatFpsText(fps: number, frameTimeMs: number): string {
    if (!Number.isFinite(fps) || !Number.isFinite(frameTimeMs)) {
        return INITIAL_FPS_TEXT;
    }
    return `${Math.round(fps)} FPS (${frameTimeMs.toFixed(DECIMAL_PLACES)} ms)`;
}

/**
 * FPS Counter overlay component for the WebGL canvas subsystem.
 *
 * Listens to canvas animation ticks via `useWebGLFrame` without triggering
 * React Virtual DOM re-renders, updating the text via direct DOM mutation
 * on an inner element ref throttled by `updateIntervalMs`.
 */
export function FpsCounter(props: FpsCounterProps): React.JSX.Element {
    const {
        position = DEFAULT_POSITION,
        updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS,
        priority = FPS_COUNTER_PRIORITY,
        className,
        style,
        ref,
        ...restAttrs
    } = props;

    const displayRef = useRef<HTMLSpanElement>(null);
    const frameCountRef = useRef(0);
    const accumulatedTimeRef = useRef(0);

    const safeIntervalMs = Math.max(updateIntervalMs, 1);
    const intervalSec = safeIntervalMs / MS_PER_SECOND;

    useWebGLFrame(
        (_gl, timeInfo) => {
            frameCountRef.current++;
            accumulatedTimeRef.current += timeInfo.dt;

            if (accumulatedTimeRef.current >= intervalSec) {
                if (frameCountRef.current > 0 && accumulatedTimeRef.current > 0) {
                    const avgFps = frameCountRef.current / accumulatedTimeRef.current;
                    const avgFrameTimeMs =
                        (accumulatedTimeRef.current * MS_PER_SECOND) / frameCountRef.current;

                    if (displayRef.current) {
                        displayRef.current.textContent = formatFpsText(avgFps, avgFrameTimeMs);
                    }
                }

                frameCountRef.current = 0;
                accumulatedTimeRef.current = 0;
            }
        },
        priority
    );

    const classNamesRecord: Record<string, boolean> = {
        "fps-counter": true,
        [`fps-counter--${position}`]: true,
        [position]: true,
    };
    if (className) {
        classNamesRecord[className] = true;
    }
    const classes = classNameMap(classNamesRecord);

    return (
        <div
            ref={ref}
            role="status"
            aria-label="Frame rate"
            aria-live="off"
            className={classes}
            style={style}
            {...restAttrs}
        >
            <span ref={displayRef} className="value">
                {INITIAL_FPS_TEXT}
            </span>
        </div>
    );
}
