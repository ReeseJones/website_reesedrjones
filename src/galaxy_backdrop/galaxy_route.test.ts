import { describe, it, expect } from "vitest";
import {
    generateGalacticArcRoute,
    DEFAULT_ARC_TOTAL_SEGMENTS,
    DEFAULT_ARC_OUTER_RADIUS,
    DEFAULT_ARC_START_RADIUS,
} from "./galaxy_route";

describe("generateGalacticArcRoute()", () => {
    it("generates a non-looping wavy half arc with expected segment count", () => {
        const result = generateGalacticArcRoute();

        expect(result.points.length).toBe(DEFAULT_ARC_TOTAL_SEGMENTS + 1);
        expect(result.startWaypoint).toEqual({
            x: DEFAULT_ARC_START_RADIUS,
            y: 0,
            z: 0,
        });

        // The end waypoint reaches the outer galaxy perimeter
        const endDist = Math.hypot(result.endWaypoint.x, result.endWaypoint.z);
        expect(endDist).toBeCloseTo(DEFAULT_ARC_OUTER_RADIUS, 1);
    });

    it("respects custom radius, segments, and wave options", () => {
        const result = generateGalacticArcRoute({
            startRadius: 0.2,
            outerRadius: 5.0,
            totalSegments: 20,
            heightAmplitude: 0.3,
            waveFrequency: 2.0,
            waveAmplitude: 0.1,
        });

        expect(result.points.length).toBe(21);
        expect(result.startWaypoint.x).toBeCloseTo(0.2, 2);

        const endDist = Math.hypot(result.endWaypoint.x, result.endWaypoint.z);
        expect(endDist).toBeCloseTo(5.0, 1);
    });

    it("produces finite coordinates that never loop back to origin", () => {
        const result = generateGalacticArcRoute();

        for (const pt of result.points) {
            expect(Number.isFinite(pt.x)).toBe(true);
            expect(Number.isFinite(pt.y)).toBe(true);
            expect(Number.isFinite(pt.z)).toBe(true);
        }

        // Distance from start to end must be substantial (not looping back to origin)
        const dx = result.endWaypoint.x - result.startWaypoint.x;
        const dy = result.endWaypoint.y - result.startWaypoint.y;
        const dz = result.endWaypoint.z - result.startWaypoint.z;
        const totalSpan = Math.hypot(dx, dy, dz);

        expect(totalSpan).toBeGreaterThan(DEFAULT_ARC_OUTER_RADIUS * 0.9);
    });
});
