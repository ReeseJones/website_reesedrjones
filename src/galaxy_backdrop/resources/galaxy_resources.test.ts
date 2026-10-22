import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    getSharedCloudGeometry,
    getSharedCloudMaterial,
    getSharedGalaxyGeometry,
    getSharedGalaxyMaterial,
    disposeSharedGalaxyResources,
    getSharedGalaxyResources,
} from "./galaxy_resources";
import { ScreenQuadGeometry } from "../../scene/models/screen_quad_geometry";
import { GalacticCloudMaterial } from "../../scene/materials/galactic_cloud_material";
import { GalaxyGeometry } from "../../scene/models/galaxy_geometry";
import { GalaxyMaterial } from "../../scene/materials/galaxy_material";
import { BlendMode } from "../../scene/materials/material_types";
import { GLPrimitive } from "../../webgl/core/webgl_constants_types";
import type { GalaxyParameters } from "../parameters/types";

describe("galaxy_resources", () => {
    beforeEach(() => {
        disposeSharedGalaxyResources();
    });

    afterEach(() => {
        disposeSharedGalaxyResources();
    });

    describe("getSharedCloudGeometry()", () => {
        it("lazily instantiates and returns a ScreenQuadGeometry instance", () => {
            const geometry = getSharedCloudGeometry();

            expect(geometry).toBeInstanceOf(ScreenQuadGeometry);
            expect(geometry.primitiveType).toBe(GLPrimitive.TriangleStrip);
            expect(geometry.vertexCount).toBe(4);
            expect(geometry.isDisposed).toBe(false);
        });

        it("returns the exact same singleton instance on successive invocations", () => {
            const first = getSharedCloudGeometry();
            const second = getSharedCloudGeometry();

            expect(second).toBe(first);
        });
    });

    describe("getSharedCloudMaterial()", () => {
        it("lazily instantiates and returns a GalacticCloudMaterial instance", () => {
            const material = getSharedCloudMaterial();

            expect(material).toBeInstanceOf(GalacticCloudMaterial);
            expect(material.shaderKey).toBe("galactic_cloud");
            expect(material.pipelineState.blendMode).toBe(BlendMode.Alpha);
        });

        it("returns the exact same singleton instance on successive invocations", () => {
            const first = getSharedCloudMaterial();
            const second = getSharedCloudMaterial();

            expect(second).toBe(first);
        });

        it("initializes with provided galaxy parameters on first invocation", () => {
            const material = getSharedCloudMaterial({
                horizonIntensity: 2.2,
                horizonThickness: 0.65,
            });

            expect(material).toBeInstanceOf(GalacticCloudMaterial);
            const uniforms = material.getUniforms();
            expect(uniforms.uHorizonIntensity).toBe(2.2);
            expect(uniforms.uHorizonThickness).toBe(0.65);
        });

        it("updates parameters on the shared instance when params are provided on successive calls", () => {
            const material = getSharedCloudMaterial();
            const updateSpy = vi.spyOn(material, "updateParameters");

            const returned = getSharedCloudMaterial({
                horizonIntensity: 3.5,
                horizonThickness: 0.8,
            });

            expect(returned).toBe(material);
            expect(updateSpy).toHaveBeenCalledTimes(1);
            expect(updateSpy).toHaveBeenCalledWith({
                horizonIntensity: 3.5,
                horizonThickness: 0.8,
            });
            expect(material.getUniforms().uHorizonIntensity).toBe(3.5);
            expect(material.getUniforms().uHorizonThickness).toBe(0.8);
        });

        it("does not call updateParameters when params argument is undefined on successive calls", () => {
            const material = getSharedCloudMaterial();
            const updateSpy = vi.spyOn(material, "updateParameters");

            const returned = getSharedCloudMaterial();

            expect(returned).toBe(material);
            expect(updateSpy).not.toHaveBeenCalled();
        });
    });

    describe("getSharedGalaxyGeometry()", () => {
        it("lazily instantiates and returns a GalaxyGeometry instance", () => {
            const geometry = getSharedGalaxyGeometry();

            expect(geometry).toBeInstanceOf(GalaxyGeometry);
            expect(geometry.primitiveType).toBe(GLPrimitive.Points);
            expect(geometry.isDisposed).toBe(false);
            expect(geometry.vertexCount).toBeGreaterThan(0);
        });

        it("returns the exact same singleton instance on successive invocations", () => {
            const first = getSharedGalaxyGeometry();
            const second = getSharedGalaxyGeometry();

            expect(second).toBe(first);
        });

        it("initializes with custom galaxy parameters on initial creation", () => {
            const geometry = getSharedGalaxyGeometry({ starCount: 500 });

            expect(geometry.vertexCount).toBe(500);
            expect(geometry.galaxyParams.starCount).toBe(500);
        });

        it("triggers geometry rebuild when morphology parameters change", () => {
            const geometry = getSharedGalaxyGeometry({ starCount: 600 });
            const updateSpy = vi.spyOn(geometry, "updateParameters");

            const morphologyOverrides: Array<Partial<GalaxyParameters>> = [
                { starCount: 800 },
                { armCount: 5 },
                { armWinding: 4.2 },
                { armDispersion: 0.35 },
                { spurFrequency: 2.1 },
                { coreRadius: 0.4 },
                { diskRadius: 4.5 },
                { diskThickness: 0.25 },
                { coreDensityRatio: 0.6 },
            ];

            for (let i = 0; i < morphologyOverrides.length; i++) {
                const override = morphologyOverrides[i];
                const returned = getSharedGalaxyGeometry(override);
                expect(returned).toBe(geometry);
                expect(updateSpy).toHaveBeenCalledTimes(i + 1);
                expect(updateSpy).toHaveBeenLastCalledWith(override);
            }
        });

        it("does not trigger geometry rebuild when morphology parameters are unchanged", () => {
            const geometry = getSharedGalaxyGeometry({ starCount: 1000, armCount: 4 });
            const updateSpy = vi.spyOn(geometry, "updateParameters");

            const returned = getSharedGalaxyGeometry({ starCount: 1000, armCount: 4 });

            expect(returned).toBe(geometry);
            expect(updateSpy).not.toHaveBeenCalled();
        });

        it("does not trigger geometry rebuild when non-morphology parameters are updated", () => {
            const geometry = getSharedGalaxyGeometry();
            const updateSpy = vi.spyOn(geometry, "updateParameters");

            const nonMorphologyUpdates: Partial<GalaxyParameters> = {
                rotationSpeed: 0.8,
                pointScale: 10.0,
                coreColor: { r: 1, g: 0, b: 0 },
                accentColor: { r: 0, g: 1, b: 0 },
            };

            const returned = getSharedGalaxyGeometry(nonMorphologyUpdates);

            expect(returned).toBe(geometry);
            expect(updateSpy).not.toHaveBeenCalled();
        });

        it("does not trigger geometry rebuild when called without parameters", () => {
            const geometry = getSharedGalaxyGeometry();
            const updateSpy = vi.spyOn(geometry, "updateParameters");

            const returned = getSharedGalaxyGeometry();

            expect(returned).toBe(geometry);
            expect(updateSpy).not.toHaveBeenCalled();
        });
    });

    describe("getSharedGalaxyMaterial()", () => {
        it("lazily instantiates and returns a GalaxyMaterial instance configured with BlendMode.Additive", () => {
            const material = getSharedGalaxyMaterial();

            expect(material).toBeInstanceOf(GalaxyMaterial);
            expect(material.pipelineState).toEqual({
                blendMode: BlendMode.Additive,
                depthTest: false,
                depthWrite: false,
                cullFace: false,
            });
        });

        it("returns the exact same singleton instance on successive invocations", () => {
            const first = getSharedGalaxyMaterial();
            const second = getSharedGalaxyMaterial();

            expect(second).toBe(first);
        });

        it("initializes with custom simulation parameters on first invocation", () => {
            const material = getSharedGalaxyMaterial({
                rotationSpeed: -0.45,
                pointScale: 7.5,
            });

            expect(material.galaxyParams.rotationSpeed).toBe(-0.45);
            expect(material.galaxyParams.pointScale).toBe(7.5);
            expect(material.getUniforms()["u_rotationSpeed"]).toBe(-0.45);
            expect(material.getUniforms()["u_pointScale"]).toBe(7.5);
        });

        it("updates simulation parameters when params are provided on successive calls", () => {
            const material = getSharedGalaxyMaterial();
            const updateSpy = vi.spyOn(material, "updateParameters");

            const updated = getSharedGalaxyMaterial({
                rotationSpeed: 0.6,
                minPointSize: 3.0,
            });

            expect(updated).toBe(material);
            expect(updateSpy).toHaveBeenCalledTimes(1);
            expect(updateSpy).toHaveBeenCalledWith({
                rotationSpeed: 0.6,
                minPointSize: 3.0,
            });
            expect(material.galaxyParams.rotationSpeed).toBe(0.6);
            expect(material.getUniforms()["u_rotationSpeed"]).toBe(0.6);
            expect(material.getUniforms()["u_minPointSize"]).toBe(3.0);
        });

        it("does not call updateParameters when params argument is undefined on successive calls", () => {
            const material = getSharedGalaxyMaterial();
            const updateSpy = vi.spyOn(material, "updateParameters");

            const returned = getSharedGalaxyMaterial();

            expect(returned).toBe(material);
            expect(updateSpy).not.toHaveBeenCalled();
        });

        it("creates a material with shaderKey 'galaxy_pinprick' when initialized with style 'pinprick'", () => {
            const material = getSharedGalaxyMaterial({ style: "pinprick" });

            expect(material).toBeInstanceOf(GalaxyMaterial);
            expect(material.shaderKey).toBe("galaxy_pinprick");
            expect(material.galaxyParams.style).toBe("pinprick");
        });

        it("updates shaderKey to 'galaxy_orb' when subsequent call provides style 'orb'", () => {
            const material = getSharedGalaxyMaterial({ style: "pinprick" });
            expect(material.shaderKey).toBe("galaxy_pinprick");

            const updatedMaterial = getSharedGalaxyMaterial({ style: "orb" });

            expect(updatedMaterial).toBe(material);
            expect(material.shaderKey).toBe("galaxy_orb");
            expect(material.galaxyParams.style).toBe("orb");
        });
    });

    describe("disposeSharedGalaxyResources()", () => {
        it("disposes instantiated geometry buffers and nulls out singletons in getSharedGalaxyResources()", () => {
            const cloudGeo = getSharedCloudGeometry();
            const cloudMat = getSharedCloudMaterial();
            const galaxyGeo = getSharedGalaxyGeometry();
            const galaxyMat = getSharedGalaxyMaterial();

            const cloudGeoSpy = vi.spyOn(cloudGeo, "dispose");
            const galaxyGeoSpy = vi.spyOn(galaxyGeo, "dispose");

            disposeSharedGalaxyResources();

            expect(cloudGeoSpy).toHaveBeenCalledTimes(1);
            expect(galaxyGeoSpy).toHaveBeenCalledTimes(1);

            expect(cloudGeo.isDisposed).toBe(true);
            expect(galaxyGeo.isDisposed).toBe(true);

            const snapshot = getSharedGalaxyResources();
            expect(snapshot.cloudGeometry).toBeNull();
            expect(snapshot.cloudMaterial).toBeNull();
            expect(snapshot.galaxyGeometry).toBeNull();
            expect(snapshot.galaxyMaterial).toBeNull();
        });

        it("creates fresh new instances on subsequent getShared* invocations after disposal", () => {
            const oldCloudGeo = getSharedCloudGeometry();
            const oldCloudMat = getSharedCloudMaterial();
            const oldGalaxyGeo = getSharedGalaxyGeometry();
            const oldGalaxyMat = getSharedGalaxyMaterial();

            disposeSharedGalaxyResources();

            const newCloudGeo = getSharedCloudGeometry();
            const newCloudMat = getSharedCloudMaterial();
            const newGalaxyGeo = getSharedGalaxyGeometry();
            const newGalaxyMat = getSharedGalaxyMaterial();

            expect(newCloudGeo).not.toBe(oldCloudGeo);
            expect(newCloudMat).not.toBe(oldCloudMat);
            expect(newGalaxyGeo).not.toBe(oldGalaxyGeo);
            expect(newGalaxyMat).not.toBe(oldGalaxyMat);

            expect(newCloudGeo).toBeInstanceOf(ScreenQuadGeometry);
            expect(newCloudMat).toBeInstanceOf(GalacticCloudMaterial);
            expect(newGalaxyGeo).toBeInstanceOf(GalaxyGeometry);
            expect(newGalaxyMat).toBeInstanceOf(GalaxyMaterial);
        });

        it("is idempotent and safe to call when no resources have been allocated or repeatedly", () => {
            expect(() => disposeSharedGalaxyResources()).not.toThrow();
            expect(() => disposeSharedGalaxyResources()).not.toThrow();

            const snapshot = getSharedGalaxyResources();
            expect(snapshot).toEqual({
                cloudGeometry: null,
                cloudMaterial: null,
                galaxyGeometry: null,
                galaxyMaterial: null,
            });
        });

        it("safely disposes only partially instantiated singletons", () => {
            const cloudGeo = getSharedCloudGeometry();
            const cloudGeoSpy = vi.spyOn(cloudGeo, "dispose");

            expect(() => disposeSharedGalaxyResources()).not.toThrow();
            expect(cloudGeoSpy).toHaveBeenCalledTimes(1);
            expect(getSharedGalaxyResources().cloudGeometry).toBeNull();
        });
    });

    describe("getSharedGalaxyResources()", () => {
        it("returns snapshot conforming to SharedGalaxyResources reflecting all nulls initially", () => {
            const snapshot = getSharedGalaxyResources();

            expect(snapshot).toEqual({
                cloudGeometry: null,
                cloudMaterial: null,
                galaxyGeometry: null,
                galaxyMaterial: null,
            });
        });

        it("reflects active instances incrementally as singletons are created", () => {
            expect(getSharedGalaxyResources().cloudGeometry).toBeNull();

            const cloudGeo = getSharedCloudGeometry();
            expect(getSharedGalaxyResources().cloudGeometry).toBe(cloudGeo);
            expect(getSharedGalaxyResources().cloudMaterial).toBeNull();

            const cloudMat = getSharedCloudMaterial();
            expect(getSharedGalaxyResources().cloudMaterial).toBe(cloudMat);
            expect(getSharedGalaxyResources().galaxyGeometry).toBeNull();

            const galaxyGeo = getSharedGalaxyGeometry();
            expect(getSharedGalaxyResources().galaxyGeometry).toBe(galaxyGeo);
            expect(getSharedGalaxyResources().galaxyMaterial).toBeNull();

            const galaxyMat = getSharedGalaxyMaterial();
            expect(getSharedGalaxyResources().galaxyMaterial).toBe(galaxyMat);
        });
    });
});
