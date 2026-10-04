import { describe, it, expect, vi } from "vitest";
import { buildCubeBufferData, CubeGeometry } from "./cube_geometry";
import { STANDARD_VERTEX_LAYOUT } from "./standard_layout";
import { getVertex } from "../../../testing/geometry_test_helpers";

describe("buildCubeBufferData", () => {
    it("should produce 24 vertices (192 floats) with vertexCount = 24 and 36 indices with default parameters", () => {
        const data = buildCubeBufferData();

        expect(data.vertexCount).toBe(24);
        expect(data.attributes).toBeInstanceOf(Float32Array);
        expect(data.attributes.length).toBe(192); // 24 vertices * 8 floats per vertex
        expect(data.indices).toBeInstanceOf(Uint16Array);
        expect(data.indices?.length).toBe(36); // 6 faces * 2 triangles * 3 indices
    });

    it("should reference STANDARD_VERTEX_LAYOUT", () => {
        const data = buildCubeBufferData();

        expect(data.layout).toBe(STANDARD_VERTEX_LAYOUT);
    });

    describe("6 faces verification using getVertex", () => {
        it("should generate Front face (+Z, vertices 0..3) with normal (0, 0, 1) and z = 0.5", () => {
            const data = buildCubeBufferData(1.0, 1.0, 1.0);

            for (let i = 0; i < 4; i++) {
                const v = getVertex(data.attributes, i);
                expect(v.nx).toBeCloseTo(0);
                expect(v.ny).toBeCloseTo(0);
                expect(v.nz).toBeCloseTo(1);
                expect(v.z).toBeCloseTo(0.5);
            }

            // Individual corner positions: [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]
            expect(getVertex(data.attributes, 0).x).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 0).y).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 1).x).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 1).y).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 2).x).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 2).y).toBeCloseTo(0.5);

            expect(getVertex(data.attributes, 3).x).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 3).y).toBeCloseTo(0.5);
        });

        it("should generate Back face (-Z, vertices 4..7) with normal (0, 0, -1) and z = -0.5", () => {
            const data = buildCubeBufferData(1.0, 1.0, 1.0);

            for (let i = 4; i < 8; i++) {
                const v = getVertex(data.attributes, i);
                expect(v.nx).toBeCloseTo(0);
                expect(v.ny).toBeCloseTo(0);
                expect(v.nz).toBeCloseTo(-1);
                expect(v.z).toBeCloseTo(-0.5);
            }

            // Corners: [0.5, -0.5], [-0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]
            expect(getVertex(data.attributes, 4).x).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 4).y).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 5).x).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 5).y).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 6).x).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 6).y).toBeCloseTo(0.5);

            expect(getVertex(data.attributes, 7).x).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 7).y).toBeCloseTo(0.5);
        });

        it("should generate Top face (+Y, vertices 8..11) with normal (0, 1, 0) and y = 0.5", () => {
            const data = buildCubeBufferData(1.0, 1.0, 1.0);

            for (let i = 8; i < 12; i++) {
                const v = getVertex(data.attributes, i);
                expect(v.nx).toBeCloseTo(0);
                expect(v.ny).toBeCloseTo(1);
                expect(v.nz).toBeCloseTo(0);
                expect(v.y).toBeCloseTo(0.5);
            }

            // Corners: [-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5] along X and Z
            expect(getVertex(data.attributes, 8).x).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 8).z).toBeCloseTo(0.5);

            expect(getVertex(data.attributes, 9).x).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 9).z).toBeCloseTo(0.5);

            expect(getVertex(data.attributes, 10).x).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 10).z).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 11).x).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 11).z).toBeCloseTo(-0.5);
        });

        it("should generate Bottom face (-Y, vertices 12..15) with normal (0, -1, 0) and y = -0.5", () => {
            const data = buildCubeBufferData(1.0, 1.0, 1.0);

            for (let i = 12; i < 16; i++) {
                const v = getVertex(data.attributes, i);
                expect(v.nx).toBeCloseTo(0);
                expect(v.ny).toBeCloseTo(-1);
                expect(v.nz).toBeCloseTo(0);
                expect(v.y).toBeCloseTo(-0.5);
            }

            // Corners: [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5] along X and Z
            expect(getVertex(data.attributes, 12).x).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 12).z).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 13).x).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 13).z).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 14).x).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 14).z).toBeCloseTo(0.5);

            expect(getVertex(data.attributes, 15).x).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 15).z).toBeCloseTo(0.5);
        });

        it("should generate Right face (+X, vertices 16..19) with normal (1, 0, 0) and x = 0.5", () => {
            const data = buildCubeBufferData(1.0, 1.0, 1.0);

            for (let i = 16; i < 20; i++) {
                const v = getVertex(data.attributes, i);
                expect(v.nx).toBeCloseTo(1);
                expect(v.ny).toBeCloseTo(0);
                expect(v.nz).toBeCloseTo(0);
                expect(v.x).toBeCloseTo(0.5);
            }

            // Corners: [-0.5, 0.5], [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5] along Y and Z
            expect(getVertex(data.attributes, 16).y).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 16).z).toBeCloseTo(0.5);

            expect(getVertex(data.attributes, 17).y).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 17).z).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 18).y).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 18).z).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 19).y).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 19).z).toBeCloseTo(0.5);
        });

        it("should generate Left face (-X, vertices 20..23) with normal (-1, 0, 0) and x = -0.5", () => {
            const data = buildCubeBufferData(1.0, 1.0, 1.0);

            for (let i = 20; i < 24; i++) {
                const v = getVertex(data.attributes, i);
                expect(v.nx).toBeCloseTo(-1);
                expect(v.ny).toBeCloseTo(0);
                expect(v.nz).toBeCloseTo(0);
                expect(v.x).toBeCloseTo(-0.5);
            }

            // Corners: [-0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0.5, -0.5] along Y and Z
            expect(getVertex(data.attributes, 20).y).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 20).z).toBeCloseTo(-0.5);

            expect(getVertex(data.attributes, 21).y).toBeCloseTo(-0.5);
            expect(getVertex(data.attributes, 21).z).toBeCloseTo(0.5);

            expect(getVertex(data.attributes, 22).y).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 22).z).toBeCloseTo(0.5);

            expect(getVertex(data.attributes, 23).y).toBeCloseTo(0.5);
            expect(getVertex(data.attributes, 23).z).toBeCloseTo(-0.5);
        });
    });

    describe("UV coordinates pattern", () => {
        it("should apply (0, 0), (1, 0), (1, 1), (0, 1) mapping across every face", () => {
            const data = buildCubeBufferData();

            for (let f = 0; f < 6; f++) {
                const base = f * 4;
                const v0 = getVertex(data.attributes, base);
                const v1 = getVertex(data.attributes, base + 1);
                const v2 = getVertex(data.attributes, base + 2);
                const v3 = getVertex(data.attributes, base + 3);

                expect(v0.u).toBeCloseTo(0);
                expect(v0.v).toBeCloseTo(0);

                expect(v1.u).toBeCloseTo(1);
                expect(v1.v).toBeCloseTo(0);

                expect(v2.u).toBeCloseTo(1);
                expect(v2.v).toBeCloseTo(1);

                expect(v3.u).toBeCloseTo(0);
                expect(v3.v).toBeCloseTo(1);
            }
        });
    });

    describe("indices & winding order", () => {
        it("should generate counter-clockwise triangles for all 6 faces", () => {
            const data = buildCubeBufferData();
            const indices = data.indices!;

            expect(indices.length).toBe(36);

            for (let f = 0; f < 6; f++) {
                const base = f * 4;
                const iOffset = f * 6;

                // Triangle 1: (base, base + 1, base + 2)
                expect(indices[iOffset]).toBe(base);
                expect(indices[iOffset + 1]).toBe(base + 1);
                expect(indices[iOffset + 2]).toBe(base + 2);

                // Triangle 2: (base, base + 2, base + 3)
                expect(indices[iOffset + 3]).toBe(base);
                expect(indices[iOffset + 4]).toBe(base + 2);
                expect(indices[iOffset + 5]).toBe(base + 3);
            }
        });
    });

    describe("custom & degenerate dimensions", () => {
        it("should scale extents accurately for asymmetric box dimensions (width=2, height=4, depth=6)", () => {
            const data = buildCubeBufferData(2.0, 4.0, 6.0);
            // hx = 1.0, hy = 2.0, hz = 3.0

            // Front (+Z): z = 3.0, x in [-1, 1], y in [-2, 2]
            const frontVertex = getVertex(data.attributes, 2); // top-right corner of front face
            expect(frontVertex.x).toBeCloseTo(1.0);
            expect(frontVertex.y).toBeCloseTo(2.0);
            expect(frontVertex.z).toBeCloseTo(3.0);

            // Right (+X): x = 1.0
            const rightVertex = getVertex(data.attributes, 16);
            expect(rightVertex.x).toBeCloseTo(1.0);

            // Top (+Y): y = 2.0
            const topVertex = getVertex(data.attributes, 8);
            expect(topVertex.y).toBeCloseTo(2.0);

            // Left (-X): x = -1.0
            const leftVertex = getVertex(data.attributes, 20);
            expect(leftVertex.x).toBeCloseTo(-1.0);

            // Back (-Z): z = -3.0
            const backVertex = getVertex(data.attributes, 4);
            expect(backVertex.z).toBeCloseTo(-3.0);

            // Bottom (-Y): y = -2.0
            const bottomVertex = getVertex(data.attributes, 12);
            expect(bottomVertex.y).toBeCloseTo(-2.0);
        });

        it("should handle degenerate dimensions (e.g. width=0) cleanly without errors", () => {
            const data = buildCubeBufferData(0.0, 2.0, 2.0);

            expect(data.vertexCount).toBe(24);
            expect(data.attributes.length).toBe(192);

            // Front face corners should have x = 0
            expect(getVertex(data.attributes, 0).x).toBeCloseTo(0);
            expect(getVertex(data.attributes, 1).x).toBeCloseTo(0);
            // Right and Left faces should collapse to x = 0
            expect(getVertex(data.attributes, 16).x).toBeCloseTo(0);
            expect(getVertex(data.attributes, 20).x).toBeCloseTo(0);
        });
    });
});

describe("CubeGeometry", () => {
    describe("constructor & properties", () => {
        it("should initialize with default dimensions (width=1, height=1, depth=1) when no options are provided", () => {
            const cube = new CubeGeometry();

            expect(cube.width).toBe(1.0);
            expect(cube.height).toBe(1.0);
            expect(cube.depth).toBe(1.0);
        });

        it("should accept custom width, height, and depth options", () => {
            const cube = new CubeGeometry({ width: 3.0, height: 4.5, depth: 6.2 });

            expect(cube.width).toBe(3.0);
            expect(cube.height).toBe(4.5);
            expect(cube.depth).toBe(6.2);
        });

        it("should support a custom explicit id", () => {
            const cube = new CubeGeometry({ width: 1.0 }, "custom_cube_99");

            expect(cube.id).toBe("custom_cube_99");
        });

        it("should generate an automatic prefixed id when id is omitted", () => {
            const cube1 = new CubeGeometry();
            const cube2 = new CubeGeometry();

            expect(cube1.id).toMatch(/^MeshGeometry_\d+$/);
            expect(cube2.id).toMatch(/^MeshGeometry_\d+$/);
            expect(cube1.id).not.toBe(cube2.id);
        });
    });

    describe("MeshGeometry inheritance contracts", () => {
        it("should configure primitiveType to WebGL2RenderingContext.TRIANGLES (4)", () => {
            const cube = new CubeGeometry();

            expect(cube.primitiveType).toBe(WebGL2RenderingContext.TRIANGLES);
            expect(cube.primitiveType).toBe(4);
        });

        it("should expose vertexCount === 24 and indexCount === 36", () => {
            const cube = new CubeGeometry();

            expect(cube.vertexCount).toBe(24);
            expect(cube.indexCount).toBe(36);
        });

        it("should hold 24 vertices and 36 indices in bufferData conforming to STANDARD_VERTEX_LAYOUT", () => {
            const cube = new CubeGeometry({ width: 2.0, height: 3.0, depth: 4.0 });
            const bufferData = cube.bufferData;

            expect(bufferData.vertexCount).toBe(24);
            expect(bufferData.attributes.length).toBe(192);
            expect(bufferData.indices?.length).toBe(36);
            expect(bufferData.layout).toBe(STANDARD_VERTEX_LAYOUT);
        });

        it("should initialize isDisposed to false and transition to true upon dispose()", () => {
            const cube = new CubeGeometry();

            expect(cube.isDisposed).toBe(false);
            cube.dispose();
            expect(cube.isDisposed).toBe(true);
        });

        it("should notify onDispose listeners when dispose() is called", () => {
            const cube = new CubeGeometry();
            const listener = vi.fn();

            cube.onDispose(listener);
            expect(listener).not.toHaveBeenCalled();

            cube.dispose();
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(cube);
        });

        it("should increment version when markDirty() is called", () => {
            const cube = new CubeGeometry();

            expect(cube.version).toBe(0);
            cube.markDirty();
            expect(cube.version).toBe(1);
            cube.markDirty();
            expect(cube.version).toBe(2);
        });
    });
});
