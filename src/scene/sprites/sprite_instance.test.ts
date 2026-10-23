import { describe, it, expect, vi, beforeEach } from "vitest";
import { SpriteInstance } from "./sprite_instance";
import { SpriteGeometry } from "./sprite_geometry";
import { SpritePinMaterial } from "./sprite_pin_material";
import { SpriteTextureMaterial } from "./sprite_texture_material";
import { SceneNode } from "../core/scene_node";
import type { ISceneNode } from "../core/scene_node_types";
import { isRenderable, type RenderContext } from "../core/renderable_types";
import { BillboardMode, SpriteSizeMode } from "./sprite_instance_types";
import type { Vector2Like } from "../../maths/vector_types";
import { createMockContextManager, createMockShaderProgram } from "../../testing/mocks/mock_context_manager";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";
import { PerspectiveCamera } from "../camera/perspective_camera";
import {
    DEFAULT_PIN_ANCHOR_X,
    DEFAULT_PIN_ANCHOR_Y,
    DEFAULT_SPRITE_SIZE_X,
    DEFAULT_SPRITE_SIZE_Y,
    DEFAULT_SPRITE_RENDER_ORDER,
    DEFAULT_ALWAYS_ON_TOP_RENDER_ORDER,
} from "./sprite_constants";

const CUSTOM_ANCHOR_X = 0.5;
const CUSTOM_ANCHOR_Y = 0.5;
const CUSTOM_SIZE_W = 64.0;
const CUSTOM_SIZE_H = 128.0;
const SECONDARY_SIZE_W = 48.0;
const SECONDARY_SIZE_H = 96.0;

const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const CLAMP_MIN_PIXELS = 16.0;
const CLAMP_MAX_PIXELS = 256.0;

describe("SpriteInstance", () => {
    beforeEach(() => {
        SpriteGeometry.disposeSharedQuad();
    });

    function createTestContext() {
        const gl = createMockWebGL2Context();
        const contextManager = createMockContextManager(gl);
        const shader = createMockShaderProgram("sprite_sdf_pin");
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

    describe("constructor and default initialization", () => {
        it("should initialize default pin anchor (0.5, 0.0), size (32, 32), and screen-space spherical billboarding", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            expect(instance.material).toBe(material);
            expect(instance.isRenderable).toBe(true);
            expect(isRenderable(instance)).toBe(true);
            expect(instance.name).toBe("SpriteInstance");
            expect(instance.id).toMatch(/^SpriteInstance_\d+_[a-z0-9]+$/);

            const anchor = instance.getAnchor();
            expect(anchor.x).toBeCloseTo(DEFAULT_PIN_ANCHOR_X);
            expect(anchor.y).toBeCloseTo(DEFAULT_PIN_ANCHOR_Y);

            const size = instance.getSize();
            expect(size.x).toBeCloseTo(DEFAULT_SPRITE_SIZE_X);
            expect(size.y).toBeCloseTo(DEFAULT_SPRITE_SIZE_Y);

            expect(instance.sizeMode).toBe(SpriteSizeMode.ScreenSpace);
            expect(instance.billboardMode).toBe(BillboardMode.Spherical);
            expect(instance.sizeClamping).toBeUndefined();
            expect(instance.renderOrder).toBe(DEFAULT_SPRITE_RENDER_ORDER);
        });

        it("should automatically bind the shared unit quad geometry singleton", () => {
            const material = new SpritePinMaterial();
            const instance1 = new SpriteInstance({ material });
            const instance2 = new SpriteInstance({ material });

            expect(instance1.geometry).toBe(SpriteGeometry.getSharedQuad());
            expect(instance1.geometry).toBe(instance2.geometry);
            expect(instance1.geometry.isShared).toBe(true);
        });

        it("should assign DEFAULT_ALWAYS_ON_TOP_RENDER_ORDER when material has alwaysOnTop = true", () => {
            const material = new SpritePinMaterial({ alwaysOnTop: true });
            const instance = new SpriteInstance({ material });

            expect(instance.renderOrder).toBe(DEFAULT_ALWAYS_ON_TOP_RENDER_ORDER);
        });

        it("should accept explicit renderOrder overriding material default", () => {
            const material = new SpritePinMaterial({ alwaysOnTop: true });
            const explicitOrder = 9999;
            const instance = new SpriteInstance({
                material,
                renderOrder: explicitOrder,
            });

            expect(instance.renderOrder).toBe(explicitOrder);
        });

        it("should accept custom options (anchor, size, sizeMode, sizeClamping, billboardMode, name, id)", () => {
            const material = new SpritePinMaterial();
            const customName = "WaypointMarker";
            const customId = "waypoint-42";
            const instance = new SpriteInstance(
                {
                    material,
                    anchor: { x: CUSTOM_ANCHOR_X, y: CUSTOM_ANCHOR_Y },
                    size: { x: CUSTOM_SIZE_W, y: CUSTOM_SIZE_H },
                    sizeMode: SpriteSizeMode.ClampedScreenSpace,
                    sizeClamping: { minPixels: CLAMP_MIN_PIXELS, maxPixels: CLAMP_MAX_PIXELS },
                    billboardMode: BillboardMode.Cylindrical,
                },
                customName,
                customId
            );

            expect(instance.name).toBe(customName);
            expect(instance.id).toBe(customId);

            const anchor = instance.getAnchor();
            expect(anchor.x).toBeCloseTo(CUSTOM_ANCHOR_X);
            expect(anchor.y).toBeCloseTo(CUSTOM_ANCHOR_Y);

            const size = instance.getSize();
            expect(size.x).toBeCloseTo(CUSTOM_SIZE_W);
            expect(size.y).toBeCloseTo(CUSTOM_SIZE_H);

            expect(instance.sizeMode).toBe(SpriteSizeMode.ClampedScreenSpace);
            expect(instance.sizeClamping).toEqual({
                minPixels: CLAMP_MIN_PIXELS,
                maxPixels: CLAMP_MAX_PIXELS,
            });
            expect(instance.billboardMode).toBe(BillboardMode.Cylindrical);
        });
    });

    describe("getAnchor()", () => {
        it("should return a new Vector2Like object with current anchor coordinates", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({
                material,
                anchor: { x: CUSTOM_ANCHOR_X, y: CUSTOM_ANCHOR_Y },
            });

            const res = instance.getAnchor();
            expect(res).toEqual({ x: CUSTOM_ANCHOR_X, y: CUSTOM_ANCHOR_Y });
        });

        it("should return a safe copy preventing external mutation of internal typed array", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            const copy = instance.getAnchor();
            copy.x = 0.999;
            copy.y = 0.888;

            const secondCopy = instance.getAnchor();
            expect(secondCopy.x).toBeCloseTo(DEFAULT_PIN_ANCHOR_X);
            expect(secondCopy.y).toBeCloseTo(DEFAULT_PIN_ANCHOR_Y);
        });

        it("should write into target-out object and return it (zero-allocation contract)", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            const out: Vector2Like = { x: 0, y: 0 };
            const returned = instance.getAnchor(out);

            expect(returned).toBe(out);
            expect(out.x).toBeCloseTo(DEFAULT_PIN_ANCHOR_X);
            expect(out.y).toBeCloseTo(DEFAULT_PIN_ANCHOR_Y);
        });
    });

    describe("setAnchor()", () => {
        it("should accept a Vector2Like semantic object, update state, and return this", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            const returned = instance.setAnchor({ x: CUSTOM_ANCHOR_X, y: CUSTOM_ANCHOR_Y });
            expect(returned).toBe(instance);

            const anchor = instance.getAnchor();
            expect(anchor.x).toBeCloseTo(CUSTOM_ANCHOR_X);
            expect(anchor.y).toBeCloseTo(CUSTOM_ANCHOR_Y);
        });

        it("should accept scalar components (x, y), update state, and return this", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            const returned = instance.setAnchor(CUSTOM_ANCHOR_X, CUSTOM_ANCHOR_Y);
            expect(returned).toBe(instance);

            const anchor = instance.getAnchor();
            expect(anchor.x).toBeCloseTo(CUSTOM_ANCHOR_X);
            expect(anchor.y).toBeCloseTo(CUSTOM_ANCHOR_Y);
        });

        it("should mark transform dirty when anchor values change", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            instance.updateWorldTransform();
            expect(instance.isWorldDirty).toBe(false);

            instance.setAnchor(CUSTOM_ANCHOR_X, CUSTOM_ANCHOR_Y);
            expect(instance.isWorldDirty).toBe(true);
        });

        it("should skip marking dirty when setting identical anchor values", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({
                material,
                anchor: { x: CUSTOM_ANCHOR_X, y: CUSTOM_ANCHOR_Y },
            });

            instance.updateWorldTransform();
            expect(instance.isWorldDirty).toBe(false);

            instance.setAnchor(CUSTOM_ANCHOR_X, CUSTOM_ANCHOR_Y);
            expect(instance.isWorldDirty).toBe(false);
        });
    });

    describe("getSize()", () => {
        it("should return a new Vector2Like object with current dimensions", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({
                material,
                size: { x: CUSTOM_SIZE_W, y: CUSTOM_SIZE_H },
            });

            const res = instance.getSize();
            expect(res).toEqual({ x: CUSTOM_SIZE_W, y: CUSTOM_SIZE_H });
        });

        it("should return a safe copy preventing external mutation of internal storage", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            const copy = instance.getSize();
            copy.x = 999.0;
            copy.y = 888.0;

            const secondCopy = instance.getSize();
            expect(secondCopy.x).toBeCloseTo(DEFAULT_SPRITE_SIZE_X);
            expect(secondCopy.y).toBeCloseTo(DEFAULT_SPRITE_SIZE_Y);
        });

        it("should write into target-out object and return it (zero-allocation contract)", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            const out: Vector2Like = { x: 0, y: 0 };
            const returned = instance.getSize(out);

            expect(returned).toBe(out);
            expect(out.x).toBeCloseTo(DEFAULT_SPRITE_SIZE_X);
            expect(out.y).toBeCloseTo(DEFAULT_SPRITE_SIZE_Y);
        });
    });

    describe("setSize()", () => {
        it("should accept a Vector2Like semantic object, update state, and return this", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            const returned = instance.setSize({ x: CUSTOM_SIZE_W, y: CUSTOM_SIZE_H });
            expect(returned).toBe(instance);

            const size = instance.getSize();
            expect(size.x).toBeCloseTo(CUSTOM_SIZE_W);
            expect(size.y).toBeCloseTo(CUSTOM_SIZE_H);
        });

        it("should accept scalar components (width, height), update state, and return this", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            const returned = instance.setSize(CUSTOM_SIZE_W, CUSTOM_SIZE_H);
            expect(returned).toBe(instance);

            const size = instance.getSize();
            expect(size.x).toBeCloseTo(CUSTOM_SIZE_W);
            expect(size.y).toBeCloseTo(CUSTOM_SIZE_H);
        });

        it("should mark transform dirty when size values change", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            instance.updateWorldTransform();
            expect(instance.isWorldDirty).toBe(false);

            instance.setSize(CUSTOM_SIZE_W, CUSTOM_SIZE_H);
            expect(instance.isWorldDirty).toBe(true);
        });

        it("should skip marking dirty when setting identical size values", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({
                material,
                size: { x: CUSTOM_SIZE_W, y: CUSTOM_SIZE_H },
            });

            instance.updateWorldTransform();
            expect(instance.isWorldDirty).toBe(false);

            instance.setSize(CUSTOM_SIZE_W, CUSTOM_SIZE_H);
            expect(instance.isWorldDirty).toBe(false);
        });
    });

    describe("markDirty()", () => {
        it("should invalidate world transform dirty flag", () => {
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            instance.updateWorldTransform();
            expect(instance.isWorldDirty).toBe(false);

            instance.markDirty();
            expect(instance.isWorldDirty).toBe(true);
        });
    });

    describe("render()", () => {
        it("should upload anchor, size, billboardMode, sizeMode, sizeClamping, viewportSize, and issue draw call", () => {
            const { context, gl, contextManager, shader } = createTestContext();
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({
                material,
                anchor: { x: CUSTOM_ANCHOR_X, y: CUSTOM_ANCHOR_Y },
                size: { x: CUSTOM_SIZE_W, y: CUSTOM_SIZE_H },
                billboardMode: BillboardMode.Cylindrical,
                sizeMode: SpriteSizeMode.ClampedScreenSpace,
                sizeClamping: { minPixels: CLAMP_MIN_PIXELS, maxPixels: CLAMP_MAX_PIXELS },
            });

            instance.transform.setPosition(10, 20, 30);
            instance.updateWorldTransform();

            instance.render(context);

            // 1. Pipeline configuration
            expect(contextManager.applyPipelineState).toHaveBeenCalledWith(material.pipelineState);
            expect(contextManager.shaders.bindKey).toHaveBeenCalledWith(material.shaderKey);

            // 2. Uniform uploads via WebGL2RenderingContext uniform2fv
            expect(gl.uniform2fv).toHaveBeenCalledWith(
                expect.anything(),
                expect.any(Float32Array)
            );

            // 3. Uniform uploads via ShaderProgram
            expect(shader.setMat4).toHaveBeenCalledWith("u_modelMatrix", instance.worldMatrix);
            expect(shader.setInt).toHaveBeenCalledWith("u_billboardMode", BillboardMode.Cylindrical);
            expect(shader.setInt).toHaveBeenCalledWith("u_sizeMode", SpriteSizeMode.ClampedScreenSpace);
            expect(shader.setVec2).toHaveBeenCalledWith("u_sizeClamping", CLAMP_MIN_PIXELS, CLAMP_MAX_PIXELS);
            expect(shader.setVec2).toHaveBeenCalledWith("u_viewportSize", VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

            // 4. Shared geometry draw
            expect(contextManager.geometries.draw).toHaveBeenCalledWith(instance.geometry);
        });

        it("should fallback to default unclamped bounds (0, 10000) when sizeClamping is not defined", () => {
            const { context, shader } = createTestContext();
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });

            instance.render(context);

            expect(shader.setVec2).toHaveBeenCalledWith("u_sizeClamping", 0, 10000);
        });

        it("should safely skip rendering when visible is false", () => {
            const { context, contextManager } = createTestContext();
            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });
            instance.visible = false;

            instance.render(context);

            expect(contextManager.geometries.draw).not.toHaveBeenCalled();
        });

        it("should safely skip rendering when parent hierarchy makes computedVisible false", () => {
            const { context, contextManager } = createTestContext();
            const parent = new SceneNode("ParentNode");
            parent.visible = false;

            const material = new SpritePinMaterial();
            const instance = new SpriteInstance({ material });
            parent.addChild(instance);
            parent.updateWorldTransform();

            expect(instance.computedVisible).toBe(false);

            instance.render(context);

            expect(contextManager.geometries.draw).not.toHaveBeenCalled();
        });
    });

    describe("scene graph hierarchy and lifecycle", () => {
        it("should inherit SceneNode transform and propagate parent world matrix updates", () => {
            const material = new SpritePinMaterial();
            const parent = new SceneNode("StarCluster");
            const pin = new SpriteInstance({ material }, "StarPin");
            parent.addChild(pin);

            parent.transform.setPosition(100, 200, 300);
            pin.transform.setPosition(0, 10, 0);

            parent.updateWorldTransform();

            const wm = pin.worldMatrix;
            expect(wm[12]).toBeCloseTo(100);
            expect(wm[13]).toBeCloseTo(210);
            expect(wm[14]).toBeCloseTo(300);
        });

        it("should be discoverable via scene node traverse()", () => {
            const root = new SceneNode("Root");
            const material = new SpritePinMaterial();
            const pin = new SpriteInstance({ material }, "TargetPin");
            root.addChild(pin);

            const visited: ISceneNode[] = [];
            root.traverse((node) => visited.push(node));

            expect(visited).toContain(pin);
        });

        it("should clean up hierarchy and trigger onDestroy listeners on destroy() without disposing shared quad geometry", () => {
            const material = new SpritePinMaterial();
            const parent = new SceneNode("Parent");
            const pin = new SpriteInstance({ material });
            parent.addChild(pin);

            let destroyedFired = false;
            pin.onDestroy(() => {
                destroyedFired = true;
            });

            expect(pin.geometry.isDisposed).toBe(false);

            pin.destroy();

            expect(destroyedFired).toBe(true);
            expect(pin.parent).toBeNull();
            expect(parent.children).not.toContain(pin);

            // Crucial: Shared quad geometry must NOT be disposed by destroying a single SpriteInstance
            expect(pin.geometry.isDisposed).toBe(false);
            expect(SpriteGeometry.getSharedQuad().isDisposed).toBe(false);
        });
    });
});
