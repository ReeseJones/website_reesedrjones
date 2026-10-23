import { describe, it, expect, vi } from "vitest";
import { PolylineInstance } from "./polyline_instance";
import { PolylineGeometry } from "./polyline_geometry";
import { PolylineMaterial } from "./polyline_material";
import {
    PolylineJoinStyle,
    PolylineCapStyle,
} from "./polyline_instance_types";
import {
    DEFAULT_POLYLINE_RENDER_ORDER,
    DEFAULT_POLYLINE_WIDTH,
    DEFAULT_POLYLINE_MITER_LIMIT,
    DEFAULT_POLYLINE_GLOW_INTENSITY,
    DEFAULT_POLYLINE_DASH_SPEED,
    DEFAULT_POLYLINE_DASH_FREQUENCY,
    DEFAULT_POLYLINE_COLOR_R,
    DEFAULT_POLYLINE_COLOR_G,
    DEFAULT_POLYLINE_COLOR_B,
    DEFAULT_POLYLINE_COLOR_A,
    DEFAULT_POLYLINE_GLOW_R,
    DEFAULT_POLYLINE_GLOW_G,
    DEFAULT_POLYLINE_GLOW_B,
    DEFAULT_POLYLINE_GLOW_A,
} from "./polyline_constants";
import { SceneNode } from "../core/scene_node";
import { isRenderable, type RenderContext } from "../core/renderable_types";
import type { Vector3Like } from "../../maths/vector_types";
import type { RgbaLike } from "../../helpers/colors_types";
import { createMockContextManager, createMockShaderProgram } from "../../testing/mocks/mock_context_manager";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { PerspectiveCamera } from "../camera/perspective_camera";

const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;

function createTestContext() {
    const gl = createMockWebGL2Context();
    const contextManager = createMockContextManager(gl);
    const shader = createMockShaderProgram("polyline_ribbon");
    contextManager.shaders.bindKey = vi.fn(() => shader as any);

    const camera = new PerspectiveCamera({ fov: 60, aspect: 16 / 9, near: 0.1, far: 1000 });
    camera.transform.setPosition(0, 0, 10);
    camera.updateWorldTransform();
    camera.updateMatrices();

    const context: RenderContext = {
        contextManager,
        gl,
        camera,
        dimensions: {
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            cssWidth: VIEWPORT_WIDTH,
            cssHeight: VIEWPORT_HEIGHT,
            aspect: 16 / 9,
            dpr: 1,
        },
        time: 1.0,
        frameId: 1,
    };

    return { context, gl, contextManager, shader, camera };
}

describe("PolylineInstance", () => {
    describe("constructor and default initialization", () => {
        it("should initialize with default parameters, identity transform, and renderable flags", () => {
            const instance = new PolylineInstance();

            expect(instance.isRenderable).toBe(true);
            expect(isRenderable(instance)).toBe(true);
            expect(instance.name).toBe("PolylineInstance");
            expect(instance.id).toMatch(/^PolylineInstance_\d+_[a-z0-9]+$/);
            expect(instance.renderOrder).toBe(DEFAULT_POLYLINE_RENDER_ORDER);
            expect(instance.joinStyle).toBe(PolylineJoinStyle.Miter);
            expect(instance.capStyle).toBe(PolylineCapStyle.Round);

            expect(instance.geometry).toBeInstanceOf(PolylineGeometry);
            expect(instance.geometry.pointsCount).toBe(0);

            expect(instance.material).toBeInstanceOf(PolylineMaterial);
            expect(instance.width).toBeCloseTo(DEFAULT_POLYLINE_WIDTH);
            expect(instance.miterLimit).toBeCloseTo(DEFAULT_POLYLINE_MITER_LIMIT);
            expect(instance.glowIntensity).toBeCloseTo(DEFAULT_POLYLINE_GLOW_INTENSITY);
            expect(instance.dashSpeed).toBeCloseTo(DEFAULT_POLYLINE_DASH_SPEED);
            expect(instance.dashFrequency).toBeCloseTo(DEFAULT_POLYLINE_DASH_FREQUENCY);
        });

        it("should accept custom options in constructor", () => {
            const customMaterial = new PolylineMaterial({ lineWidth: 10.0 });
            const points: Vector3Like[] = [
                { x: 0, y: 0, z: 0 },
                { x: 10, y: 0, z: 0 },
            ];

            const instance = new PolylineInstance({
                points,
                material: customMaterial,
                joinStyle: PolylineJoinStyle.Round,
                capStyle: PolylineCapStyle.Square,
                renderOrder: 3500,
            });

            expect(instance.geometry.pointsCount).toBe(2);
            expect(instance.material).toBe(customMaterial);
            expect(instance.joinStyle).toBe(PolylineJoinStyle.Round);
            expect(instance.capStyle).toBe(PolylineCapStyle.Square);
            expect(instance.renderOrder).toBe(3500);
        });

        it("should accept custom name and id", () => {
            const customName = "PlayerRouteAlpha";
            const customId = "route-node-42";
            const instance = new PolylineInstance(undefined, customName, customId);

            expect(instance.name).toBe(customName);
            expect(instance.id).toBe(customId);
        });

        it("should construct default material with passed scalar options when custom material is omitted", () => {
            const instance = new PolylineInstance({
                width: 6.0,
                miterLimit: 4.0,
                glowIntensity: 2.0,
                dashSpeed: 1.0,
                dashFrequency: 0.2,
                color: { r: 0.2, g: 0.3, b: 0.4, a: 0.9 },
                glowColor: { r: 0.6, g: 0.7, b: 0.8, a: 0.95 },
            });

            expect(instance.width).toBeCloseTo(6.0);
            expect(instance.miterLimit).toBeCloseTo(4.0);
            expect(instance.glowIntensity).toBeCloseTo(2.0);
            expect(instance.dashSpeed).toBeCloseTo(1.0);
            expect(instance.dashFrequency).toBeCloseTo(0.2);

            const color = instance.getColor();
            expect(color.r).toBeCloseTo(0.2);
            expect(color.g).toBeCloseTo(0.3);
            expect(color.b).toBeCloseTo(0.4);
            expect(color.a).toBeCloseTo(0.9);

            const glow = instance.getGlowColor();
            expect(glow.r).toBeCloseTo(0.6);
            expect(glow.g).toBeCloseTo(0.7);
            expect(glow.b).toBeCloseTo(0.8);
            expect(glow.a).toBeCloseTo(0.95);
        });
    });

    describe(".width, .miterLimit, .glowIntensity, .dashSpeed, .dashFrequency (delegating accessors)", () => {
        it("should delegate .width getter and setter to material.lineWidth", () => {
            const instance = new PolylineInstance();
            expect(instance.width).toBeCloseTo(DEFAULT_POLYLINE_WIDTH);

            instance.width = 14.0;
            expect(instance.width).toBeCloseTo(14.0);
            expect(instance.material.lineWidth).toBeCloseTo(14.0);
        });

        it("should delegate .miterLimit getter and setter to material.miterLimit", () => {
            const instance = new PolylineInstance();
            expect(instance.miterLimit).toBeCloseTo(DEFAULT_POLYLINE_MITER_LIMIT);

            instance.miterLimit = 5.5;
            expect(instance.miterLimit).toBeCloseTo(5.5);
            expect(instance.material.miterLimit).toBeCloseTo(5.5);
        });

        it("should delegate .glowIntensity getter and setter to material.glowIntensity", () => {
            const instance = new PolylineInstance();
            expect(instance.glowIntensity).toBeCloseTo(DEFAULT_POLYLINE_GLOW_INTENSITY);

            instance.glowIntensity = 3.5;
            expect(instance.glowIntensity).toBeCloseTo(3.5);
            expect(instance.material.glowIntensity).toBeCloseTo(3.5);
        });

        it("should delegate .dashSpeed getter and setter to material.dashSpeed", () => {
            const instance = new PolylineInstance();
            expect(instance.dashSpeed).toBeCloseTo(DEFAULT_POLYLINE_DASH_SPEED);

            instance.dashSpeed = 2.5;
            expect(instance.dashSpeed).toBeCloseTo(2.5);
            expect(instance.material.dashSpeed).toBeCloseTo(2.5);
        });

        it("should delegate .dashFrequency getter and setter to material.dashFrequency", () => {
            const instance = new PolylineInstance();
            expect(instance.dashFrequency).toBeCloseTo(DEFAULT_POLYLINE_DASH_FREQUENCY);

            instance.dashFrequency = 0.45;
            expect(instance.dashFrequency).toBeCloseTo(0.45);
            expect(instance.material.dashFrequency).toBeCloseTo(0.45);
        });
    });

    describe(".setPoints() and .getPoints()", () => {
        it("should update route waypoints on underlying geometry and return this (fluent chaining)", () => {
            const instance = new PolylineInstance();
            const points: Vector3Like[] = [
                { x: 1, y: 2, z: 3 },
                { x: 4, y: 5, z: 6 },
            ];

            const returned = instance.setPoints(points);

            expect(returned).toBe(instance);
            expect(instance.geometry.pointsCount).toBe(2);

            const retrieved = instance.getPoints();
            expect(retrieved.length).toBe(2);
            expect(retrieved[0]).toEqual({ x: 1, y: 2, z: 3 });
            expect(retrieved[1]).toEqual({ x: 4, y: 5, z: 6 });
        });

        it("should accept Float32Array in setPoints", () => {
            const instance = new PolylineInstance();
            const raw = new Float32Array([0, 0, 0, 10, 0, 0]);

            instance.setPoints(raw);

            expect(instance.geometry.pointsCount).toBe(2);
            expect(instance.geometry.totalLength).toBeCloseTo(10.0);
        });
    });

    describe(".getColor() and .setColor()", () => {
        it("should delegate getColor to material.getColor with and without out parameter", () => {
            const instance = new PolylineInstance();
            const color = instance.getColor();
            expect(color.r).toBeCloseTo(DEFAULT_POLYLINE_COLOR_R);

            const out: RgbaLike = { r: 0, g: 0, b: 0, a: 0 };
            const returned = instance.getColor(out);
            expect(returned).toBe(out);
            expect(out.r).toBeCloseTo(DEFAULT_POLYLINE_COLOR_R);
        });

        it("should set color using RgbaLike object and return this (fluent chaining)", () => {
            const instance = new PolylineInstance();
            const returned = instance.setColor({ r: 0.5, g: 0.25, b: 0.75, a: 0.8 });

            expect(returned).toBe(instance);
            const color = instance.getColor();
            expect(color.r).toBeCloseTo(0.5);
            expect(color.g).toBeCloseTo(0.25);
            expect(color.b).toBeCloseTo(0.75);
            expect(color.a).toBeCloseTo(0.8);
        });

        it("should set color using separate RGBA components and return this (fluent chaining)", () => {
            const instance = new PolylineInstance();
            const returned = instance.setColor(0.5, 0.25, 0.75, 0.5);

            expect(returned).toBe(instance);
            const color = instance.getColor();
            expect(color.r).toBeCloseTo(0.5);
            expect(color.g).toBeCloseTo(0.25);
            expect(color.b).toBeCloseTo(0.75);
            expect(color.a).toBeCloseTo(0.5);
        });
    });

    describe(".getGlowColor() and .setGlowColor()", () => {
        it("should delegate getGlowColor to material.getGlowColor with and without out parameter", () => {
            const instance = new PolylineInstance();
            const glow = instance.getGlowColor();
            expect(glow.r).toBeCloseTo(DEFAULT_POLYLINE_GLOW_R);

            const out: RgbaLike = { r: 0, g: 0, b: 0, a: 0 };
            const returned = instance.getGlowColor(out);
            expect(returned).toBe(out);
            expect(out.r).toBeCloseTo(DEFAULT_POLYLINE_GLOW_R);
        });

        it("should set glowColor using RgbaLike object and return this (fluent chaining)", () => {
            const instance = new PolylineInstance();
            const returned = instance.setGlowColor({ r: 0.125, g: 0.375, b: 0.625, a: 0.7 });

            expect(returned).toBe(instance);
            const glow = instance.getGlowColor();
            expect(glow.r).toBeCloseTo(0.125);
            expect(glow.g).toBeCloseTo(0.375);
            expect(glow.b).toBeCloseTo(0.625);
            expect(glow.a).toBeCloseTo(0.7);
        });

        it("should set glowColor using separate RGBA components and return this (fluent chaining)", () => {
            const instance = new PolylineInstance();
            const returned = instance.setGlowColor(0.125, 0.375, 0.625, 0.9);

            expect(returned).toBe(instance);
            const glow = instance.getGlowColor();
            expect(glow.r).toBeCloseTo(0.125);
            expect(glow.g).toBeCloseTo(0.375);
            expect(glow.b).toBeCloseTo(0.625);
            expect(glow.a).toBeCloseTo(0.9);
        });
    });

    describe(".render()", () => {
        it("should abort rendering when visible is false", () => {
            const { context, contextManager } = createTestContext();
            const instance = new PolylineInstance({
                points: [
                    { x: 0, y: 0, z: 0 },
                    { x: 10, y: 0, z: 0 },
                ],
            });
            instance.visible = false;

            instance.render(context);

            expect(contextManager.geometries.draw).not.toHaveBeenCalled();
        });

        it("should abort rendering when computedVisible is false due to a hidden ancestor", () => {
            const { context, contextManager } = createTestContext();
            const parent = new SceneNode("Parent");
            parent.visible = false;

            const instance = new PolylineInstance({
                points: [
                    { x: 0, y: 0, z: 0 },
                    { x: 10, y: 0, z: 0 },
                ],
            });
            parent.addChild(instance);
            parent.updateWorldTransform();

            expect(instance.computedVisible).toBe(false);

            instance.render(context);

            expect(contextManager.geometries.draw).not.toHaveBeenCalled();
        });

        it("should abort rendering when waypoint count is fewer than 2 (< MIN_POLYLINE_POINTS)", () => {
            const { context, contextManager } = createTestContext();
            const instance = new PolylineInstance({
                points: [{ x: 0, y: 0, z: 0 }],
            });

            instance.render(context);

            expect(contextManager.geometries.draw).not.toHaveBeenCalled();
        });

        it("should configure shader uniforms, bind material, and dispatch geometry draw when visible with valid route", () => {
            const { context, contextManager, shader } = createTestContext();
            const instance = new PolylineInstance({
                points: [
                    { x: 0, y: 0, z: 0 },
                    { x: 10, y: 0, z: 0 },
                ],
                width: 8.0,
                miterLimit: 4.5,
            });

            instance.transform.setPosition(1, 2, 3);
            instance.updateWorldTransform();

            instance.render(context);

            // Shaders and material applied
            expect(contextManager.shaders.bindKey).toHaveBeenCalledWith("polyline_ribbon");

            // Uniforms uploaded
            expect(shader.setMat4).toHaveBeenCalledWith("u_modelMatrix", instance.worldMatrix);
            expect(shader.setVec2).toHaveBeenCalledWith(
                "u_viewportResolution",
                VIEWPORT_WIDTH,
                VIEWPORT_HEIGHT
            );
            expect(shader.setFloat).toHaveBeenCalledWith("u_lineWidth", 8.0);
            expect(shader.setFloat).toHaveBeenCalledWith("u_miterLimit", 4.5);
            expect(shader.setFloat).toHaveBeenCalledWith("u_time", 1.0);
            expect(shader.setFloat).toHaveBeenCalledWith("u_dashSpeed", DEFAULT_POLYLINE_DASH_SPEED);
            expect(shader.setFloat).toHaveBeenCalledWith("u_dashFrequency", DEFAULT_POLYLINE_DASH_FREQUENCY);

            // Draw call dispatched
            expect(contextManager.geometries.draw).toHaveBeenCalledWith(instance.geometry);
        });
    });

    describe(".destroy()", () => {
        it("should dispose underlying geometry and detach from scene graph", () => {
            const parent = new SceneNode("Parent");
            const instance = new PolylineInstance({
                points: [
                    { x: 0, y: 0, z: 0 },
                    { x: 10, y: 0, z: 0 },
                ],
            });
            parent.addChild(instance);

            const geometryDisposeSpy = vi.spyOn(instance.geometry, "dispose");

            instance.destroy();

            expect(geometryDisposeSpy).toHaveBeenCalledTimes(1);
            expect(instance.geometry.isDisposed).toBe(true);
            expect(instance.parent).toBeNull();
            expect(parent.children.length).toBe(0);
        });

        it("should be safe and idempotent on repeated destroy calls", () => {
            const instance = new PolylineInstance();
            expect(() => {
                instance.destroy();
                instance.destroy();
            }).not.toThrow();
        });
    });
});
