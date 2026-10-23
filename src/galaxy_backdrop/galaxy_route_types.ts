import type { Vector3Like } from "../maths/vector_types";

/**
 * Configuration options for generating a procedural galactic navigation wavy half-arc route.
 */
export interface GalacticArcRouteOptions {
    /** Starting distance from galactic origin (default: 0.0) */
    startRadius?: number;

    /** Target radius reached at the outer perimeter (default: 4.2) */
    outerRadius?: number;

    /** Total angle swept by the half arc in radians (default: ~1.05 * PI, ~189 degrees) */
    arcAngleSpan?: number;

    /** Vertical galactic disc wave amplitude (default: 0.15) */
    heightAmplitude?: number;

    /** Total subdivision segment count along the route (default: 40) */
    totalSegments?: number;

    /** Frequency of wavy radial oscillations along the arc (default: 3.0) */
    waveFrequency?: number;

    /** Amplitude of wavy radial oscillations along the arc (default: 0.25) */
    waveAmplitude?: number;
}

/**
 * Generated wavy half-arc route and key navigational waypoints along the route.
 */
export interface GalacticArcRouteResult {
    /** Continuous array of 3D route coordinates */
    points: readonly Vector3Like[];

    /** Navigation waypoint at the core origin */
    startWaypoint: Vector3Like;

    /** Terminus navigation waypoint on the outer galactic rim */
    endWaypoint: Vector3Like;
}
