import { describe, it, expect } from "vitest";
import {
    calculateAutoFarPlane,
    generateStarBuffer,
    DEFAULT_FAR_PLANE_PADDING,
} from "./galaxy_math";
import { DEFAULT_ORB_PARAMETERS } from "./parameters/presets/orb";

describe("galaxy_math", () => {
    describe("calculateAutoFarPlane()", () => {
        it("returns the calculated depth when cameraDistance + diskRadius + padding exceeds minFarPlane", () => {
            const cameraDistance = 80;
            const diskRadius = 30;
            const minFarPlane = 75;
            const expected = cameraDistance + diskRadius + DEFAULT_FAR_PLANE_PADDING; // 80 + 30 + 50 = 160

            const result = calculateAutoFarPlane(cameraDistance, diskRadius, minFarPlane);

            expect(result).toBe(expected);
            expect(result).toBe(160);
        });

        it("clamps to minFarPlane when the calculated distance is less than the floor", () => {
            const cameraDistance = 5;
            const diskRadius = 10;
            const minFarPlane = 100; // 5 + 10 + 50 = 65, which is < 100

            const result = calculateAutoFarPlane(cameraDistance, diskRadius, minFarPlane);

            expect(result).toBe(minFarPlane);
        });

        it("uses default minFarPlane (75.0) and default padding (50.0) when omitted", () => {
            const cameraDistance = 10.5;
            const diskRadius = 30;
            // 10.5 + 30 + 50 = 90.5 > 75.0

            const result = calculateAutoFarPlane(cameraDistance, diskRadius);

            expect(result).toBeCloseTo(90.5);
        });

        it("supports custom padding parameter", () => {
            const cameraDistance = 40;
            const diskRadius = 25;
            const minFarPlane = 75;
            const customPadding = 100;

            const result = calculateAutoFarPlane(
                cameraDistance,
                diskRadius,
                minFarPlane,
                customPadding
            );

            expect(result).toBe(40 + 25 + 100);
        });

        it("ensures the far plane strictly encompasses the furthest possible star distance", () => {
            const cameraDistances = [0.25, 10, 40, 80, 150];
            const diskRadii = [15, 30, 60];

            for (const camDist of cameraDistances) {
                for (const radius of diskRadii) {
                    const farPlane = calculateAutoFarPlane(camDist, radius);
                    // The farthest star is at eye-space depth approx (camDist + radius)
                    expect(farPlane).toBeGreaterThan(camDist + radius);
                }
            }
        });
    });

    describe("generateStarBuffer()", () => {
        it("generates a Float32Array with 6 attributes per star", () => {
            const params = {
                ...DEFAULT_ORB_PARAMETERS,
                starCount: 1000,
            };

            const buffer = generateStarBuffer(params);

            expect(buffer).toBeInstanceOf(Float32Array);
            expect(buffer.length).toBe(1000 * 6);
        });

        it("populates all attributes with valid finite numbers without NaN or Infinity", () => {
            const params = {
                ...DEFAULT_ORB_PARAMETERS,
                starCount: 500,
            };

            const buffer = generateStarBuffer(params);

            for (let i = 0; i < buffer.length; i++) {
                expect(Number.isFinite(buffer[i])).toBe(true);
            }
        });
    });
});
