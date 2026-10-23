import { describe, it, expect, vi } from "vitest";
import {
    buildPolylineRibbonBufferData,
    PolylineGeometry,
    POLYLINE_VERTEX_LAYOUT,
} from "./polyline_geometry";
import {
    POLYLINE_FLOATS_PER_VERTEX,
    POLYLINE_STRIDE_BYTES,
    POLYLINE_INDICES_PER_SEGMENT,
    POLYLINE_VERTICES_PER_POINT,
    POLYLINE_SIDE_POSITIVE,
    POLYLINE_SIDE_NEGATIVE,
    MIN_POLYLINE_POINTS,
} from "./polyline_constants";
import { GLDataType, GLPrimitive } from "../../webgl/core/webgl_constants_types";
import type { Vector3Like } from "../../maths/vector_types";

interface DecodedPolylineVertex {
    currX: number;
    currY: number;
    currZ: number;
    prevX: number;
    prevY: number;
    prevZ: number;
    nextX: number;
    nextY: number;
    nextZ: number;
    side: number;
    progress: number;
}

function decodePolylineVertex(
    attributes: Float32Array,
    vertexIndex: number
): DecodedPolylineVertex {
    const base = vertexIndex * POLYLINE_FLOATS_PER_VERTEX;
    return {
        currX: attributes[base + 0],
        currY: attributes[base + 1],
        currZ: attributes[base + 2],
        prevX: attributes[base + 3],
        prevY: attributes[base + 4],
        prevZ: attributes[base + 5],
        nextX: attributes[base + 6],
        nextY: attributes[base + 7],
        nextZ: attributes[base + 8],
        side: attributes[base + 9],
        progress: attributes[base + 10],
    };
}

describe("buildPolylineRibbonBufferData", () => {
    describe("boundary and edge cases (< MIN_POLYLINE_POINTS)", () => {
        it("should return empty buffer data and zero total length for empty points array", () => {
            const result = buildPolylineRibbonBufferData([]);

            expect(result.totalLength).toBe(0.0);
            expect(result.bufferData.vertexCount).toBe(0);
            expect(result.bufferData.attributes.length).toBe(0);
            expect(result.bufferData.indices?.length).toBe(0);
            expect(result.bufferData.layout).toBe(POLYLINE_VERTEX_LAYOUT);
        });

        it("should return empty buffer data and zero total length for empty Float32Array", () => {
            const result = buildPolylineRibbonBufferData(new Float32Array(0));

            expect(result.totalLength).toBe(0.0);
            expect(result.bufferData.vertexCount).toBe(0);
            expect(result.bufferData.attributes.length).toBe(0);
            expect(result.bufferData.indices?.length).toBe(0);
            expect(result.bufferData.layout).toBe(POLYLINE_VERTEX_LAYOUT);
        });

        it("should return empty buffer data and zero total length when point count is 1 (< MIN_POLYLINE_POINTS)", () => {
            const singlePoint: Vector3Like[] = [{ x: 5.0, y: 10.0, z: -2.0 }];
            const result = buildPolylineRibbonBufferData(singlePoint);

            expect(result.totalLength).toBe(0.0);
            expect(result.bufferData.vertexCount).toBe(0);
            expect(result.bufferData.attributes.length).toBe(0);
            expect(result.bufferData.indices?.length).toBe(0);
        });

        it("should return empty buffer data when Float32Array has fewer than 2 complete 3D triplets", () => {
            // 4 floats = 1 triplet + 1 leftover float -> count = 1 < MIN_POLYLINE_POINTS
            const incompleteData = new Float32Array([1.0, 2.0, 3.0, 4.0]);
            const result = buildPolylineRibbonBufferData(incompleteData);

            expect(result.totalLength).toBe(0.0);
            expect(result.bufferData.vertexCount).toBe(0);
            expect(result.bufferData.attributes.length).toBe(0);
        });
    });

    describe("vertex layout specification", () => {
        it("should conform to 44-byte stride with 4 vertex attributes matching shader inputs", () => {
            const points: Vector3Like[] = [
                { x: 0.0, y: 0.0, z: 0.0 },
                { x: 10.0, y: 0.0, z: 0.0 },
            ];
            const { bufferData } = buildPolylineRibbonBufferData(points);

            expect(bufferData.layout).toBe(POLYLINE_VERTEX_LAYOUT);
            expect(bufferData.layout.stride).toBe(POLYLINE_STRIDE_BYTES);
            expect(bufferData.layout.attributes.length).toBe(4);

            const [currAttr, prevAttr, nextAttr, sideAttr] = bufferData.layout.attributes;

            expect(currAttr.nameOrLocation).toBe(0);
            expect(currAttr.size).toBe(3);
            expect(currAttr.type).toBe(GLDataType.Float);

            expect(prevAttr.nameOrLocation).toBe(1);
            expect(prevAttr.size).toBe(3);
            expect(prevAttr.type).toBe(GLDataType.Float);

            expect(nextAttr.nameOrLocation).toBe(2);
            expect(nextAttr.size).toBe(3);
            expect(nextAttr.type).toBe(GLDataType.Float);

            expect(sideAttr.nameOrLocation).toBe(3);
            expect(sideAttr.size).toBe(2);
            expect(sideAttr.type).toBe(GLDataType.Float);
        });
    });

    describe("two-point straight segment", () => {
        const p0: Vector3Like = { x: 0.0, y: 0.0, z: 0.0 };
        const p1: Vector3Like = { x: 10.0, y: 0.0, z: 0.0 };
        const points = [p0, p1];

        it("should produce 4 vertices and 6 indices for 1 line segment", () => {
            const { bufferData, totalLength } = buildPolylineRibbonBufferData(points);

            expect(totalLength).toBeCloseTo(10.0);
            expect(bufferData.vertexCount).toBe(2 * POLYLINE_VERTICES_PER_POINT);
            expect(bufferData.attributes.length).toBe(4 * POLYLINE_FLOATS_PER_VERTEX);
            expect(bufferData.indices).toBeInstanceOf(Uint16Array);
            expect(bufferData.indices?.length).toBe(POLYLINE_INDICES_PER_SEGMENT);
            expect(Array.from(bufferData.indices!)).toEqual([0, 1, 2, 2, 1, 3]);
        });

        it("should extrapolate phantom endpoint P_{-1} = 2*P_0 - P_1 = (-10, 0, 0) at origin waypoint", () => {
            const { bufferData } = buildPolylineRibbonBufferData(points);

            // Vertex 0: Positive side (+1.0)
            const v0 = decodePolylineVertex(bufferData.attributes, 0);
            expect(v0.currX).toBeCloseTo(0.0);
            expect(v0.currY).toBeCloseTo(0.0);
            expect(v0.currZ).toBeCloseTo(0.0);
            expect(v0.prevX).toBeCloseTo(-10.0);
            expect(v0.prevY).toBeCloseTo(0.0);
            expect(v0.prevZ).toBeCloseTo(0.0);
            expect(v0.nextX).toBeCloseTo(10.0);
            expect(v0.nextY).toBeCloseTo(0.0);
            expect(v0.nextZ).toBeCloseTo(0.0);
            expect(v0.side).toBeCloseTo(POLYLINE_SIDE_POSITIVE);
            expect(v0.progress).toBeCloseTo(0.0);

            // Vertex 1: Negative side (-1.0)
            const v1 = decodePolylineVertex(bufferData.attributes, 1);
            expect(v1.currX).toBeCloseTo(0.0);
            expect(v1.currY).toBeCloseTo(0.0);
            expect(v1.currZ).toBeCloseTo(0.0);
            expect(v1.prevX).toBeCloseTo(-10.0);
            expect(v1.prevY).toBeCloseTo(0.0);
            expect(v1.prevZ).toBeCloseTo(0.0);
            expect(v1.nextX).toBeCloseTo(10.0);
            expect(v1.nextY).toBeCloseTo(0.0);
            expect(v1.nextZ).toBeCloseTo(0.0);
            expect(v1.side).toBeCloseTo(POLYLINE_SIDE_NEGATIVE);
            expect(v1.progress).toBeCloseTo(0.0);
        });

        it("should extrapolate phantom endpoint P_N = 2*P_{n-1} - P_{n-2} = (20, 0, 0) at terminal waypoint", () => {
            const { bufferData } = buildPolylineRibbonBufferData(points);

            // Vertex 2: Positive side (+1.0)
            const v2 = decodePolylineVertex(bufferData.attributes, 2);
            expect(v2.currX).toBeCloseTo(10.0);
            expect(v2.currY).toBeCloseTo(0.0);
            expect(v2.currZ).toBeCloseTo(0.0);
            expect(v2.prevX).toBeCloseTo(0.0);
            expect(v2.prevY).toBeCloseTo(0.0);
            expect(v2.prevZ).toBeCloseTo(0.0);
            expect(v2.nextX).toBeCloseTo(20.0);
            expect(v2.nextY).toBeCloseTo(0.0);
            expect(v2.nextZ).toBeCloseTo(0.0);
            expect(v2.side).toBeCloseTo(POLYLINE_SIDE_POSITIVE);
            expect(v2.progress).toBeCloseTo(10.0);

            // Vertex 3: Negative side (-1.0)
            const v3 = decodePolylineVertex(bufferData.attributes, 3);
            expect(v3.currX).toBeCloseTo(10.0);
            expect(v3.currY).toBeCloseTo(0.0);
            expect(v3.currZ).toBeCloseTo(0.0);
            expect(v3.prevX).toBeCloseTo(0.0);
            expect(v3.prevY).toBeCloseTo(0.0);
            expect(v3.prevZ).toBeCloseTo(0.0);
            expect(v3.nextX).toBeCloseTo(20.0);
            expect(v3.nextY).toBeCloseTo(0.0);
            expect(v3.nextZ).toBeCloseTo(0.0);
            expect(v3.side).toBeCloseTo(POLYLINE_SIDE_NEGATIVE);
            expect(v3.progress).toBeCloseTo(10.0);
        });
    });

    describe("multi-segment 3D path and cumulative distance calculation", () => {
        it("should compute cumulative 3D distances across multiple path segments", () => {
            // Segment 1: (0, 0, 0) -> (3, 4, 0), length = sqrt(9 + 16) = 5.0
            // Segment 2: (3, 4, 0) -> (3, 4, 12), length = sqrt(0 + 0 + 144) = 12.0
            // Total length = 5.0 + 12.0 = 17.0
            const points: Vector3Like[] = [
                { x: 0.0, y: 0.0, z: 0.0 },
                { x: 3.0, y: 4.0, z: 0.0 },
                { x: 3.0, y: 4.0, z: 12.0 },
            ];

            const { bufferData, totalLength } = buildPolylineRibbonBufferData(points);

            expect(totalLength).toBeCloseTo(17.0);
            expect(bufferData.vertexCount).toBe(3 * POLYLINE_VERTICES_PER_POINT);
            expect(bufferData.indices?.length).toBe(2 * POLYLINE_INDICES_PER_SEGMENT);

            // Waypoint 0 (vertices 0, 1) -> progress = 0.0
            const v0 = decodePolylineVertex(bufferData.attributes, 0);
            expect(v0.progress).toBeCloseTo(0.0);

            // Waypoint 1 (vertices 2, 3) -> progress = 5.0
            const v2 = decodePolylineVertex(bufferData.attributes, 2);
            expect(v2.currX).toBeCloseTo(3.0);
            expect(v2.currY).toBeCloseTo(4.0);
            expect(v2.currZ).toBeCloseTo(0.0);
            expect(v2.prevX).toBeCloseTo(0.0);
            expect(v2.prevY).toBeCloseTo(0.0);
            expect(v2.prevZ).toBeCloseTo(0.0);
            expect(v2.nextX).toBeCloseTo(3.0);
            expect(v2.nextY).toBeCloseTo(4.0);
            expect(v2.nextZ).toBeCloseTo(12.0);
            expect(v2.progress).toBeCloseTo(5.0);

            // Waypoint 2 (vertices 4, 5) -> progress = 17.0
            const v4 = decodePolylineVertex(bufferData.attributes, 4);
            expect(v4.currX).toBeCloseTo(3.0);
            expect(v4.currY).toBeCloseTo(4.0);
            expect(v4.currZ).toBeCloseTo(12.0);
            expect(v4.progress).toBeCloseTo(17.0);

            // Indices sequence for 2 quad segments: [0, 1, 2, 2, 1, 3] and [2, 3, 4, 4, 3, 5]
            expect(Array.from(bufferData.indices!)).toEqual([
                0, 1, 2, 2, 1, 3,
                2, 3, 4, 4, 3, 5,
            ]);
        });

        it("should accept points as a contiguous Float32Array", () => {
            const raw = new Float32Array([
                0.0, 0.0, 0.0,
                0.0, 5.0, 0.0,
                0.0, 5.0, 5.0,
            ]);

            const { bufferData, totalLength } = buildPolylineRibbonBufferData(raw);

            expect(totalLength).toBeCloseTo(10.0);
            expect(bufferData.vertexCount).toBe(6);

            const v2 = decodePolylineVertex(bufferData.attributes, 2);
            expect(v2.currX).toBeCloseTo(0.0);
            expect(v2.currY).toBeCloseTo(5.0);
            expect(v2.currZ).toBeCloseTo(0.0);
            expect(v2.progress).toBeCloseTo(5.0);
        });

        it("should allocate Uint32Array for indices when vertexCount exceeds 65535", () => {
            // 32768 points * 2 vertices/point = 65536 vertices > 65535
            const largeCount = 32768;
            const largePoints = new Float32Array(largeCount * 3);
            for (let i = 0; i < largeCount; i++) {
                largePoints[i * 3 + 0] = i;
                largePoints[i * 3 + 1] = 0;
                largePoints[i * 3 + 2] = 0;
            }

            const { bufferData } = buildPolylineRibbonBufferData(largePoints);

            expect(bufferData.vertexCount).toBe(65536);
            expect(bufferData.indices).toBeInstanceOf(Uint32Array);
            expect(bufferData.indices?.length).toBe((largeCount - 1) * POLYLINE_INDICES_PER_SEGMENT);
        });
    });
});

describe("PolylineGeometry", () => {
    describe("constructor", () => {
        it("should initialize default empty geometry with 0 points and 0 total length", () => {
            const geometry = new PolylineGeometry();

            expect(geometry.pointsCount).toBe(0);
            expect(geometry.totalLength).toBe(0.0);
            expect(geometry.vertexCount).toBe(0);
            expect(geometry.indexCount).toBe(0);
            expect(geometry.primitiveType).toBe(GLPrimitive.Triangles);
            expect(geometry.isDisposed).toBe(false);
            expect(geometry.id).toMatch(/^MeshGeometry_\d+$/);
        });

        it("should initialize with initial points from options", () => {
            const points: Vector3Like[] = [
                { x: 0.0, y: 0.0, z: 0.0 },
                { x: 10.0, y: 0.0, z: 0.0 },
            ];
            const geometry = new PolylineGeometry({ points });

            expect(geometry.pointsCount).toBe(2);
            expect(geometry.totalLength).toBeCloseTo(10.0);
            expect(geometry.vertexCount).toBe(4);
            expect(geometry.indexCount).toBe(6);
        });

        it("should accept custom id", () => {
            const customId = "route-geometry-alpha";
            const geometry = new PolylineGeometry(undefined, customId);

            expect(geometry.id).toBe(customId);
        });
    });

    describe(".pointsCount and .totalLength", () => {
        it("should expose read-only waypoint count and accumulated 3D arc-length distance", () => {
            const points: Vector3Like[] = [
                { x: 0.0, y: 0.0, z: 0.0 },
                { x: 3.0, y: 4.0, z: 0.0 },
            ];
            const geometry = new PolylineGeometry({ points });

            expect(geometry.pointsCount).toBe(2);
            expect(geometry.totalLength).toBeCloseTo(5.0);
        });
    });

    describe(".setPoints()", () => {
        it("should update path waypoints, recompute totalLength, rebuild buffers, and return this (fluent chaining)", () => {
            const geometry = new PolylineGeometry();
            const initialVersion = geometry.version;

            const newPoints: Vector3Like[] = [
                { x: 0.0, y: 0.0, z: 0.0 },
                { x: 0.0, y: 10.0, z: 0.0 },
                { x: 0.0, y: 10.0, z: 10.0 },
            ];

            const returned = geometry.setPoints(newPoints);

            expect(returned).toBe(geometry);
            expect(geometry.pointsCount).toBe(3);
            expect(geometry.totalLength).toBeCloseTo(20.0);
            expect(geometry.vertexCount).toBe(6);
            expect(geometry.indexCount).toBe(12);
            expect(geometry.version).toBeGreaterThan(initialVersion);
        });

        it("should accept Float32Array as input to setPoints", () => {
            const geometry = new PolylineGeometry();
            const rawPoints = new Float32Array([
                1.0, 2.0, 3.0,
                4.0, 6.0, 3.0,
            ]);

            geometry.setPoints(rawPoints);

            expect(geometry.pointsCount).toBe(2);
            expect(geometry.totalLength).toBeCloseTo(5.0); // dx=3, dy=4, dz=0
            expect(geometry.vertexCount).toBe(4);
        });

        it("should gracefully clear buffers when updated with fewer than 2 points", () => {
            const geometry = new PolylineGeometry({
                points: [
                    { x: 0.0, y: 0.0, z: 0.0 },
                    { x: 1.0, y: 1.0, z: 1.0 },
                ],
            });
            expect(geometry.vertexCount).toBe(4);

            geometry.setPoints([{ x: 0.0, y: 0.0, z: 0.0 }]);

            expect(geometry.pointsCount).toBe(1);
            expect(geometry.totalLength).toBe(0.0);
            expect(geometry.vertexCount).toBe(0);
            expect(geometry.indexCount).toBe(0);
        });
    });

    describe(".getPoints()", () => {
        it("should return a safe semantic copy of the current 3D path waypoints", () => {
            const originalPoints: Vector3Like[] = [
                { x: 1.5, y: 2.5, z: 3.5 },
                { x: 4.5, y: 5.5, z: 6.5 },
            ];
            const geometry = new PolylineGeometry({ points: originalPoints });

            const retrieved = geometry.getPoints();

            expect(retrieved.length).toBe(2);
            expect(retrieved[0]).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
            expect(retrieved[1]).toEqual({ x: 4.5, y: 5.5, z: 6.5 });

            // Mutating retrieved object must not mutate geometry state
            (retrieved[0] as { x: number }).x = 999.0;
            const secondRetrieval = geometry.getPoints();
            expect(secondRetrieval[0].x).toBeCloseTo(1.5);
        });

        it("should return an empty array when geometry has no points", () => {
            const geometry = new PolylineGeometry();
            expect(geometry.getPoints()).toEqual([]);
        });
    });

    describe(".dispose()", () => {
        it("should mark geometry as disposed and notify onDispose callbacks", () => {
            const geometry = new PolylineGeometry({
                points: [
                    { x: 0, y: 0, z: 0 },
                    { x: 1, y: 0, z: 0 },
                ],
            });
            const disposeCallback = vi.fn();
            geometry.onDispose(disposeCallback);

            geometry.dispose();

            expect(geometry.isDisposed).toBe(true);
            expect(disposeCallback).toHaveBeenCalledTimes(1);
            expect(disposeCallback).toHaveBeenCalledWith(geometry);
        });

        it("should be idempotent on repeated disposal calls", () => {
            const geometry = new PolylineGeometry();
            const disposeCallback = vi.fn();
            geometry.onDispose(disposeCallback);

            geometry.dispose();
            geometry.dispose();

            expect(geometry.isDisposed).toBe(true);
            expect(disposeCallback).toHaveBeenCalledTimes(1);
        });
    });
});
