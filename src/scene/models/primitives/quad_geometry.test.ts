import { describe, it, expect, vi } from "vitest";
import { buildQuadBufferData, QuadGeometry } from "./quad_geometry";
import { STANDARD_VERTEX_LAYOUT } from "./standard_layout";
import { getVertex } from "../../../testing/geometry_test_helpers";

describe("buildQuadBufferData", () => {
    it("should produce 4 vertices (32 floats total) with vertexCount = 4 when using default parameters", () => {
        const data = buildQuadBufferData();

        expect(data.vertexCount).toBe(4);
        expect(data.attributes).toBeInstanceOf(Float32Array);
        expect(data.attributes.length).toBe(32); // 4 vertices * 8 floats per vertex
    });

    it("should reference STANDARD_VERTEX_LAYOUT", () => {
        const data = buildQuadBufferData();

        expect(data.layout).toBe(STANDARD_VERTEX_LAYOUT);
    });

    it("should generate counter-clockwise indices [0, 1, 2, 0, 2, 3]", () => {
        const data = buildQuadBufferData();

        expect(data.indices).toBeInstanceOf(Uint16Array);
        expect(data.indices).toEqual(new Uint16Array([0, 1, 2, 0, 2, 3]));
    });

    it("should correctly position vertices on the XY plane centered at the origin for default dimensions", () => {
        const data = buildQuadBufferData(1.0, 1.0);

        // Vertex 0: bottom-left (-0.5, -0.5, 0.0)
        const v0 = getVertex(data.attributes, 0);
        expect(v0.x).toBeCloseTo(-0.5);
        expect(v0.y).toBeCloseTo(-0.5);
        expect(v0.z).toBeCloseTo(0.0);

        // Vertex 1: bottom-right (0.5, -0.5, 0.0)
        const v1 = getVertex(data.attributes, 1);
        expect(v1.x).toBeCloseTo(0.5);
        expect(v1.y).toBeCloseTo(-0.5);
        expect(v1.z).toBeCloseTo(0.0);

        // Vertex 2: top-right (0.5, 0.5, 0.0)
        const v2 = getVertex(data.attributes, 2);
        expect(v2.x).toBeCloseTo(0.5);
        expect(v2.y).toBeCloseTo(0.5);
        expect(v2.z).toBeCloseTo(0.0);

        // Vertex 3: top-left (-0.5, 0.5, 0.0)
        const v3 = getVertex(data.attributes, 3);
        expect(v3.x).toBeCloseTo(-0.5);
        expect(v3.y).toBeCloseTo(0.5);
        expect(v3.z).toBeCloseTo(0.0);
    });

    it("should scale positions according to custom width and height dimensions", () => {
        const width = 4.0;
        const height = 6.0;
        const data = buildQuadBufferData(width, height);

        // Half extents: hx = 2.0, hy = 3.0
        // Vertex 0: bottom-left
        const v0 = getVertex(data.attributes, 0);
        expect(v0.x).toBeCloseTo(-2.0);
        expect(v0.y).toBeCloseTo(-3.0);
        expect(v0.z).toBeCloseTo(0.0);

        // Vertex 1: bottom-right
        const v1 = getVertex(data.attributes, 1);
        expect(v1.x).toBeCloseTo(2.0);
        expect(v1.y).toBeCloseTo(-3.0);
        expect(v1.z).toBeCloseTo(0.0);

        // Vertex 2: top-right
        const v2 = getVertex(data.attributes, 2);
        expect(v2.x).toBeCloseTo(2.0);
        expect(v2.y).toBeCloseTo(3.0);
        expect(v2.z).toBeCloseTo(0.0);

        // Vertex 3: top-left
        const v3 = getVertex(data.attributes, 3);
        expect(v3.x).toBeCloseTo(-2.0);
        expect(v3.y).toBeCloseTo(3.0);
        expect(v3.z).toBeCloseTo(0.0);
    });

    it("should orient normals outward toward +Z (0, 0, 1) across all four vertices", () => {
        const data = buildQuadBufferData(2.0, 3.0);

        for (let i = 0; i < 4; i++) {
            const v = getVertex(data.attributes, i);
            expect(v.nx).toBeCloseTo(0.0);
            expect(v.ny).toBeCloseTo(0.0);
            expect(v.nz).toBeCloseTo(1.0);
        }
    });

    it("should map UV coordinates in standard quad order", () => {
        const data = buildQuadBufferData();

        // Vertex 0 (bottom-left): (0, 0)
        const v0 = getVertex(data.attributes, 0);
        expect(v0.u).toBeCloseTo(0.0);
        expect(v0.v).toBeCloseTo(0.0);

        // Vertex 1 (bottom-right): (1, 0)
        const v1 = getVertex(data.attributes, 1);
        expect(v1.u).toBeCloseTo(1.0);
        expect(v1.v).toBeCloseTo(0.0);

        // Vertex 2 (top-right): (1, 1)
        const v2 = getVertex(data.attributes, 2);
        expect(v2.u).toBeCloseTo(1.0);
        expect(v2.v).toBeCloseTo(1.0);

        // Vertex 3 (top-left): (0, 1)
        const v3 = getVertex(data.attributes, 3);
        expect(v3.u).toBeCloseTo(0.0);
        expect(v3.v).toBeCloseTo(1.0);
    });

    it("should handle degenerate and asymmetric dimensions cleanly (width = 0, or width != height)", () => {
        const zeroWidthData = buildQuadBufferData(0.0, 5.0);

        const v0 = getVertex(zeroWidthData.attributes, 0);
        expect(v0.x).toBeCloseTo(0.0);
        expect(v0.y).toBeCloseTo(-2.5);

        const v1 = getVertex(zeroWidthData.attributes, 1);
        expect(v1.x).toBeCloseTo(0.0);
        expect(v1.y).toBeCloseTo(-2.5);

        const v2 = getVertex(zeroWidthData.attributes, 2);
        expect(v2.x).toBeCloseTo(0.0);
        expect(v2.y).toBeCloseTo(2.5);

        const v3 = getVertex(zeroWidthData.attributes, 3);
        expect(v3.x).toBeCloseTo(0.0);
        expect(v3.y).toBeCloseTo(2.5);
    });
});

describe("QuadGeometry", () => {
    describe("constructor & properties", () => {
        it("should initialize with default width = 1.0 and height = 1.0 when no options are provided", () => {
            const quad = new QuadGeometry();

            expect(quad.width).toBe(1.0);
            expect(quad.height).toBe(1.0);
        });

        it("should accept custom width and height options", () => {
            const quad = new QuadGeometry({ width: 3.5, height: 7.2 });

            expect(quad.width).toBe(3.5);
            expect(quad.height).toBe(7.2);
        });

        it("should support a custom explicit id", () => {
            const quad = new QuadGeometry({ width: 1.0, height: 1.0 }, "custom_quad_42");

            expect(quad.id).toBe("custom_quad_42");
        });

        it("should generate an automatic prefixed id when id is omitted", () => {
            const quad1 = new QuadGeometry();
            const quad2 = new QuadGeometry();

            expect(quad1.id).toMatch(/^MeshGeometry_\d+$/);
            expect(quad2.id).toMatch(/^MeshGeometry_\d+$/);
            expect(quad1.id).not.toBe(quad2.id);
        });
    });

    describe("MeshGeometry inheritance contracts", () => {
        it("should configure primitiveType to WebGL2RenderingContext.TRIANGLES (4)", () => {
            const quad = new QuadGeometry();

            expect(quad.primitiveType).toBe(WebGL2RenderingContext.TRIANGLES);
            expect(quad.primitiveType).toBe(4);
        });

        it("should expose vertexCount === 4 and indexCount === 6", () => {
            const quad = new QuadGeometry();

            expect(quad.vertexCount).toBe(4);
            expect(quad.indexCount).toBe(6);
        });

        it("should hold the generated quad attributes and indices in bufferData", () => {
            const quad = new QuadGeometry({ width: 2.0, height: 4.0 });
            const bufferData = quad.bufferData;

            expect(bufferData.vertexCount).toBe(4);
            expect(bufferData.attributes.length).toBe(32);
            expect(bufferData.indices).toEqual(new Uint16Array([0, 1, 2, 0, 2, 3]));
            expect(bufferData.layout).toBe(STANDARD_VERTEX_LAYOUT);
        });

        it("should initialize isDisposed to false and transition to true upon dispose()", () => {
            const quad = new QuadGeometry();

            expect(quad.isDisposed).toBe(false);
            quad.dispose();
            expect(quad.isDisposed).toBe(true);
        });

        it("should notify onDispose listeners when dispose() is called", () => {
            const quad = new QuadGeometry();
            const listener = vi.fn();

            quad.onDispose(listener);
            expect(listener).not.toHaveBeenCalled();

            quad.dispose();
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(quad);
        });

        it("should increment version when markDirty() is called", () => {
            const quad = new QuadGeometry();

            expect(quad.version).toBe(0);
            quad.markDirty();
            expect(quad.version).toBe(1);
            quad.markDirty();
            expect(quad.version).toBe(2);
        });
    });
});
