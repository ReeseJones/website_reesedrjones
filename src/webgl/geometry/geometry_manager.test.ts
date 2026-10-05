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

    describe("standalone VertexBuffer management", () => {
        it("allocates and tracks managed VertexBuffer instances", () => {
            const buffer = geometryManager.createVertexBuffer(testLayout);
            expect(buffer).toBeInstanceOf(VertexBuffer);
            expect(buffer.layout).toBe(testLayout);
            expect(geometryManager.getDiagnostics().resourceCount).toBe(1);
        });

        it("releases and destroys managed VertexBuffer instances", () => {
            const buffer = geometryManager.createVertexBuffer(testLayout);
            const destroySpy = vi.spyOn(buffer, "destroy");

            geometryManager.releaseVertexBuffer(buffer);
            expect(destroySpy).toHaveBeenCalled();
            expect(geometryManager.getDiagnostics().resourceCount).toBe(0);
        });

        it("safely handles releasing untracked VertexBuffers", () => {
            const foreignBuffer = new VertexBuffer(cm, testLayout);
            const destroySpy = vi.spyOn(foreignBuffer, "destroy");

            geometryManager.releaseVertexBuffer(foreignBuffer);
            expect(destroySpy).not.toHaveBeenCalled();
        });

        it("rebuilds standalone VertexBuffers upon context restoration", () => {
            const buffer1 = geometryManager.createVertexBuffer(testLayout);
            const buffer2 = geometryManager.createVertexBuffer(testLayout);

            const rebuildSpy1 = vi.spyOn(buffer1, "rebuild");
            const rebuildSpy2 = vi.spyOn(buffer2, "rebuild");

            const newGl = createMockWebGL2Context();
            geometryManager.onContextRestored(newGl);

            expect(rebuildSpy1).toHaveBeenCalledWith(newGl);
            expect(rebuildSpy2).toHaveBeenCalledWith(newGl);
        });

        it("destroys standalone VertexBuffers upon geometryManager.destroy()", () => {
            const buffer = geometryManager.createVertexBuffer(testLayout);
            const destroySpy = vi.spyOn(buffer, "destroy");

            geometryManager.destroy();
            expect(destroySpy).toHaveBeenCalled();
            expect(geometryManager.getDiagnostics().resourceCount).toBe(0);
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
            const bufferDestroySpy = vi.spyOn(record.vertexBuffer, "destroy");

            geom.dispose();

            expect(bufferDestroySpy).toHaveBeenCalled();
            expect(geometryManager.hasRecord(geom)).toBe(false);
            expect(geometryManager.geometryCount).toBe(0);
        });

        it("destroys old vertex buffer when re-allocating an invalidated record after context loss", () => {
            const geom = createDummyGeometry();
            const initialRecord = geometryManager.bind(geom);
            const oldVertexBuffer = initialRecord.vertexBuffer;
            const oldDestroySpy = vi.spyOn(oldVertexBuffer, "destroy");

            geometryManager.onContextLost();
            expect(initialRecord.uploadedVersion).toBe(-1);

            const newRecord = geometryManager.bind(geom);
            expect(oldDestroySpy).toHaveBeenCalled();
            expect(newRecord.vertexBuffer).not.toBe(oldVertexBuffer);
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
