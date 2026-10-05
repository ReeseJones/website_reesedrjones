import { describe, it, expect, vi } from "vitest";
import { MeshGeometry } from "./mesh_geometry";
import type { GeometryBufferData, IMeshGeometry } from "./mesh_geometry_types";
import type { VertexLayoutSpec } from "../../webgl/geometry/vertex_layout_types";
import { GLDataType, GLPrimitive } from "../../webgl/core/webgl_constants_types";

/**
 * Creates a standard test vertex layout with 2 interleaved attributes:
 * - position: vec3 (3 * 4 = 12 bytes)
 * - uv: vec2 (2 * 4 = 8 bytes)
 * Total stride: 20 bytes (5 floats per vertex).
 */
function createTestLayout(strideOverride?: number): VertexLayoutSpec {
    return {
        attributes: [
            {
                nameOrLocation: 0,
                description: "a_position",
                size: 3,
                type: WebGL2RenderingContext.FLOAT,
                componentBytes: 4,
            },
            {
                nameOrLocation: 1,
                description: "a_uv",
                size: 2,
                type: WebGL2RenderingContext.FLOAT,
                componentBytes: 4,
            },
        ],
        stride: strideOverride,
    };
}

/**
 * Helper constructing test GeometryBufferData without any WebGL context.
 */
function createTestBufferData(options?: {
    vertexCount?: number;
    withIndices?: boolean;
    useUint32?: boolean;
    strideOverride?: number;
}): GeometryBufferData {
    const count = options?.vertexCount ?? 3;
    const layout = createTestLayout(options?.strideOverride);
    const floatsPerVertex = 5;
    const attributes = new Float32Array(count * floatsPerVertex);
    for (let i = 0; i < attributes.length; i++) {
        attributes[i] = i * 0.5;
    }

    let indices: Uint16Array | Uint32Array | undefined;
    if (options?.withIndices) {
        if (options.useUint32) {
            indices = new Uint32Array([0, 1, 2]);
        } else {
            indices = new Uint16Array([0, 1, 2]);
        }
    }

    return {
        attributes,
        layout,
        vertexCount: count,
        indices,
    };
}

describe("MeshGeometry", () => {
    describe("constructor", () => {
        it("should create geometry with valid attributes, layout, and vertexCount", () => {
            const bufferData = createTestBufferData({ vertexCount: 3 });
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.vertexCount).toBe(3);
            expect(geometry.bufferData.attributes).toBe(bufferData.attributes);
            expect(geometry.bufferData.layout).toBe(bufferData.layout);
            expect(geometry.bufferData.vertexCount).toBe(3);
        });

        it("should support a custom explicit id", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(
                bufferData,
                WebGL2RenderingContext.TRIANGLES,
                "custom-mesh-id"
            );

            expect(geometry.id).toBe("custom-mesh-id");
        });

        it("should generate an automatic prefixed id when id is omitted", () => {
            const bufferData = createTestBufferData();
            const geom1 = new MeshGeometry(bufferData);
            const geom2 = new MeshGeometry(bufferData);

            expect(geom1.id).toMatch(/^MeshGeometry_\d+$/);
            expect(geom2.id).toMatch(/^MeshGeometry_\d+$/);
            expect(geom1.id).not.toBe(geom2.id);
        });

        it("should support optional index buffer (indexed vs non-indexed)", () => {
            const nonIndexedData = createTestBufferData({ withIndices: false });
            const nonIndexedGeom = new MeshGeometry(nonIndexedData);
            expect(nonIndexedGeom.indexCount).toBeNull();
            expect(nonIndexedGeom.bufferData.indices).toBeUndefined();

            const indexedData = createTestBufferData({ withIndices: true });
            const indexedGeom = new MeshGeometry(indexedData);
            expect(indexedGeom.indexCount).toBe(3);
            expect(indexedGeom.bufferData.indices).toBeInstanceOf(Uint16Array);
        });

        it("should default primitiveType to TRIANGLES (4 / GLPrimitive.Triangles)", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.primitiveType).toBe(GLPrimitive.Triangles);
            expect(geometry.primitiveType).toBe(WebGL2RenderingContext.TRIANGLES);
            expect(geometry.primitiveType).toBe(4);
        });

        it("should support a custom primitiveType override", () => {
            const bufferData = createTestBufferData();
            const linesGeometry = new MeshGeometry(
                bufferData,
                GLPrimitive.Lines
            );
            expect(linesGeometry.primitiveType).toBe(GLPrimitive.Lines);
            expect(linesGeometry.primitiveType).toBe(1);

            const pointsGeometry = new MeshGeometry(
                bufferData,
                GLPrimitive.Points
            );
            expect(pointsGeometry.primitiveType).toBe(GLPrimitive.Points);
            expect(pointsGeometry.primitiveType).toBe(0);
        });

        it("should initialize version to 0 and isDisposed to false", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.version).toBe(0);
            expect(geometry.isDisposed).toBe(false);
        });
    });

    describe("id", () => {
        it("should return the immutable string id provided at construction", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData, undefined, "static_id_101");

            expect(geometry.id).toBe("static_id_101");
        });

        it("should preserve auto-generated id across mutations and version bumps", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);
            const initialId = geometry.id;

            geometry.markDirty();
            geometry.setAttributes(new Float32Array(15), 3);
            expect(geometry.id).toBe(initialId);
        });
    });

    describe("isDisposed", () => {
        it("should return false for newly created geometry", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.isDisposed).toBe(false);
        });

        it("should return true after dispose() is invoked", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            geometry.dispose();
            expect(geometry.isDisposed).toBe(true);
        });
    });

    describe("version", () => {
        it("should initialize version to 0", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.version).toBe(0);
        });

        it("should increment on setAttributes()", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            geometry.setAttributes(new Float32Array(20));
            expect(geometry.version).toBe(1);
        });

        it("should increment on setIndices()", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            geometry.setIndices(new Uint16Array([0, 1, 2]));
            expect(geometry.version).toBe(1);
        });

        it("should increment on markDirty()", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            geometry.markDirty();
            expect(geometry.version).toBe(1);
        });

        it("should track sequential mutations cumulatively", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.version).toBe(0);
            geometry.markDirty();
            expect(geometry.version).toBe(1);
            geometry.setAttributes(new Float32Array(15), 3);
            expect(geometry.version).toBe(2);
            geometry.setIndices(new Uint16Array([0, 1, 2]));
            expect(geometry.version).toBe(3);
            geometry.setIndices(undefined);
            expect(geometry.version).toBe(4);
            geometry.markDirty();
            expect(geometry.version).toBe(5);
        });
    });

    describe("vertexCount", () => {
        it("should return the correct vertex count from bufferData", () => {
            const bufferData = createTestBufferData({ vertexCount: 5 });
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.vertexCount).toBe(5);
        });

        it("should return updated vertexCount when changed via setAttributes()", () => {
            const bufferData = createTestBufferData({ vertexCount: 3 });
            const geometry = new MeshGeometry(bufferData);

            geometry.setAttributes(new Float32Array(30), 6);
            expect(geometry.vertexCount).toBe(6);
        });
    });

    describe("primitiveType", () => {
        it("should return configured primitiveType", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData, WebGL2RenderingContext.TRIANGLE_STRIP);

            expect(geometry.primitiveType).toBe(WebGL2RenderingContext.TRIANGLE_STRIP);
            expect(geometry.primitiveType).toBe(5);
        });

        it("should remain constant across buffer mutations", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData, WebGL2RenderingContext.TRIANGLES);

            geometry.markDirty();
            geometry.setAttributes(new Float32Array(25));
            expect(geometry.primitiveType).toBe(WebGL2RenderingContext.TRIANGLES);
        });
    });

    describe("indexCount", () => {
        it("should return null when non-indexed", () => {
            const bufferData = createTestBufferData({ withIndices: false });
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.indexCount).toBeNull();
        });

        it("should return index count for Uint16Array indexed geometry", () => {
            const bufferData = createTestBufferData({ withIndices: true, useUint32: false });
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.indexCount).toBe(3);
        });

        it("should return index count for Uint32Array indexed geometry", () => {
            const bufferData = createTestBufferData({ withIndices: true, useUint32: true });
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.indexCount).toBe(3);
        });

        it("should update dynamically when indices change or are cleared", () => {
            const bufferData = createTestBufferData({ withIndices: false });
            const geometry = new MeshGeometry(bufferData);
            expect(geometry.indexCount).toBeNull();

            geometry.setIndices(new Uint16Array([0, 1, 2, 0, 2, 3]));
            expect(geometry.indexCount).toBe(6);

            geometry.setIndices(undefined);
            expect(geometry.indexCount).toBeNull();
        });
    });

    describe("bufferData", () => {
        it("should return GeometryBufferData with attributes, layout, vertexCount, indices", () => {
            const bufferData = createTestBufferData({ vertexCount: 4, withIndices: true });
            const geometry = new MeshGeometry(bufferData);

            const retrieved = geometry.bufferData;
            expect(retrieved).toBe(bufferData);
            expect(retrieved.attributes).toBe(bufferData.attributes);
            expect(retrieved.layout).toBe(bufferData.layout);
            expect(retrieved.vertexCount).toBe(4);
            expect(retrieved.indices).toBe(bufferData.indices);
        });

        it("should reflect mutated attributes and indices within bufferData", () => {
            const bufferData = createTestBufferData({ vertexCount: 3, withIndices: false });
            const geometry = new MeshGeometry(bufferData);

            const newAttrs = new Float32Array(25);
            geometry.setAttributes(newAttrs, 5);
            expect(geometry.bufferData.attributes).toBe(newAttrs);
            expect(geometry.bufferData.vertexCount).toBe(5);

            const newIndices = new Uint16Array([0, 1, 2]);
            geometry.setIndices(newIndices);
            expect(geometry.bufferData.indices).toBe(newIndices);
        });
    });

    describe("setAttributes", () => {
        it("should replace attributes and increment version", () => {
            const bufferData = createTestBufferData({ vertexCount: 3 });
            const geometry = new MeshGeometry(bufferData);
            const initialVersion = geometry.version;

            const newAttrs = new Float32Array(15);
            geometry.setAttributes(newAttrs);

            expect(geometry.bufferData.attributes).toBe(newAttrs);
            expect(geometry.version).toBe(initialVersion + 1);
        });

        it("should automatically recompute vertexCount based on layout stride if vertexCount not explicitly provided", () => {
            // Layout: 2 attributes: vec3 (12 bytes) + vec2 (8 bytes) = 20 bytes stride = 5 floats/vertex
            const bufferData = createTestBufferData({ vertexCount: 3 });
            const geometry = new MeshGeometry(bufferData);

            // 35 floats = 7 vertices * 5 floats per vertex (140 bytes / 20 bytes = 7 vertices)
            const newAttrs = new Float32Array(35);
            geometry.setAttributes(newAttrs);

            expect(geometry.vertexCount).toBe(7);
            expect(geometry.bufferData.vertexCount).toBe(7);
        });

        it("should respect explicit vertexCount override if provided", () => {
            const bufferData = createTestBufferData({ vertexCount: 3 });
            const geometry = new MeshGeometry(bufferData);

            // 35 floats would calculate to 7 vertices, but explicit override is 4
            const newAttrs = new Float32Array(35);
            geometry.setAttributes(newAttrs, 4);

            expect(geometry.vertexCount).toBe(4);
            expect(geometry.bufferData.vertexCount).toBe(4);
        });

        it("should respect layout explicit stride override when recomputing vertexCount", () => {
            // Explicit stride override of 24 bytes (6 floats per vertex)
            const bufferData = createTestBufferData({ vertexCount: 2, strideOverride: 24 });
            const geometry = new MeshGeometry(bufferData);

            // 24 floats * 4 bytes = 96 bytes / 24 bytes = 4 vertices
            const newAttrs = new Float32Array(24);
            geometry.setAttributes(newAttrs);

            expect(geometry.vertexCount).toBe(4);
        });

        it("should retain existing vertexCount if layout stride is 0", () => {
            const emptyLayout: VertexLayoutSpec = { attributes: [] };
            const bufferData: GeometryBufferData = {
                attributes: new Float32Array(10),
                layout: emptyLayout,
                vertexCount: 9,
            };
            const geometry = new MeshGeometry(bufferData);

            geometry.setAttributes(new Float32Array(20));
            expect(geometry.vertexCount).toBe(9);
        });
    });

    describe("setIndices", () => {
        it("should update index buffer and increment version", () => {
            const bufferData = createTestBufferData({ withIndices: false });
            const geometry = new MeshGeometry(bufferData);
            const initialVersion = geometry.version;

            const indices = new Uint16Array([0, 1, 2]);
            geometry.setIndices(indices);

            expect(geometry.bufferData.indices).toBe(indices);
            expect(geometry.indexCount).toBe(3);
            expect(geometry.version).toBe(initialVersion + 1);
        });

        it("should support Uint32Array indices", () => {
            const bufferData = createTestBufferData({ withIndices: false });
            const geometry = new MeshGeometry(bufferData);

            const indices = new Uint32Array([100000, 100001, 100002]);
            geometry.setIndices(indices);

            expect(geometry.bufferData.indices).toBe(indices);
            expect(geometry.indexCount).toBe(3);
        });

        it("should clear indices when passed undefined and reset indexCount to null", () => {
            const bufferData = createTestBufferData({ withIndices: true });
            const geometry = new MeshGeometry(bufferData);
            expect(geometry.indexCount).toBe(3);

            geometry.setIndices(undefined);
            expect(geometry.bufferData.indices).toBeUndefined();
            expect(geometry.indexCount).toBeNull();
        });

        it("should increment version even when clearing indices to undefined", () => {
            const bufferData = createTestBufferData({ withIndices: true });
            const geometry = new MeshGeometry(bufferData);
            const verBefore = geometry.version;

            geometry.setIndices(undefined);
            expect(geometry.version).toBe(verBefore + 1);
        });
    });

    describe("markDirty", () => {
        it("should increment version without changing buffer references", () => {
            const bufferData = createTestBufferData({ withIndices: true });
            const geometry = new MeshGeometry(bufferData);

            const initialAttrs = geometry.bufferData.attributes;
            const initialIndices = geometry.bufferData.indices;
            const initialCount = geometry.vertexCount;
            const initialVersion = geometry.version;

            geometry.markDirty();

            expect(geometry.version).toBe(initialVersion + 1);
            expect(geometry.bufferData.attributes).toBe(initialAttrs);
            expect(geometry.bufferData.indices).toBe(initialIndices);
            expect(geometry.vertexCount).toBe(initialCount);
        });

        it("should increment version on multiple consecutive calls", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            geometry.markDirty();
            geometry.markDirty();
            geometry.markDirty();
            expect(geometry.version).toBe(3);
        });
    });

    describe("onDispose", () => {
        it("should register a listener that is invoked when dispose() is called", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);
            const listener = vi.fn();

            geometry.onDispose(listener);
            expect(listener).not.toHaveBeenCalled();

            geometry.dispose();
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it("should pass the geometry instance to the listener", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);
            const listener = vi.fn();

            geometry.onDispose(listener);
            geometry.dispose();

            expect(listener).toHaveBeenCalledWith(geometry);
        });

        it("should return an unsubscribe function that prevents listener invocation", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);
            const listener = vi.fn();

            const unsubscribe = geometry.onDispose(listener);
            unsubscribe();

            geometry.dispose();
            expect(listener).not.toHaveBeenCalled();
        });

        it("should execute multiple listeners in registration order", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);
            const callOrder: string[] = [];

            geometry.onDispose(() => {
                callOrder.push("listener1");
            });
            geometry.onDispose(() => {
                callOrder.push("listener2");
            });
            geometry.onDispose(() => {
                callOrder.push("listener3");
            });

            geometry.dispose();
            expect(callOrder).toEqual(["listener1", "listener2", "listener3"]);
        });

        it("should safely handle errors thrown inside a listener without breaking subsequent listeners", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const failingListener = vi.fn(() => {
                throw new Error("Disposal error");
            });
            const succeedingListener = vi.fn();

            geometry.onDispose(failingListener);
            geometry.onDispose(succeedingListener);

            expect(() => geometry.dispose()).not.toThrow();
            expect(failingListener).toHaveBeenCalledTimes(1);
            expect(succeedingListener).toHaveBeenCalledTimes(1);
            expect(errorSpy).toHaveBeenCalled();

            errorSpy.mockRestore();
        });
    });

    describe("dispose", () => {
        it("should set isDisposed to true", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);

            expect(geometry.isDisposed).toBe(false);
            geometry.dispose();
            expect(geometry.isDisposed).toBe(true);
        });

        it("should invoke all registered listeners exactly once", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);
            const listener = vi.fn();

            geometry.onDispose(listener);
            geometry.dispose();

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it("should be idempotent (calling multiple times does not re-invoke listeners)", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);
            const listener = vi.fn();

            geometry.onDispose(listener);
            geometry.dispose();
            geometry.dispose();
            geometry.dispose();

            expect(listener).toHaveBeenCalledTimes(1);
            expect(geometry.isDisposed).toBe(true);
        });

        it("should clear registered listeners upon disposal so newly added listeners are not invoked after disposal", () => {
            const bufferData = createTestBufferData();
            const geometry = new MeshGeometry(bufferData);
            const listener = vi.fn();

            geometry.dispose();
            geometry.onDispose(listener);
            geometry.dispose();

            expect(listener).not.toHaveBeenCalled();
        });
    });
});
