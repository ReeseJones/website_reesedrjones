import { describe, it, expect, vi } from "vitest";
import { GalaxyGeometry } from "./galaxy_geometry";
import { GALAXY_VERTEX_LAYOUT } from "./galaxy_geometry_types";
import { DEFAULT_PINPRICK_PARAMETERS } from "../../galaxy_backdrop/parameters/presets/pinprick";

interface GalaxyStarVertex {
    radius: number;
    baseAngle: number;
    zOffset: number;
    size: number;
    spectralType: number;
    driftPhase: number;
}

const GALAXY_STRIDE_FLOATS = 6;

function getGalaxyStar(attributes: Float32Array, index: number): GalaxyStarVertex {
    const offset = index * GALAXY_STRIDE_FLOATS;
    return {
        radius: attributes[offset],
        baseAngle: attributes[offset + 1],
        zOffset: attributes[offset + 2],
        size: attributes[offset + 3],
        spectralType: attributes[offset + 4],
        driftPhase: attributes[offset + 5],
    };
}

describe("GalaxyGeometry", () => {
    describe("constructor and parameter resolution", () => {
        it("default construction: uses DEFAULT_PINPRICK_PARAMETERS (starCount = 300000), buffer length = 1,800,000 floats, vertexCount = 300000", () => {
            const geometry = new GalaxyGeometry();

            expect(geometry.galaxyParams).toEqual(DEFAULT_PINPRICK_PARAMETERS);
            expect(geometry.galaxyParams.starCount).toBe(300_000);
            expect(geometry.vertexCount).toBe(300_000);
            expect(geometry.bufferData.attributes).toBeInstanceOf(Float32Array);
            expect(geometry.bufferData.attributes.length).toBe(1_800_000);
        });

        it("flat partial parameter options: e.g. { starCount: 50, coreRadius: 3.5 } overrides starCount and coreRadius while retaining default parameters", () => {
            const geometry = new GalaxyGeometry({ starCount: 50, coreRadius: 3.5 });

            expect(geometry.galaxyParams.starCount).toBe(50);
            expect(geometry.galaxyParams.coreRadius).toBe(3.5);
            expect(geometry.galaxyParams.armCount).toBe(DEFAULT_PINPRICK_PARAMETERS.armCount);
            expect(geometry.galaxyParams.diskRadius).toBe(DEFAULT_PINPRICK_PARAMETERS.diskRadius);
            expect(geometry.galaxyParams.coreDensityRatio).toBe(DEFAULT_PINPRICK_PARAMETERS.coreDensityRatio);
            expect(geometry.vertexCount).toBe(50);
            expect(geometry.bufferData.attributes.length).toBe(50 * GALAXY_STRIDE_FLOATS);
        });

        it("nested options: { params: { starCount: 80, armCount: 4 } } correctly resolves through the options.params branch", () => {
            const geometry = new GalaxyGeometry({
                params: {
                    starCount: 80,
                    armCount: 4,
                },
            });

            expect(geometry.galaxyParams.starCount).toBe(80);
            expect(geometry.galaxyParams.armCount).toBe(4);
            expect(geometry.galaxyParams.coreRadius).toBe(DEFAULT_PINPRICK_PARAMETERS.coreRadius);
            expect(geometry.galaxyParams.diskRadius).toBe(DEFAULT_PINPRICK_PARAMETERS.diskRadius);
            expect(geometry.vertexCount).toBe(80);
            expect(geometry.bufferData.attributes.length).toBe(80 * GALAXY_STRIDE_FLOATS);
        });

        it("explicit id parameter: passes custom id to MeshGeometry", () => {
            const customId = "custom_galaxy_alpha_99";
            const geometry = new GalaxyGeometry({ starCount: 30 }, customId);

            expect(geometry.id).toBe(customId);
        });

        it("auto-generated id: generates unique default id matching /^MeshGeometry_\\d+$/", () => {
            const g1 = new GalaxyGeometry({ starCount: 10 });
            const g2 = new GalaxyGeometry({ starCount: 10 });

            expect(g1.id).toMatch(/^MeshGeometry_\d+$/);
            expect(g2.id).toMatch(/^MeshGeometry_\d+$/);
            expect(g1.id).not.toBe(g2.id);
        });
    });

    describe("buffer layout and WebGL properties", () => {
        it("primitiveType is WebGL2RenderingContext.POINTS (0)", () => {
            const geometry = new GalaxyGeometry({ starCount: 25 });

            expect(geometry.primitiveType).toBe(WebGL2RenderingContext.POINTS);
            expect(geometry.primitiveType).toBe(0);
        });

        it("layout is GALAXY_VERTEX_LAYOUT with 6 attributes (a_radius, a_baseAngle, a_zOffset, a_size, a_spectralType, a_driftPhase) and stride 24 bytes", () => {
            const geometry = new GalaxyGeometry({ starCount: 25 });
            const layout = geometry.bufferData.layout;

            expect(layout).toBe(GALAXY_VERTEX_LAYOUT);
            expect(layout.stride).toBe(24);
            expect(layout.attributes).toHaveLength(6);

            const [aRadius, aBaseAngle, aZOffset, aSize, aSpectralType, aDriftPhase] = layout.attributes;

            expect(aRadius).toEqual({
                nameOrLocation: 0,
                description: "a_radius (float)",
                size: 1,
                type: WebGL2RenderingContext.FLOAT,
            });

            expect(aBaseAngle).toEqual({
                nameOrLocation: 1,
                description: "a_baseAngle (float)",
                size: 1,
                type: WebGL2RenderingContext.FLOAT,
            });

            expect(aZOffset).toEqual({
                nameOrLocation: 2,
                description: "a_zOffset (float)",
                size: 1,
                type: WebGL2RenderingContext.FLOAT,
            });

            expect(aSize).toEqual({
                nameOrLocation: 3,
                description: "a_size (float)",
                size: 1,
                type: WebGL2RenderingContext.FLOAT,
            });

            expect(aSpectralType).toEqual({
                nameOrLocation: 4,
                description: "a_spectralType (float)",
                size: 1,
                type: WebGL2RenderingContext.FLOAT,
            });

            expect(aDriftPhase).toEqual({
                nameOrLocation: 5,
                description: "a_driftPhase (float)",
                size: 1,
                type: WebGL2RenderingContext.FLOAT,
            });
        });

        it("non-indexed geometry: indices is undefined, indexCount is null", () => {
            const geometry = new GalaxyGeometry({ starCount: 25 });

            expect(geometry.bufferData.indices).toBeUndefined();
            expect(geometry.indexCount).toBeNull();
        });

        it("attributes length is strictly vertexCount * 6", () => {
            for (const count of [10, 50, 100]) {
                const geometry = new GalaxyGeometry({ starCount: count });

                expect(geometry.vertexCount).toBe(count);
                expect(geometry.bufferData.attributes.length).toBe(geometry.vertexCount * GALAXY_STRIDE_FLOATS);
                expect(geometry.bufferData.attributes.length).toBe(count * 6);
            }
        });
    });

    describe("star attribute generation and bounds", () => {
        it("every star has radius >= 0", () => {
            const starCount = 100;
            const geometry = new GalaxyGeometry({ starCount });

            for (let i = 0; i < starCount; i++) {
                const star = getGalaxyStar(geometry.bufferData.attributes, i);
                expect(star.radius).toBeGreaterThanOrEqual(0);
                expect(Number.isFinite(star.radius)).toBe(true);
            }
        });

        it("every star has a valid finite zOffset", () => {
            const starCount = 100;
            const geometry = new GalaxyGeometry({ starCount });

            for (let i = 0; i < starCount; i++) {
                const star = getGalaxyStar(geometry.bufferData.attributes, i);
                expect(Number.isFinite(star.zOffset)).toBe(true);
            }
        });

        it("every star has size > 0", () => {
            const starCount = 100;
            const geometry = new GalaxyGeometry({ starCount });

            for (let i = 0; i < starCount; i++) {
                const star = getGalaxyStar(geometry.bufferData.attributes, i);
                expect(star.size).toBeGreaterThan(0);
                expect(Number.isFinite(star.size)).toBe(true);
            }
        });

        it("every star has driftPhase in [0, 2*PI]", () => {
            const starCount = 100;
            const geometry = new GalaxyGeometry({ starCount });

            for (let i = 0; i < starCount; i++) {
                const star = getGalaxyStar(geometry.bufferData.attributes, i);
                expect(star.driftPhase).toBeGreaterThanOrEqual(0);
                expect(star.driftPhase).toBeLessThanOrEqual(Math.PI * 2);
            }
        });

        it("core stars (first floor(starCount * coreDensityRatio)) have spectralType >= 0 and radius distributed near core", () => {
            const starCount = 100;
            const coreDensityRatio = 0.2;
            const coreRadius = 2.0;
            const diskRadius = 20.0;
            const geometry = new GalaxyGeometry({
                starCount,
                coreDensityRatio,
                coreRadius,
                diskRadius,
            });

            const coreStarCount = Math.floor(starCount * coreDensityRatio);
            expect(coreStarCount).toBe(20);

            let coreRadiusSum = 0;
            for (let i = 0; i < coreStarCount; i++) {
                const star = getGalaxyStar(geometry.bufferData.attributes, i);
                expect(star.spectralType).toBeGreaterThanOrEqual(0);
                expect(Number.isFinite(star.spectralType)).toBe(true);
                expect(star.radius).toBeGreaterThanOrEqual(0);
                expect(Number.isFinite(star.radius)).toBe(true);
                coreRadiusSum += star.radius;
            }

            const diskStarCount = starCount - coreStarCount;
            let diskRadiusSum = 0;
            for (let i = coreStarCount; i < starCount; i++) {
                const star = getGalaxyStar(geometry.bufferData.attributes, i);
                expect(star.radius).toBeGreaterThanOrEqual(coreRadius * 0.5);
                diskRadiusSum += star.radius;
            }

            const avgCoreRadius = coreRadiusSum / coreStarCount;
            const avgDiskRadius = diskRadiusSum / diskStarCount;

            expect(avgCoreRadius).toBeLessThan(avgDiskRadius);
        });
    });

    describe("MeshGeometry base contracts and mutations", () => {
        it("markDirty increments version", () => {
            const geometry = new GalaxyGeometry({ starCount: 10 });

            expect(geometry.version).toBe(0);
            geometry.markDirty();
            expect(geometry.version).toBe(1);
            geometry.markDirty();
            expect(geometry.version).toBe(2);
        });

        it("setAttributes updates attributes, recomputes vertexCount based on layout stride (6), and increments version", () => {
            const geometry = new GalaxyGeometry({ starCount: 10 });
            expect(geometry.vertexCount).toBe(10);
            expect(geometry.version).toBe(0);

            // 20 vertices * 6 attributes = 120 floats (480 bytes)
            // Stride = 24 bytes (6 floats). 480 / 24 = 20 vertices.
            const replacementBuffer = new Float32Array(20 * GALAXY_STRIDE_FLOATS);
            geometry.setAttributes(replacementBuffer);

            expect(geometry.bufferData.attributes).toBe(replacementBuffer);
            expect(geometry.vertexCount).toBe(20);
            expect(geometry.version).toBe(1);

            // With explicit vertexCount
            const explicitBuffer = new Float32Array(5 * GALAXY_STRIDE_FLOATS);
            geometry.setAttributes(explicitBuffer, 5);

            expect(geometry.bufferData.attributes).toBe(explicitBuffer);
            expect(geometry.vertexCount).toBe(5);
            expect(geometry.version).toBe(2);
        });
    });

    describe("IDisposable lifecycle", () => {
        it("isDisposed starts false, becomes true on dispose()", () => {
            const geometry = new GalaxyGeometry({ starCount: 10 });

            expect(geometry.isDisposed).toBe(false);
            geometry.dispose();
            expect(geometry.isDisposed).toBe(true);
        });

        it("onDispose listeners invoked on dispose()", () => {
            const geometry = new GalaxyGeometry({ starCount: 10 });
            const listener = vi.fn();

            geometry.onDispose(listener);
            expect(listener).not.toHaveBeenCalled();

            geometry.dispose();
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(geometry);
        });

        it("idempotent disposal (listeners invoked once)", () => {
            const geometry = new GalaxyGeometry({ starCount: 10 });
            const listener = vi.fn();

            geometry.onDispose(listener);
            geometry.dispose();
            geometry.dispose();

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it("unsubscribed listeners not invoked", () => {
            const geometry = new GalaxyGeometry({ starCount: 10 });
            const listener = vi.fn();

            const unsubscribe = geometry.onDispose(listener);
            unsubscribe();

            geometry.dispose();
            expect(listener).not.toHaveBeenCalled();
        });
    });
});
