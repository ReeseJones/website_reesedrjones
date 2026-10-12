import { describe, it, expect, vi } from "vitest";
import { buildSphereBufferData, SphereGeometry } from "./sphere_geometry";
import { STANDARD_VERTEX_LAYOUT } from "./standard_layout";
import { getVertex } from "../../../testing/geometry_test_helpers";
import type { SphereGeometryOptions } from "./primitive_types";

describe("buildSphereBufferData", () => {
    describe("default parameters", () => {
        it("should produce 561 vertices and 2880 indices with default arguments", () => {
            const data = buildSphereBufferData();

            // Default: radius = 1.0, widthSegments = 32, heightSegments = 16
            // latBands = 16, lonBands = 32
            // vertexCount = (16 + 1) * (32 + 1) = 17 * 33 = 561
            expect(data.vertexCount).toBe(561);
            expect(data.attributes).toBeInstanceOf(Float32Array);
            expect(data.attributes.length).toBe(561 * 8); // 4488 floats (pos:3, normal:3, uv:2)
            expect(data.indices).toBeInstanceOf(Uint16Array);
            // lonBands * (latBands - 1) * 6 = 32 * 15 * 6 = 2880 indices (960 triangles)
            expect(data.indices?.length).toBe(2880);
        });

        it("should reference STANDARD_VERTEX_LAYOUT", () => {
            const data = buildSphereBufferData();

            expect(data.layout).toBe(STANDARD_VERTEX_LAYOUT);
        });
    });

    describe("minimum segment clamping and edge cases", () => {
        it("should clamp widthSegments < 3 and heightSegments < 3 to latBands=3, lonBands=3", () => {
            const data = buildSphereBufferData(1.0, 1, 1);

            // Clamped to 3x3: (3 + 1) * (3 + 1) = 16 vertices
            expect(data.vertexCount).toBe(16);
            expect(data.attributes.length).toBe(16 * 8); // 128 floats
            // 3 * (3 - 1) * 6 = 36 indices (12 triangles)
            expect(data.indices?.length).toBe(36);
        });

        it("should clamp zero, negative, and small values to minimum 3 bands", () => {
            const dataZero = buildSphereBufferData(1.0, 0, 0);
            expect(dataZero.vertexCount).toBe(16);
            expect(dataZero.indices?.length).toBe(36);

            const dataNeg = buildSphereBufferData(1.0, -10, -5);
            expect(dataNeg.vertexCount).toBe(16);
            expect(dataNeg.indices?.length).toBe(36);
        });

        it("should floor fractional segment inputs", () => {
            // 4.9 floors to 4, 3.2 floors to 3
            const data = buildSphereBufferData(1.0, 4.9, 3.2);

            // latBands = 3, lonBands = 4 -> (3 + 1) * (4 + 1) = 20 vertices
            expect(data.vertexCount).toBe(20);
            // lonBands * (latBands - 1) * 6 = 4 * (3 - 1) * 6 = 48 indices
            expect(data.indices?.length).toBe(48);
        });
    });

    describe("geometric invariants", () => {
        it("should produce unit-length normals for every vertex on a default sphere", () => {
            const data = buildSphereBufferData();

            for (let i = 0; i < data.vertexCount; i++) {
                const v = getVertex(data.attributes, i);
                const normLen = Math.sqrt(v.nx * v.nx + v.ny * v.ny + v.nz * v.nz);
                expect(normLen).toBeCloseTo(1.0, 5);
            }
        });

        it("should place all vertices at unit distance from origin for default radius 1.0", () => {
            const data = buildSphereBufferData(1.0);

            for (let i = 0; i < data.vertexCount; i++) {
                const v = getVertex(data.attributes, i);
                const dist = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
                expect(dist).toBeCloseTo(1.0, 5);
            }
        });

        it("should scale positions by custom radius while keeping normals normalized", () => {
            const customRadius = 5.0;
            const data = buildSphereBufferData(customRadius, 8, 8);

            for (let i = 0; i < data.vertexCount; i++) {
                const v = getVertex(data.attributes, i);

                const dist = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
                expect(dist).toBeCloseTo(customRadius, 5);

                const normLen = Math.sqrt(v.nx * v.nx + v.ny * v.ny + v.nz * v.nz);
                expect(normLen).toBeCloseTo(1.0, 5);

                // Position must equal radius * normal
                expect(v.x).toBeCloseTo(customRadius * v.nx, 5);
                expect(v.y).toBeCloseTo(customRadius * v.ny, 5);
                expect(v.z).toBeCloseTo(customRadius * v.nz, 5);
            }
        });

        it("should correctly handle small radius values", () => {
            const radius = 0.25;
            const data = buildSphereBufferData(radius, 6, 6);

            for (let i = 0; i < data.vertexCount; i++) {
                const v = getVertex(data.attributes, i);
                const dist = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
                expect(dist).toBeCloseTo(radius, 5);
            }
        });
    });

    describe("pole geometry", () => {
        it("should position North pole vertices at y = +radius with normal (0, 1, 0) and v = 1", () => {
            const radius = 2.5;
            const lonBands = 8;
            const latBands = 6;
            const data = buildSphereBufferData(radius, lonBands, latBands);

            // North pole vertices are the first latitude ring (lat = 0, lon = 0..lonBands)
            for (let lon = 0; lon <= lonBands; lon++) {
                const vertexIndex = lon;
                const v = getVertex(data.attributes, vertexIndex);

                // Spatial position at North pole
                expect(v.x).toBeCloseTo(0.0, 5);
                expect(v.y).toBeCloseTo(radius, 5);
                expect(v.z).toBeCloseTo(0.0, 5);

                // Normal pointing straight up (+Y)
                expect(v.nx).toBeCloseTo(0.0, 5);
                expect(v.ny).toBeCloseTo(1.0, 5);
                expect(v.nz).toBeCloseTo(0.0, 5);

                // Texture coordinates: v = 1.0 (1.0 - 0/latBands), u spans [0, 1]
                expect(v.v).toBeCloseTo(1.0, 5);
                expect(v.u).toBeCloseTo(lon / lonBands, 5);
            }
        });

        it("should position South pole vertices at y = -radius with normal (0, -1, 0) and v = 0", () => {
            const radius = 3.0;
            const lonBands = 10;
            const latBands = 8;
            const data = buildSphereBufferData(radius, lonBands, latBands);

            // South pole vertices are the last latitude ring (lat = latBands, lon = 0..lonBands)
            const southPoleStart = latBands * (lonBands + 1);
            for (let lon = 0; lon <= lonBands; lon++) {
                const vertexIndex = southPoleStart + lon;
                const v = getVertex(data.attributes, vertexIndex);

                // Spatial position at South pole
                expect(v.x).toBeCloseTo(0.0, 5);
                expect(v.y).toBeCloseTo(-radius, 5);
                expect(v.z).toBeCloseTo(0.0, 5);

                // Normal pointing straight down (-Y)
                expect(v.nx).toBeCloseTo(0.0, 5);
                expect(v.ny).toBeCloseTo(-1.0, 5);
                expect(v.nz).toBeCloseTo(0.0, 5);

                // Texture coordinates: v = 0.0 (1.0 - latBands/latBands), u spans [0, 1]
                expect(v.v).toBeCloseTo(0.0, 5);
                expect(v.u).toBeCloseTo(lon / lonBands, 5);
            }
        });
    });

    describe("UV coordinates", () => {
        it("should constrain all u and v coordinates within [0, 1]", () => {
            const data = buildSphereBufferData(1.0, 16, 8);

            for (let i = 0; i < data.vertexCount; i++) {
                const v = getVertex(data.attributes, i);
                expect(v.u).toBeGreaterThanOrEqual(0.0);
                expect(v.u).toBeLessThanOrEqual(1.0);
                expect(v.v).toBeGreaterThanOrEqual(0.0);
                expect(v.v).toBeLessThanOrEqual(1.0);
            }
        });

        it("should monotonically vary u across longitude and v down latitude", () => {
            const lonBands = 4;
            const latBands = 4;
            const data = buildSphereBufferData(1.0, lonBands, latBands);

            for (let lat = 0; lat <= latBands; lat++) {
                const expectedV = 1.0 - lat / latBands;
                for (let lon = 0; lon <= lonBands; lon++) {
                    const vertexIndex = lat * (lonBands + 1) + lon;
                    const v = getVertex(data.attributes, vertexIndex);

                    expect(v.u).toBeCloseTo(lon / lonBands, 5);
                    expect(v.v).toBeCloseTo(expectedV, 5);
                }
            }
        });

        it("should duplicate spatial position and normal at the UV seam while separating u = 0 and u = 1", () => {
            const lonBands = 6;
            const latBands = 6;
            const data = buildSphereBufferData(2.0, lonBands, latBands);

            for (let lat = 0; lat <= latBands; lat++) {
                const seamStart = getVertex(data.attributes, lat * (lonBands + 1));
                const seamEnd = getVertex(data.attributes, lat * (lonBands + 1) + lonBands);

                // UVs should be 0.0 at start of ring and 1.0 at end of ring
                expect(seamStart.u).toBeCloseTo(0.0, 5);
                expect(seamEnd.u).toBeCloseTo(1.0, 5);

                // Positions should be geometrically identical
                expect(seamStart.x).toBeCloseTo(seamEnd.x, 5);
                expect(seamStart.y).toBeCloseTo(seamEnd.y, 5);
                expect(seamStart.z).toBeCloseTo(seamEnd.z, 5);

                // Normals should be identical
                expect(seamStart.nx).toBeCloseTo(seamEnd.nx, 5);
                expect(seamStart.ny).toBeCloseTo(seamEnd.ny, 5);
                expect(seamStart.nz).toBeCloseTo(seamEnd.nz, 5);
            }
        });
    });

    describe("indices and topology", () => {
        it("should constrain all index references within [0, vertexCount - 1]", () => {
            const data = buildSphereBufferData(1.0, 16, 8);
            const indices = data.indices!;

            for (let i = 0; i < indices.length; i++) {
                const idx = indices[i];
                expect(idx).toBeGreaterThanOrEqual(0);
                expect(idx).toBeLessThan(data.vertexCount);
            }
        });

        it("should default to Uint16Array for standard vertex counts <= 65535", () => {
            const data = buildSphereBufferData(1.0, 32, 16);

            expect(data.vertexCount).toBeLessThanOrEqual(65535);
            expect(data.indices).toBeInstanceOf(Uint16Array);
        });

        it("should generate Uint32Array when vertexCount > 65535", () => {
            // 256x256 -> (256 + 1) * (256 + 1) = 257 * 257 = 66049 vertices (> 65535)
            const data = buildSphereBufferData(1.0, 256, 256);

            expect(data.vertexCount).toBe(66049);
            expect(data.indices).toBeInstanceOf(Uint32Array);
            // lonBands * (latBands - 1) * 6 = 256 * 255 * 6 = 391680 indices
            expect(data.indices?.length).toBe(391680);
        });

        it("should emit valid triangles with non-degenerate non-zero area indices", () => {
            const data = buildSphereBufferData(1.0, 6, 6);
            const indices = data.indices!;

            expect(indices.length % 3).toBe(0);

            for (let t = 0; t < indices.length; t += 3) {
                const i0 = indices[t];
                const i1 = indices[t + 1];
                const i2 = indices[t + 2];

                // Vertices of any triangle must be distinct
                expect(i0).not.toBe(i1);
                expect(i1).not.toBe(i2);
                expect(i2).not.toBe(i0);
            }
        });
    });
});

describe("SphereGeometry", () => {
    describe("instantiation and configuration", () => {
        it("should initialize with default parameters when no options are provided", () => {
            const sphere = new SphereGeometry();

            expect(sphere.radius).toBe(1.0);
            expect(sphere.widthSegments).toBe(32);
            expect(sphere.heightSegments).toBe(16);
            expect(sphere.vertexCount).toBe(561);
            expect(sphere.indexCount).toBe(2880);
        });

        it("should accept custom radius, widthSegments, and heightSegments options", () => {
            const options: SphereGeometryOptions = {
                radius: 4.5,
                widthSegments: 24,
                heightSegments: 12,
            };
            const sphere = new SphereGeometry(options);

            expect(sphere.radius).toBe(4.5);
            expect(sphere.widthSegments).toBe(24);
            expect(sphere.heightSegments).toBe(12);

            // (12 + 1) * (24 + 1) = 13 * 25 = 325 vertices
            expect(sphere.vertexCount).toBe(325);
            // 24 * (12 - 1) * 6 = 24 * 11 * 6 = 1584 indices
            expect(sphere.indexCount).toBe(1584);
        });

        it("should support shorthand segments option setting widthSegments = segments * 2 and heightSegments = segments", () => {
            const sphere = new SphereGeometry({ segments: 10 });

            expect(sphere.radius).toBe(1.0);
            expect(sphere.widthSegments).toBe(20);
            expect(sphere.heightSegments).toBe(10);
            // (10 + 1) * (20 + 1) = 11 * 21 = 231 vertices
            expect(sphere.vertexCount).toBe(231);
        });

        it("should allow explicit widthSegments or heightSegments to override shorthand segments", () => {
            const sphere = new SphereGeometry({
                segments: 10,
                widthSegments: 50,
            });

            expect(sphere.widthSegments).toBe(50);
            expect(sphere.heightSegments).toBe(10);
        });

        it("should configure primitiveType to WebGL2RenderingContext.TRIANGLES", () => {
            const sphere = new SphereGeometry();

            expect(sphere.primitiveType).toBe(WebGL2RenderingContext.TRIANGLES);
            expect(sphere.primitiveType).toBe(4);
        });

        it("should accept an explicit id when provided", () => {
            const customId = "custom-sphere-id-42";
            const sphere = new SphereGeometry(undefined, customId);

            expect(sphere.id).toBe(customId);
        });

        it("should generate a unique default id matching MeshGeometry_\\d+ when none is provided", () => {
            const sphere1 = new SphereGeometry();
            const sphere2 = new SphereGeometry();

            expect(sphere1.id).toMatch(/^MeshGeometry_\d+$/);
            expect(sphere2.id).toMatch(/^MeshGeometry_\d+$/);
            expect(sphere1.id).not.toBe(sphere2.id);
        });
    });

    describe("MeshGeometry inheritance and buffer data contracts", () => {
        it("should expose bufferData with layout, attributes, and indices conforming to STANDARD_VERTEX_LAYOUT", () => {
            const sphere = new SphereGeometry({ radius: 2.0, widthSegments: 8, heightSegments: 6 });
            const bufferData = sphere.bufferData;

            // (6 + 1) * (8 + 1) = 7 * 9 = 63 vertices
            expect(bufferData.vertexCount).toBe(63);
            expect(bufferData.attributes.length).toBe(63 * 8);
            // 8 * (6 - 1) * 6 = 240 indices
            expect(bufferData.indices?.length).toBe(240);
            expect(bufferData.layout).toBe(STANDARD_VERTEX_LAYOUT);
        });

        it("should allow updating attributes and indices via MeshGeometry base methods", () => {
            const sphere = new SphereGeometry({ radius: 1.0, segments: 4 });
            expect(sphere.version).toBe(0);

            const newAttrs = new Float32Array(32);
            sphere.setAttributes(newAttrs, 4);
            expect(sphere.version).toBe(1);
            expect(sphere.vertexCount).toBe(4);
            expect(sphere.bufferData.attributes).toBe(newAttrs);

            const newIndices = new Uint16Array([0, 1, 2]);
            sphere.setIndices(newIndices);
            expect(sphere.version).toBe(2);
            expect(sphere.indexCount).toBe(3);
            expect(sphere.bufferData.indices).toBe(newIndices);
        });

        it("should increment version when markDirty is called", () => {
            const sphere = new SphereGeometry();

            expect(sphere.version).toBe(0);
            sphere.markDirty();
            expect(sphere.version).toBe(1);
            sphere.markDirty();
            expect(sphere.version).toBe(2);
        });
    });

    describe("IDisposable lifecycle", () => {
        it("should initialize isDisposed to false and transition to true upon dispose()", () => {
            const sphere = new SphereGeometry();

            expect(sphere.isDisposed).toBe(false);
            sphere.dispose();
            expect(sphere.isDisposed).toBe(true);
        });

        it("should notify onDispose listeners when dispose() is called", () => {
            const sphere = new SphereGeometry();
            const listener = vi.fn();

            sphere.onDispose(listener);
            expect(listener).not.toHaveBeenCalled();

            sphere.dispose();
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(sphere);
        });

        it("should enforce dispose idempotency and not invoke listeners on subsequent dispose() calls", () => {
            const sphere = new SphereGeometry();
            const listener = vi.fn();

            sphere.onDispose(listener);
            sphere.dispose();
            expect(listener).toHaveBeenCalledTimes(1);

            // Second dispose call should do nothing
            sphere.dispose();
            expect(listener).toHaveBeenCalledTimes(1);
            expect(sphere.isDisposed).toBe(true);
        });

        it("should allow unsubscribing listeners prior to dispose()", () => {
            const sphere = new SphereGeometry();
            const listener = vi.fn();

            const unsubscribe = sphere.onDispose(listener);
            unsubscribe();

            sphere.dispose();
            expect(listener).not.toHaveBeenCalled();
            expect(sphere.isDisposed).toBe(true);
        });
    });
});
