import { describe, it, expect, vi } from "vitest";
import { ScreenQuadGeometry } from "./screen_quad_geometry";
import {
    SCREEN_QUAD_VERTEX_POSITIONS,
    SCREEN_QUAD_VERTEX_COUNT,
    SCREEN_QUAD_POSITION_COMPONENTS,
    SCREEN_QUAD_VERTEX_STRIDE_BYTES,
    DEFAULT_SCREEN_QUAD_ID,
} from "./screen_quad_geometry_constants";
import {
    SCREEN_QUAD_VERTEX_LAYOUT,
    ScreenQuadAttributeLocation,
} from "./screen_quad_geometry_types";
import { GLPrimitive } from "../../webgl/core/webgl_constants_types";

describe("ScreenQuadGeometry", () => {
    describe("constructor and options resolution", () => {
        it("constructs with default positions and default ID when no arguments provided", () => {
            const quad = new ScreenQuadGeometry();
            expect(quad.id).toBe(DEFAULT_SCREEN_QUAD_ID);
            expect(quad.vertexCount).toBe(SCREEN_QUAD_VERTEX_COUNT);
            expect(quad.bufferData.attributes).toEqual(SCREEN_QUAD_VERTEX_POSITIONS);
        });

        it("uses explicit constructor ID argument when provided", () => {
            const customId = "MyCustomScreenQuad";
            const quad = new ScreenQuadGeometry(undefined, customId);
            expect(quad.id).toBe(customId);
        });

        it("uses options.id when explicit constructor ID is omitted", () => {
            const optionsId = "OptionsScreenQuadId";
            const quad = new ScreenQuadGeometry({ id: optionsId });
            expect(quad.id).toBe(optionsId);
        });

        it("prefers constructor ID argument over options.id", () => {
            const quad = new ScreenQuadGeometry({ id: "OptionsId" }, "ExplicitConstructorId");
            expect(quad.id).toBe("ExplicitConstructorId");
        });

        it("accepts custom vertex position Float32Array via options", () => {
            const customPositions = new Float32Array([
                0.0, 0.0,
                1.0, 0.0,
                0.0, 1.0,
                1.0, 1.0,
            ]);
            const quad = new ScreenQuadGeometry({ positions: customPositions });
            expect(quad.bufferData.attributes).toBe(customPositions);
        });

        it("falls back to SCREEN_QUAD_VERTEX_POSITIONS when options has undefined positions", () => {
            const quad = new ScreenQuadGeometry({ id: "TestQuad" });
            expect(quad.bufferData.attributes).toEqual(SCREEN_QUAD_VERTEX_POSITIONS);
        });
    });

    describe("properties and layout contracts", () => {
        it("declares exactly 4 vertices for triangle strip quad", () => {
            const quad = new ScreenQuadGeometry();
            expect(quad.vertexCount).toBe(4);
        });

        it("configures primitiveType as TriangleStrip (GLPrimitive.TriangleStrip)", () => {
            const quad = new ScreenQuadGeometry();
            expect(quad.primitiveType).toBe(GLPrimitive.TriangleStrip);
            expect(quad.primitiveType).toBe(5);
        });

        it("leaves indexCount null (non-indexed geometry)", () => {
            const quad = new ScreenQuadGeometry();
            expect(quad.indexCount).toBeNull();
            expect(quad.bufferData.indices).toBeUndefined();
        });

        it("conforms to SCREEN_QUAD_VERTEX_LAYOUT spec with 1 attribute at Position location", () => {
            const quad = new ScreenQuadGeometry();
            expect(quad.bufferData.layout).toBe(SCREEN_QUAD_VERTEX_LAYOUT);
            expect(quad.bufferData.layout.attributes).toHaveLength(1);

            const positionAttr = quad.bufferData.layout.attributes[0];
            expect(positionAttr.nameOrLocation).toBe(ScreenQuadAttributeLocation.Position);
            expect(positionAttr.size).toBe(SCREEN_QUAD_POSITION_COMPONENTS);
            expect(positionAttr.size).toBe(2);
        });

        it("configures correct byte stride in vertex layout (8 bytes)", () => {
            const quad = new ScreenQuadGeometry();
            expect(quad.bufferData.layout.stride).toBe(SCREEN_QUAD_VERTEX_STRIDE_BYTES);
            expect(quad.bufferData.layout.stride).toBe(8);
        });

        it("contains exact normalized device coordinates (-1 to 1) for all 4 vertices", () => {
            const quad = new ScreenQuadGeometry();
            const attrs = quad.bufferData.attributes;

            // Vertex 0: (-1, -1) bottom-left
            expect(attrs[0]).toBe(-1.0);
            expect(attrs[1]).toBe(-1.0);

            // Vertex 1: (1, -1) bottom-right
            expect(attrs[2]).toBe(1.0);
            expect(attrs[3]).toBe(-1.0);

            // Vertex 2: (-1, 1) top-left
            expect(attrs[4]).toBe(-1.0);
            expect(attrs[5]).toBe(1.0);

            // Vertex 3: (1, 1) top-right
            expect(attrs[6]).toBe(1.0);
            expect(attrs[7]).toBe(1.0);
        });

        it("initializes version counter to 0", () => {
            const quad = new ScreenQuadGeometry();
            expect(quad.version).toBe(0);
        });

        it("initializes isDisposed to false", () => {
            const quad = new ScreenQuadGeometry();
            expect(quad.isDisposed).toBe(false);
        });
    });

    describe("MeshGeometry inherited methods and lifecycle", () => {
        it("allows updating attributes via setAttributes and increments version", () => {
            const quad = new ScreenQuadGeometry();
            const newAttrs = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]);

            quad.setAttributes(newAttrs);
            expect(quad.bufferData.attributes).toBe(newAttrs);
            expect(quad.version).toBe(1);
        });

        it("allows updating indices via setIndices", () => {
            const quad = new ScreenQuadGeometry();
            const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

            quad.setIndices(indices);
            expect(quad.bufferData.indices).toBe(indices);
            expect(quad.indexCount).toBe(6);
            expect(quad.version).toBe(1);
        });

        it("supports markDirty() to increment revision version", () => {
            const quad = new ScreenQuadGeometry();
            expect(quad.version).toBe(0);
            quad.markDirty();
            expect(quad.version).toBe(1);
            quad.markDirty();
            expect(quad.version).toBe(2);
        });

        it("registers and fires onDispose callbacks upon disposal", () => {
            const quad = new ScreenQuadGeometry();
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            quad.onDispose(callback1);
            quad.onDispose(callback2);

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();

            quad.dispose();

            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
            expect(quad.isDisposed).toBe(true);
        });

        it("allows unregistering onDispose callback via returned unsubscribe closure", () => {
            const quad = new ScreenQuadGeometry();
            const callback = vi.fn();
            const unsubscribe = quad.onDispose(callback);

            unsubscribe();
            quad.dispose();

            expect(callback).not.toHaveBeenCalled();
        });

        it("does not throw when registering onDispose callback on already disposed geometry", () => {
            const quad = new ScreenQuadGeometry();
            quad.dispose();

            const lateCallback = vi.fn();
            expect(() => quad.onDispose(lateCallback)).not.toThrow();
        });

        it("is idempotent when dispose() is called repeatedly", () => {
            const quad = new ScreenQuadGeometry();
            const callback = vi.fn();
            quad.onDispose(callback);

            quad.dispose();
            quad.dispose();
            quad.dispose();

            expect(callback).toHaveBeenCalledTimes(1);
            expect(quad.isDisposed).toBe(true);
        });

        it("catches and logs errors thrown inside onDispose subscribers without halting disposal", () => {
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            const quad = new ScreenQuadGeometry();

            quad.onDispose(() => {
                throw new Error("Subscriber failed");
            });
            const safeCallback = vi.fn();
            quad.onDispose(safeCallback);

            expect(() => quad.dispose()).not.toThrow();
            expect(safeCallback).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
