import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    buildSpriteQuadBufferData,
    SpriteGeometry,
    SPRITE_VERTEX_LAYOUT,
} from "./sprite_geometry";
import { SPRITE_SHARED_QUAD_ID } from "./sprite_constants";
import { GLDataType, GLPrimitive } from "../../webgl/core/webgl_constants_types";

const FLOATS_PER_VERTEX = 4;
const QUAD_VERTEX_COUNT = 4;
const TOTAL_ATTRIBUTE_FLOATS = QUAD_VERTEX_COUNT * FLOATS_PER_VERTEX;
const QUAD_INDEX_COUNT = 6;
const STRIDE_BYTES = 16;

describe("buildSpriteQuadBufferData", () => {
    it("should produce a GeometryBufferData with 4 vertices and 16 floats attributes", () => {
        const data = buildSpriteQuadBufferData();

        expect(data.vertexCount).toBe(QUAD_VERTEX_COUNT);
        expect(data.attributes).toBeInstanceOf(Float32Array);
        expect(data.attributes.length).toBe(TOTAL_ATTRIBUTE_FLOATS);
    });

    it("should reference SPRITE_VERTEX_LAYOUT with 16-byte stride and 2 vec2 float attributes", () => {
        const data = buildSpriteQuadBufferData();

        expect(data.layout).toBe(SPRITE_VERTEX_LAYOUT);
        expect(data.layout.stride).toBe(STRIDE_BYTES);
        expect(data.layout.attributes.length).toBe(2);

        const posAttr = data.layout.attributes[0];
        expect(posAttr.nameOrLocation).toBe(0);
        expect(posAttr.size).toBe(2);
        expect(posAttr.type).toBe(GLDataType.Float);

        const uvAttr = data.layout.attributes[1];
        expect(uvAttr.nameOrLocation).toBe(1);
        expect(uvAttr.size).toBe(2);
        expect(uvAttr.type).toBe(GLDataType.Float);
    });

    it("should generate 6 counter-clockwise indices forming two triangles [0, 1, 2, 0, 2, 3]", () => {
        const data = buildSpriteQuadBufferData();

        expect(data.indices).toBeInstanceOf(Uint16Array);
        expect(data.indices?.length).toBe(QUAD_INDEX_COUNT);
        expect(Array.from(data.indices!)).toEqual([0, 1, 2, 0, 2, 3]);
    });

    it("should map 2D positions and UV coordinates spanning the unit quad [0, 1] x [0, 1]", () => {
        const data = buildSpriteQuadBufferData();
        const attrs = data.attributes;

        // Vertex 0: Bottom-left -> pos(0, 0), uv(0, 0)
        expect(attrs[0]).toBeCloseTo(0.0);
        expect(attrs[1]).toBeCloseTo(0.0);
        expect(attrs[2]).toBeCloseTo(0.0);
        expect(attrs[3]).toBeCloseTo(0.0);

        // Vertex 1: Bottom-right -> pos(1, 0), uv(1, 0)
        expect(attrs[4]).toBeCloseTo(1.0);
        expect(attrs[5]).toBeCloseTo(0.0);
        expect(attrs[6]).toBeCloseTo(1.0);
        expect(attrs[7]).toBeCloseTo(0.0);

        // Vertex 2: Top-right -> pos(1, 1), uv(1, 1)
        expect(attrs[8]).toBeCloseTo(1.0);
        expect(attrs[9]).toBeCloseTo(1.0);
        expect(attrs[10]).toBeCloseTo(1.0);
        expect(attrs[11]).toBeCloseTo(1.0);

        // Vertex 3: Top-left -> pos(0, 1), uv(0, 1)
        expect(attrs[12]).toBeCloseTo(0.0);
        expect(attrs[13]).toBeCloseTo(1.0);
        expect(attrs[14]).toBeCloseTo(0.0);
        expect(attrs[15]).toBeCloseTo(1.0);
    });
});

describe("SpriteGeometry", () => {
    beforeEach(() => {
        SpriteGeometry.disposeSharedQuad();
    });

    describe("constructor", () => {
        it("should initialize standalone geometry with isShared false by default", () => {
            const geometry = new SpriteGeometry();

            expect(geometry.isShared).toBe(false);
            expect(geometry.primitiveType).toBe(GLPrimitive.Triangles);
            expect(geometry.vertexCount).toBe(QUAD_VERTEX_COUNT);
            expect(geometry.indexCount).toBe(QUAD_INDEX_COUNT);
            expect(geometry.isDisposed).toBe(false);
            expect(geometry.id).toMatch(/^MeshGeometry_\d+$/);
        });

        it("should accept custom id and isShared = false", () => {
            const customId = "custom-sprite-geom-42";
            const geometry = new SpriteGeometry(false, customId);

            expect(geometry.isShared).toBe(false);
            expect(geometry.id).toBe(customId);
        });

        it("should assign SPRITE_SHARED_QUAD_ID when isShared is true and id is omitted", () => {
            const geometry = new SpriteGeometry(true);

            expect(geometry.isShared).toBe(true);
            expect(geometry.id).toBe(SPRITE_SHARED_QUAD_ID);
        });
    });

    describe("getSharedQuad()", () => {
        it("should instantiate and return a singleton SpriteGeometry with isShared = true", () => {
            const shared = SpriteGeometry.getSharedQuad();

            expect(shared).toBeInstanceOf(SpriteGeometry);
            expect(shared.isShared).toBe(true);
            expect(shared.id).toBe(SPRITE_SHARED_QUAD_ID);
            expect(shared.isDisposed).toBe(false);
        });

        it("should return the exact same instance on consecutive calls (referential identity)", () => {
            const first = SpriteGeometry.getSharedQuad();
            const second = SpriteGeometry.getSharedQuad();

            expect(first).toBe(second);
        });

        it("should allocate a fresh shared quad if the previous instance was disposed", () => {
            const first = SpriteGeometry.getSharedQuad();
            SpriteGeometry.disposeSharedQuad();

            const second = SpriteGeometry.getSharedQuad();
            expect(first).not.toBe(second);
            expect(first.isDisposed).toBe(true);
            expect(second.isDisposed).toBe(false);
        });
    });

    describe("disposeSharedQuad()", () => {
        it("should force disposal of the active singleton and reset internal reference", () => {
            const shared = SpriteGeometry.getSharedQuad();
            const disposeSpy = vi.spyOn(shared, "dispose");

            SpriteGeometry.disposeSharedQuad();

            expect(disposeSpy).toHaveBeenCalledWith(true);
            expect(shared.isDisposed).toBe(true);

            // Calling again should be safe no-op
            expect(() => SpriteGeometry.disposeSharedQuad()).not.toThrow();
        });
    });

    describe("dispose()", () => {
        it("should safely ignore unforced disposal when isShared is true to protect concurrent billboard instances", () => {
            const shared = SpriteGeometry.getSharedQuad();
            const listener = vi.fn();
            shared.onDispose(listener);

            shared.dispose(); // force is undefined (falsy)
            expect(shared.isDisposed).toBe(false);
            expect(listener).not.toHaveBeenCalled();

            shared.dispose(false);
            expect(shared.isDisposed).toBe(false);
            expect(listener).not.toHaveBeenCalled();
        });

        it("should dispose shared quad when force is explicitly true", () => {
            const shared = SpriteGeometry.getSharedQuad();
            const listener = vi.fn();
            shared.onDispose(listener);

            shared.dispose(true);
            expect(shared.isDisposed).toBe(true);
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(shared);
        });

        it("should dispose standalone geometry when force is omitted or false", () => {
            const standalone = new SpriteGeometry(false);
            const listener = vi.fn();
            standalone.onDispose(listener);

            standalone.dispose();
            expect(standalone.isDisposed).toBe(true);
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(standalone);
        });

        it("should be idempotent on repeated disposal calls", () => {
            const standalone = new SpriteGeometry(false);
            const listener = vi.fn();
            standalone.onDispose(listener);

            standalone.dispose();
            standalone.dispose();
            standalone.dispose(true);

            expect(standalone.isDisposed).toBe(true);
            expect(listener).toHaveBeenCalledTimes(1);
        });
    });
});
