import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GeometryManager } from "./geometry_manager";
import { VertexBuffer } from "./vertex_buffer";
import type { VertexLayoutSpec } from "./vertex_layout_types";
import type { IMeshGeometry } from "../../scene/models/mesh_geometry_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { createMockContextManager } from "../../testing/mocks/mock_context_manager";
import { SubsystemRestorationPriority } from "../core/subsystem_types";

describe("GeometryManager", () => {
    let gl: WebGL2RenderingContext;
    let cm: ReturnType<typeof createMockContextManager>;
    let geometryManager: GeometryManager;

    const testLayout: VertexLayoutSpec = {
        attributes: [
            { nameOrLocation: 0, description: "position", size: 3 },
            { nameOrLocation: 1, description: "uv", size: 2 },
        ],
    };

    function createDummyGeometry(attributes?: Float32Array, indices?: Uint16Array): IMeshGeometry {
        const disposeCallbacks: Array<() => void> = [];
        return {
            id: 1,
            version: 1,
            vertexCount: 4,
            indexCount: indices ? indices.length : null,
            primitiveType: 4, // gl.TRIANGLES
            isDisposed: false,
            bufferData: {
                layout: testLayout,
                attributes: attributes ?? new Float32Array([0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0]),
                indices: indices ?? new Uint16Array([0, 1, 2, 2, 3, 0]),
                version: 1,
            },
            onDispose: vi.fn((cb: () => void) => {
                disposeCallbacks.push(cb);
                return () => {};
            }),
            dispose: vi.fn(() => {
                for (const cb of disposeCallbacks) {
                    cb();
                }
            }),
        } as unknown as IMeshGeometry;
    }

    beforeEach(() => {
        gl = createMockWebGL2Context();
        cm = createMockContextManager(gl);
        geometryManager = new GeometryManager(cm);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("metadata and subsystem registration", () => {
        it("identifies as geometry subsystem with Priority 30 (Geometry)", () => {
            expect(geometryManager.name).toBe("geometry");
            expect(geometryManager.restorationPriority).toBe(SubsystemRestorationPriority.Geometry);
            expect(geometryManager.geometryCount).toBe(0);
            expect(geometryManager.activeGeometryId).toBeNull();
        });
    });

    describe(".createVertexBuffer()", () => {
        it("allocates a managed VertexBuffer instance with layout", () => {
            const buffer = geometryManager.createVertexBuffer(testLayout);
            expect(buffer).toBeInstanceOf(VertexBuffer);
            expect(buffer.layout).toBe(testLayout);
            expect(geometryManager.getDiagnostics().resourceCount).toBe(1);
        });

        it("automatically evicts buffer from internal set when buffer.dispose() is called", () => {
            const buffer = geometryManager.createVertexBuffer(testLayout);
            expect(geometryManager.getDiagnostics().resourceCount).toBe(1);

            buffer.dispose();
            expect(geometryManager.getDiagnostics().resourceCount).toBe(0);
        });
    });

    describe(".onContextLost() and .onContextRestored()", () => {
        it("forwards onContextLost to all standalone buffers and resets active geometry ID", () => {
            const buffer1 = geometryManager.createVertexBuffer(testLayout);
            const buffer2 = geometryManager.createVertexBuffer(testLayout);
            const lostSpy1 = vi.spyOn(buffer1, "onContextLost");
            const lostSpy2 = vi.spyOn(buffer2, "onContextLost");

            const geom = createDummyGeometry();
            geometryManager.bind(geom);
            expect(geometryManager.activeGeometryId).not.toBeNull();

            geometryManager.onContextLost();

            expect(geometryManager.activeGeometryId).toBeNull();
            expect(lostSpy1).toHaveBeenCalledTimes(1);
            expect(lostSpy2).toHaveBeenCalledTimes(1);
        });

        it("forwards onContextRestored to all standalone buffers with new gl context", () => {
            const buffer1 = geometryManager.createVertexBuffer(testLayout);
            const buffer2 = geometryManager.createVertexBuffer(testLayout);
            const restoredSpy1 = vi.spyOn(buffer1, "onContextRestored");
            const restoredSpy2 = vi.spyOn(buffer2, "onContextRestored");

            const newGl = createMockWebGL2Context();
            geometryManager.onContextRestored(newGl);

            expect(restoredSpy1).toHaveBeenCalledWith(newGl);
            expect(restoredSpy2).toHaveBeenCalledWith(newGl);
        });
    });

    describe(".destroy()", () => {
        it("disposes standalone buffers and mesh records upon geometryManager.destroy()", () => {
            const buffer = geometryManager.createVertexBuffer(testLayout);
            const bufferDisposeSpy = vi.spyOn(buffer, "dispose");

            const geom = createDummyGeometry();
            const record = geometryManager.bind(geom);
            const recordBufferDisposeSpy = vi.spyOn(record.vertexBuffer, "dispose");

            geometryManager.destroy();

            expect(bufferDisposeSpy).toHaveBeenCalled();
            expect(recordBufferDisposeSpy).toHaveBeenCalled();
            expect(geometryManager.getDiagnostics().resourceCount).toBe(0);
            expect(geometryManager.activeGeometryId).toBeNull();
        });
    });

    describe("mesh geometry lifecycle and deduplication", () => {
        it("binds a mesh geometry and lazily creates record and VertexBuffer", () => {
            const geom = createDummyGeometry();
            const record = geometryManager.bind(geom);

            expect(record).toBeDefined();
            expect(record.vertexBuffer).toBeInstanceOf(VertexBuffer);
            expect(geometryManager.hasRecord(geom)).toBe(true);
            expect(geometryManager.getRecord(geom)).toBe(record);
            expect(geometryManager.activeGeometryId).toBe(record.id);
        });

        it("skips redundant binding if already active", () => {
            const geom = createDummyGeometry();
            const record = geometryManager.bind(geom);
            const bindSpy = vi.spyOn(record.vertexBuffer, "bind");

            // Second bind of the same geometry without unbinding
            geometryManager.bind(geom);
            expect(bindSpy).not.toHaveBeenCalled();
        });

        it("unbinds the active VAO and clears activeGeometryId", () => {
            const geom = createDummyGeometry();
            geometryManager.bind(geom);
            expect(geometryManager.activeGeometryId).not.toBeNull();

            geometryManager.unbind();
            expect(geometryManager.activeGeometryId).toBeNull();
            expect(gl.bindVertexArray).toHaveBeenCalledWith(null);
        });

        it("disposes mesh GPU resources on geometry.dispose() callback", () => {
            const geom = createDummyGeometry();
            const record = geometryManager.bind(geom);
            const bufferDisposeSpy = vi.spyOn(record.vertexBuffer, "dispose");

            geom.dispose();

            expect(bufferDisposeSpy).toHaveBeenCalled();
            expect(geometryManager.hasRecord(geom)).toBe(false);
            expect(geometryManager.geometryCount).toBe(0);
        });

        it("disposes old vertex buffer when re-allocating an invalidated record after context loss", () => {
            const geom = createDummyGeometry();
            const initialRecord = geometryManager.bind(geom);
            const oldVertexBuffer = initialRecord.vertexBuffer;
            const oldDisposeSpy = vi.spyOn(oldVertexBuffer, "dispose");

            geometryManager.onContextLost();
            expect(initialRecord.uploadedVersion).toBe(-1);

            const newRecord = geometryManager.bind(geom);
            expect(oldDisposeSpy).toHaveBeenCalled();
            expect(newRecord.vertexBuffer).not.toBe(oldVertexBuffer);
        });

        it("syncs buffer data when geometry version increases", () => {
            const geom = createDummyGeometry();
            const record = geometryManager.bind(geom);

            const newAttrs = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
            geom.bufferData.attributes = newAttrs;
            (geom as any).version = 2;

            const setDataSpy = vi.spyOn(record.vertexBuffer, "setData");
            geometryManager.bind(geom);

            expect(setDataSpy).toHaveBeenCalledWith(newAttrs);
            expect(record.uploadedVersion).toBe(2);
        });
    });

    describe(".draw()", () => {
        it("executes gl.drawElements for indexed geometries", () => {
            const geom = createDummyGeometry(undefined, new Uint16Array([0, 1, 2]));
            geometryManager.draw(geom);

            expect(gl.drawElements).toHaveBeenCalledWith(
                geom.primitiveType,
                3,
                gl.UNSIGNED_SHORT,
                0
            );
        });

        it("executes gl.drawArrays for non-indexed geometries", () => {
            const geom = createDummyGeometry(new Float32Array([0, 0, 0, 1, 1, 1]), undefined);
            (geom.bufferData as any).indices = undefined;
            (geom as any).indexCount = null;

            geometryManager.draw(geom);

            expect(gl.drawArrays).toHaveBeenCalledWith(
                geom.primitiveType,
                0,
                geom.vertexCount
            );
        });
    });

    describe(".dispose(geometry)", () => {
        it("immediately deletes index buffer and disposes vertex buffer for the geometry", () => {
            const geom = createDummyGeometry();
            const record = geometryManager.bind(geom);
            const vboDisposeSpy = vi.spyOn(record.vertexBuffer, "dispose");
            const iboHandle = record.indexBuffer;

            geometryManager.dispose(geom);

            expect(vboDisposeSpy).toHaveBeenCalledTimes(1);
            if (iboHandle) {
                expect(gl.deleteBuffer).toHaveBeenCalledWith(iboHandle);
            }
            expect(geometryManager.hasRecord(geom)).toBe(false);
        });

        it("is safe to call if geometry is not tracked", () => {
            const geom = createDummyGeometry();
            expect(() => geometryManager.dispose(geom)).not.toThrow();
        });
    });

    describe("diagnostics reporting", () => {
        it("accurately reports mesh record and standalone buffer counts", () => {
            const geom = createDummyGeometry();
            geometryManager.bind(geom);
            geometryManager.createVertexBuffer(testLayout);

            const diag = geometryManager.getDiagnostics();
            expect(diag.name).toBe("geometry");
            expect(diag.resourceCount).toBe(2);
            expect(diag.activeBindings).toBe(1);

            geometryManager.unbind();
            expect(geometryManager.getDiagnostics().activeBindings).toBe(0);
        });
    });
});
