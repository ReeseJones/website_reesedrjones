import type { Vector3Like } from "../maths/vector_types";
import type {
    GalacticArcRouteOptions,
    GalacticArcRouteResult,
} from "./galaxy_route_types";

export const DEFAULT_ARC_START_RADIUS = 0.0;
export const DEFAULT_ARC_OUTER_RADIUS = 4.2;
export const DEFAULT_ARC_ANGLE_SPAN = Math.PI * 1.05;
export const DEFAULT_ARC_HEIGHT_AMPLITUDE = 0.15;
export const DEFAULT_ARC_TOTAL_SEGMENTS = 40;
export const DEFAULT_ARC_WAVE_FREQUENCY = 3.0;
export const DEFAULT_ARC_WAVE_AMPLITUDE = 0.25;

const VERTICAL_WAVE_MULTIPLIER = 2.0;
const ANGULAR_WAVE_FACTOR = 0.15;
const ANGULAR_WAVE_FREQUENCY = 2.0;
const COORD_ROUNDING = 1000;

function roundCoord(val: number): number {
    return Math.round(val * COORD_ROUNDING) / COORD_ROUNDING;
}

/**
 * Generates an open, non-self-intersecting wavy half-arc galactic navigation route.
 * Sweeps gracefully across the galaxy disc from the origin core to the outer perimeter
 * with organic radial and vertical undulations.
 */
export function generateGalacticArcRoute(
    options?: GalacticArcRouteOptions
): GalacticArcRouteResult {
    const startRadius = options?.startRadius ?? DEFAULT_ARC_START_RADIUS;
    const outerRadius = options?.outerRadius ?? DEFAULT_ARC_OUTER_RADIUS;
    const arcAngleSpan = options?.arcAngleSpan ?? DEFAULT_ARC_ANGLE_SPAN;
    const heightAmplitude = options?.heightAmplitude ?? DEFAULT_ARC_HEIGHT_AMPLITUDE;
    const totalSegments = options?.totalSegments ?? DEFAULT_ARC_TOTAL_SEGMENTS;
    const waveFrequency = options?.waveFrequency ?? DEFAULT_ARC_WAVE_FREQUENCY;
    const waveAmplitude = options?.waveAmplitude ?? DEFAULT_ARC_WAVE_AMPLITUDE;

    const points: Vector3Like[] = [];

    for (let i = 0; i <= totalSegments; i++) {
        const t = i / totalSegments;
        const baseAngle = t * arcAngleSpan;

        // Smooth cosine ease-in-out radial growth from startRadius to outerRadius
        const baseR = startRadius + (outerRadius - startRadius) * (0.5 - 0.5 * Math.cos(t * Math.PI));

        // Smooth wave dampener ensures pin anchors at t = 0 and t = 1 remain exact
        const waveDampener = Math.sin(t * Math.PI);
        const r = baseR + waveAmplitude * Math.sin(t * Math.PI * waveFrequency) * waveDampener;

        // Organic angular ripple and vertical disc undulation
        const angle = baseAngle + ANGULAR_WAVE_FACTOR * Math.sin(t * Math.PI * ANGULAR_WAVE_FREQUENCY);
        const y = heightAmplitude * Math.sin(baseAngle * VERTICAL_WAVE_MULTIPLIER);

        points.push({
            x: roundCoord(r * Math.cos(angle)),
            y: roundCoord(y),
            z: roundCoord(r * Math.sin(angle)),
        });
    }

    return {
        points,
        startWaypoint: points[0],
        endWaypoint: points[points.length - 1],
    };
}
