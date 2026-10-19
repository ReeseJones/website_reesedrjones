import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import React, { createRef } from "react";
import { render } from "@testing-library/react";
import { Scene } from "../scene/react/scene_component";
import { useSceneFrame } from "../scene/react/use_scene_frame";
import { Scene as ProgrammaticScene } from "../scene/core/scene";
import { PerspectiveCamera as ProgrammaticCamera } from "../scene/camera/perspective_camera";
import { ModelInstance as ProgrammaticModelInstance } from "../scene/models/model_instance";
import { ScreenQuadGeometry } from "../scene/models/screen_quad_geometry";
import { GalaxyGeometry } from "../scene/models/galaxy_geometry";
import { GalacticCloudMaterial } from "../scene/materials/galactic_cloud_material";
import {
    DEFAULT_CLOUD_ASPECT,
    DEFAULT_CLOUD_PARALLAX_FACTOR,
    DEG_TO_RAD,
    GALACTIC_CLOUD_RENDER_ORDER,
    HALF_FOV_FACTOR,
} from "../scene/materials/galactic_cloud_material_constants";
import { GalaxyMaterial } from "../scene/materials/galaxy_material";
import { BlendMode } from "../scene/materials/material_types";
import { WebGLCanvasContext } from "../components/webgl_canvas/webgl_context";
import type { WebGLCanvasContextValue } from "../components/webgl_canvas/webgl_canvas_types";
import type { CanvasDimensions } from "../webgl/canvas/canvas_types";
import type { WebGLSubscriber } from "../webgl/canvas/subscriber_types";
import { createMockContextManager } from "../testing/mocks/mock_context_manager";
import { createMockAnimationFrameScheduler } from "../testing/mocks/mock_animation_frame";
import type { IMockAnimationFrameScheduler } from "../testing/mocks/mock_animation_frame_types";
import { OrientationInputController } from "./orientation_input";
import { calculateAutoFarPlane } from "./galaxy_math";
import { DEFAULT_GALAXY_PARAMETERS } from "./parameters/index";
import type { GalaxyParameters } from "./parameters/types";
import type { GalaxyController } from "./galaxy_controller_types";
import {
    CAMERA_RIG_FRAME_PRIORITY,
    DEFAULT_GALAXY_INPUT_DAMPING,
    DEFAULT_GALAXY_SCENE_PRIORITY,
    GALAXY_ASPECT_SCALE_REFERENCE,
    MAX_GALAXY_ASPECT_SCALE,
} from "./galaxy_scene_constants";
import type { GalaxyParallaxState } from "./galaxy_scene_types";
import { GalaxyCameraRig } from "./galaxy_camera_rig";
import { GalacticCloudModel } from "./galactic_cloud_model";
import { GalaxyStarsModel } from "./galaxy_stars_model";
import { GalaxyScene } from "./galaxy_scene";
import { setupSceneElements } from "../scene/elements/setup_scene_elements";

/**
 * Lightweight test parameter profile with a small starCount to keep pure-CPU geometry generation fast.
 */
function createTestGalaxyParams(overrides: Partial<GalaxyParameters> = {}): GalaxyParameters {
    return {
        ...DEFAULT_GALAXY_PARAMETERS,
        starCount: 64,
        ...overrides,
    };
}

/**
 * Creates a spy-wrapped WebGLCanvasContextValue fixture for pure-CPU component testing.
 */
function createMockCanvasContext(aspect: number = 800 / 600) {
    let currentSubscriber: WebGLSubscriber | null = null;
    const unsubscribeSpy = vi.fn();
    const subscribeSpy = vi.fn((subscriber: WebGLSubscriber) => {
        currentSubscriber = subscriber;
        return unsubscribeSpy;
    });

    const mockGl = {} as WebGL2RenderingContext;
    const mockContextManager = createMockContextManager();
    const mockDims: CanvasDimensions = {
        width: 800,
        height: 600,
        cssWidth: 800,
        cssHeight: 600,
        dpr: 1,
        aspect,
    };

    const contextValue: WebGLCanvasContextValue = {
        gl: mockGl,
        contextManager: mockContextManager,
        isSupported: true,
        isContextLost: false,
        dimensions: mockDims,
        subscribe: subscribeSpy,
        requestRender: vi.fn(),
    };

    return {
        contextValue,
        subscribeSpy,
        unsubscribeSpy,
        getSubscriber: () => currentSubscriber,
    };
}

describe("Declarative Galaxy Backdrop Components", () => {
    let scheduler: IMockAnimationFrameScheduler;
    let restoreGlobalScheduler: () => void;

    beforeAll(() => {
        setupSceneElements();
    });

    beforeEach(() => {
        scheduler = createMockAnimationFrameScheduler(1000);
        restoreGlobalScheduler = scheduler.installGlobal();
    });

    afterEach(() => {
        restoreGlobalScheduler();
    });

    describe("<GalaxyCameraRig />", () => {
        it("registers a default PerspectiveCamera ('BackdropCamera') with fov, nearPlane, and calculateAutoFarPlane computed far on parent Scene", () => {
            const { contextValue } = createMockCanvasContext();
            const sceneRef = createRef<ProgrammaticScene>();
            const params = createTestGalaxyParams({
                fov: 70,
                nearPlane: 0.25,
                cameraDistance: 350,
                diskRadius: 180,
                farPlane: 500,
            });

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene ref={sceneRef}>
                        <GalaxyCameraRig params={params} />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            const scene = sceneRef.current!;
            expect(scene).toBeInstanceOf(ProgrammaticScene);
            expect(scene.activeCamera).toBeInstanceOf(ProgrammaticCamera);

            const camera = scene.activeCamera as ProgrammaticCamera;
            expect(camera.name).toBe("BackdropCamera");
            expect(camera.fov).toBe(70);
            expect(camera.near).toBe(0.25);
            expect(camera.far).toBe(
                calculateAutoFarPlane(params.cameraDistance, params.diskRadius, params.farPlane)
            );
        });

        it("attaches OrientationInputController on mount and detaches on unmount", () => {
            const { contextValue } = createMockCanvasContext();
            const attachSpy = vi.spyOn(OrientationInputController.prototype, "attach");
            const detachSpy = vi.spyOn(OrientationInputController.prototype, "detach");

            try {
                const params = createTestGalaxyParams();
                const { unmount } = render(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene>
                            <GalaxyCameraRig params={params} />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                expect(attachSpy).toHaveBeenCalledTimes(1);
                expect(detachSpy).not.toHaveBeenCalled();

                unmount();
                expect(detachSpy).toHaveBeenCalledTimes(1);
            } finally {
                attachSpy.mockRestore();
                detachSpy.mockRestore();
            }
        });

        it("subscribes at CAMERA_RIG_FRAME_PRIORITY (-10), damps pointer input into parallaxRef.current, and updates activeCamera.transform with aspect scaling", () => {
            const { contextValue } = createMockCanvasContext(0.75);
            const sceneRef = createRef<ProgrammaticScene>();
            const parallaxRef: React.RefObject<GalaxyParallaxState> = {
                current: { pitchOffset: 0, yawOffset: 0 },
            };

            const params = createTestGalaxyParams({
                centerOffsetX: 40,
                centerOffsetY: -10,
                cameraDistance: 200,
                pitchAngle: 0,
                yawAngle: 0,
                rollAngle: 0,
                mouseSensitivity: 1.0,
                inputDamping: DEFAULT_GALAXY_INPUT_DAMPING,
            });

            const executionOrder: string[] = [];

            function DefaultPriorityObserver() {
                useSceneFrame(() => {
                    executionOrder.push("default_0");
                }, 0);
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene ref={sceneRef}>
                        <DefaultPriorityObserver />
                        <GalaxyCameraRig params={params} parallaxRef={parallaxRef} />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            const camera = sceneRef.current!.activeCamera as ProgrammaticCamera;
            camera.aspect = 0.75;

            const setPosSpy = vi.spyOn(camera.transform, "setPosition");
            const setQuatSpy = vi.spyOn(camera.transform, "setRotationQuaternion");

            // Record execution order by wrapping setPosition
            setPosSpy.mockImplementation(() => {
                executionOrder.push(`camera_rig_${CAMERA_RIG_FRAME_PRIORITY}`);
                return camera.transform;
            });

            // Simulate pointer move at bottom-right corner
            Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
            Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
            window.dispatchEvent(
                new PointerEvent("pointermove", { clientX: 1000, clientY: 1000 })
            );

            // Step 100ms (dt = 0.1s)
            scheduler.stepFrame(100);

            // Verify CAMERA_RIG_FRAME_PRIORITY (-10) executed before priority 0
            expect(executionOrder).toEqual([
                `camera_rig_${CAMERA_RIG_FRAME_PRIORITY}`,
                "default_0",
            ]);

            // Verify exponential damping on parallaxRef
            const expectedDecay = 1.0 - Math.exp(-DEFAULT_GALAXY_INPUT_DAMPING * 0.1);
            // At (1000, 1000), normalized (x, y) = (1, 1) -> targetPitch = -0.4, targetYaw = 0.5
            expect(parallaxRef.current.pitchOffset).toBeCloseTo(-0.4 * expectedDecay, 5);
            expect(parallaxRef.current.yawOffset).toBeCloseTo(0.5 * expectedDecay, 5);

            expect(setPosSpy).toHaveBeenCalledTimes(1);
            expect(setQuatSpy).toHaveBeenCalledTimes(1);

            // Verify narrow aspect scaling on X translation when angles are 0
            const zeroAngleParams = createTestGalaxyParams({
                centerOffsetX: 60,
                centerOffsetY: -15,
                cameraDistance: 250,
                pitchAngle: 0,
                yawAngle: 0,
                rollAngle: 0,
                mouseSensitivity: 0,
            });

            const narrowSceneRef = createRef<ProgrammaticScene>();
            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene ref={narrowSceneRef}>
                        <GalaxyCameraRig params={zeroAngleParams} />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            const narrowCam = narrowSceneRef.current!.activeCamera as ProgrammaticCamera;
            narrowCam.aspect = 0.75; // aspectScale = min(1.0, 0.75 / 1.5) = 0.5

            scheduler.stepFrame(16);

            const expectedAspectScale = Math.min(
                MAX_GALAXY_ASPECT_SCALE,
                0.75 / GALAXY_ASPECT_SCALE_REFERENCE
            );
            const pos = narrowCam.transform.getPosition();
            // View matrix translates by [offsetX, offsetY, -cameraDistance], so inverse view matrix position is [-offsetX, -offsetY, cameraDistance]
            expect(pos.x).toBeCloseTo(-zeroAngleParams.centerOffsetX * expectedAspectScale, 4);
            expect(pos.y).toBeCloseTo(-zeroAngleParams.centerOffsetY, 4);
            expect(pos.z).toBeCloseTo(zeroAngleParams.cameraDistance, 4);
        });
    });

    describe("<GalacticCloudModel />", () => {
        it("mounts a ModelInstance ('GalacticCloudModel') with ScreenQuadGeometry and GalacticCloudMaterial and respects params.cloudEnabled visibility", () => {
            const { contextValue } = createMockCanvasContext();
            const sceneRef = createRef<ProgrammaticScene>();
            const paramsEnabled = createTestGalaxyParams({ cloudEnabled: true });
            const paramsDisabled = createTestGalaxyParams({ cloudEnabled: false });

            const { rerender } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene ref={sceneRef}>
                        <GalacticCloudModel params={paramsEnabled} />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            const scene = sceneRef.current!;
            const cloudNode = scene.children.find(
                (child) => child.name === "GalacticCloudModel"
            ) as ProgrammaticModelInstance;

            expect(cloudNode).toBeInstanceOf(ProgrammaticModelInstance);
            expect(cloudNode.geometry).toBeInstanceOf(ScreenQuadGeometry);
            expect(cloudNode.material).toBeInstanceOf(GalacticCloudMaterial);
            expect(cloudNode.renderOrder).toBe(GALACTIC_CLOUD_RENDER_ORDER);
            expect(cloudNode.visible).toBe(true);

            rerender(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene ref={sceneRef}>
                        <GalacticCloudModel params={paramsDisabled} />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(cloudNode.visible).toBe(false);
        });

        it("calls GalacticCloudMaterial.prototype.updateParameters when params change", () => {
            const { contextValue } = createMockCanvasContext();
            const updateParamsSpy = vi.spyOn(GalacticCloudMaterial.prototype, "updateParameters");

            try {
                const params1 = createTestGalaxyParams({ cloudDensity: 0.8 });
                const params2 = createTestGalaxyParams({ cloudDensity: 1.6 });

                const { rerender } = render(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene>
                            <GalacticCloudModel params={params1} />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                updateParamsSpy.mockClear();

                rerender(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene>
                            <GalacticCloudModel params={params2} />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                expect(updateParamsSpy).toHaveBeenCalledTimes(1);
                expect(updateParamsSpy).toHaveBeenCalledWith(params2);
            } finally {
                updateParamsSpy.mockRestore();
            }
        });

        it("calls GalacticCloudMaterial.prototype.updateFrameUniforms on simulation tick using activeCamera.aspect and parallaxRef.current offsets", () => {
            const { contextValue } = createMockCanvasContext();
            const sceneRef = createRef<ProgrammaticScene>();
            const updateFrameSpy = vi.spyOn(GalacticCloudMaterial.prototype, "updateFrameUniforms");

            try {
                const params = createTestGalaxyParams({
                    fov: 60,
                    pitchAngle: 0.3,
                    yawAngle: -0.2,
                    rollAngle: 0.1,
                    mouseSensitivity: 0.8,
                    cloudParallaxFactor: 0.5,
                });

                const parallaxRef: React.RefObject<GalaxyParallaxState> = {
                    current: { pitchOffset: 0.25, yawOffset: -0.4 },
                };

                render(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene ref={sceneRef}>
                            <GalacticCloudModel params={params} parallaxRef={parallaxRef} />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                const camera = new ProgrammaticCamera({ aspect: 1.75 }, "TestCam");
                sceneRef.current!.registerCamera(camera, true);

                scheduler.stepFrame(16);

                const expectedFovScale = Math.tan(params.fov * DEG_TO_RAD * HALF_FOV_FACTOR);
                const expectedParallaxFactor =
                    params.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;

                expect(updateFrameSpy).toHaveBeenCalledTimes(1);
                expect(updateFrameSpy).toHaveBeenCalledWith({
                    aspect: 1.75,
                    fovScale: expectedFovScale,
                    pitch: params.pitchAngle,
                    yaw: params.yawAngle,
                    roll: params.rollAngle,
                    effectivePitchOffset:
                        0.25 * params.mouseSensitivity * expectedParallaxFactor,
                    effectiveYawOffset:
                        -0.4 * params.mouseSensitivity * expectedParallaxFactor,
                });

                // Falls back to DEFAULT_CLOUD_ASPECT when activeCamera is null
                sceneRef.current!.activeCamera = null;
                updateFrameSpy.mockClear();
                scheduler.stepFrame(16);

                expect(updateFrameSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        aspect: DEFAULT_CLOUD_ASPECT,
                    })
                );
            } finally {
                updateFrameSpy.mockRestore();
            }
        });

        it("disposes ScreenQuadGeometry on unmount", () => {
            const { contextValue } = createMockCanvasContext();
            const geoDisposeSpy = vi.spyOn(ScreenQuadGeometry.prototype, "dispose");

            try {
                const params = createTestGalaxyParams();
                const { unmount } = render(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene>
                            <GalacticCloudModel params={params} />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                expect(geoDisposeSpy).not.toHaveBeenCalled();

                unmount();

                expect(geoDisposeSpy).toHaveBeenCalledTimes(1);
            } finally {
                geoDisposeSpy.mockRestore();
            }
        });
    });

    describe("<GalaxyStarsModel />", () => {
        it("mounts a ModelInstance ('GalaxyModel') with GalaxyGeometry and GalaxyMaterial configured for additive blending", () => {
            const { contextValue } = createMockCanvasContext();
            const sceneRef = createRef<ProgrammaticScene>();
            const params = createTestGalaxyParams();

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene ref={sceneRef}>
                        <GalaxyStarsModel params={params} />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            const scene = sceneRef.current!;
            const starsNode = scene.children.find(
                (child) => child.name === "GalaxyModel"
            ) as ProgrammaticModelInstance;

            expect(starsNode).toBeInstanceOf(ProgrammaticModelInstance);
            expect(starsNode.geometry).toBeInstanceOf(GalaxyGeometry);
            expect(starsNode.material).toBeInstanceOf(GalaxyMaterial);
            expect(starsNode.material!.pipelineState).toEqual({
                blendMode: BlendMode.Additive,
                depthTest: false,
                depthWrite: false,
                cullFace: false,
            });
        });

        it("updates GalaxyGeometry in-place without disposing geometry when structural morphology parameters change, and updates material", () => {
            const { contextValue } = createMockCanvasContext();
            const sceneRef = createRef<ProgrammaticScene>();
            const updateMatSpy = vi.spyOn(GalaxyMaterial.prototype, "updateParameters");

            try {
                const initialParams = createTestGalaxyParams({
                    starCount: 64,
                    armCount: 4,
                    diskRadius: 150,
                    rotationSpeed: 0.05,
                    pointScale: 2.0,
                });

                const { rerender } = render(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene ref={sceneRef}>
                            <GalaxyStarsModel params={initialParams} />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                const starsNode = sceneRef.current!.children.find(
                    (child) => child.name === "GalaxyModel"
                ) as ProgrammaticModelInstance;
                const initialGeometry = starsNode.geometry as GalaxyGeometry;
                const initialGeoDisposeSpy = vi.spyOn(initialGeometry, "dispose");

                updateMatSpy.mockClear();

                // 1. Non-structural parameter update (rotationSpeed, pointScale)
                const nonStructuralParams = createTestGalaxyParams({
                    starCount: 64,
                    armCount: 4,
                    diskRadius: 150,
                    rotationSpeed: 0.25,
                    pointScale: 4.5,
                });

                rerender(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene ref={sceneRef}>
                            <GalaxyStarsModel params={nonStructuralParams} />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                expect(initialGeoDisposeSpy).not.toHaveBeenCalled();
                expect(starsNode.geometry).toBe(initialGeometry);
                expect(updateMatSpy).toHaveBeenCalledTimes(1);
                expect(updateMatSpy).toHaveBeenCalledWith(nonStructuralParams);

                // 2. Structural parameter update (starCount, armCount, diskRadius)
                updateMatSpy.mockClear();
                const structuralParams = createTestGalaxyParams({
                    starCount: 128,
                    armCount: 2,
                    diskRadius: 220,
                    rotationSpeed: 0.25,
                    pointScale: 4.5,
                });

                rerender(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene ref={sceneRef}>
                            <GalaxyStarsModel params={structuralParams} />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                expect(initialGeoDisposeSpy).not.toHaveBeenCalled();
                expect(starsNode.geometry).toBe(initialGeometry);
                expect(starsNode.geometry).toBeInstanceOf(GalaxyGeometry);
                expect((starsNode.geometry as GalaxyGeometry).galaxyParams.starCount).toBe(128);
                expect((starsNode.geometry as GalaxyGeometry).galaxyParams.armCount).toBe(2);
                expect((starsNode.geometry as GalaxyGeometry).galaxyParams.diskRadius).toBe(220);
                expect(updateMatSpy).toHaveBeenCalledTimes(1);
                expect(updateMatSpy).toHaveBeenCalledWith(structuralParams);
            } finally {
                updateMatSpy.mockRestore();
            }
        });

        it("disposes GalaxyGeometry on unmount", () => {
            const { contextValue } = createMockCanvasContext();
            const geoDisposeSpy = vi.spyOn(GalaxyGeometry.prototype, "dispose");

            try {
                const params = createTestGalaxyParams();
                const { unmount } = render(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene>
                            <GalaxyStarsModel params={params} />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                expect(geoDisposeSpy).not.toHaveBeenCalled();

                unmount();

                expect(geoDisposeSpy).toHaveBeenCalled();
            } finally {
                geoDisposeSpy.mockRestore();
            }
        });
    });

    describe("<GalaxyScene />", () => {
        it("composes <rj-scene>, <rj-galaxy-camera>, <rj-galactic-cloud>, and <rj-galaxy-stars> at DEFAULT_GALAXY_SCENE_PRIORITY (0)", () => {
            const params = createTestGalaxyParams({ fov: 65 });

            const { container } = render(<GalaxyScene params={params} />);

            const sceneEl = container.querySelector("rj-scene") as (HTMLElement & { priority: number; clearDepth: boolean }) | null;
            expect(sceneEl).not.toBeNull();
            expect(sceneEl?.priority).toBe(DEFAULT_GALAXY_SCENE_PRIORITY);
            expect(sceneEl?.hasAttribute("clear-depth")).toBe(false);

            const cameraEl = container.querySelector("rj-galaxy-camera") as (HTMLElement & { fov: number; makeDefault: boolean; params: unknown }) | null;
            expect(cameraEl).not.toBeNull();
            expect(cameraEl?.fov).toBe(65);
            expect(cameraEl?.makeDefault).toBe(true);
            expect(cameraEl?.hasAttribute("make-default")).toBe(true);
            expect(cameraEl?.params).toBe(params);

            const cloudEl = container.querySelector("rj-galactic-cloud") as (HTMLElement & { params: unknown }) | null;
            expect(cloudEl).not.toBeNull();
            expect(cloudEl?.params).toBe(params);

            const starsEl = container.querySelector("rj-galaxy-stars") as (HTMLElement & { params: unknown }) | null;
            expect(starsEl).not.toBeNull();
            expect(starsEl?.params).toBe(params);
        });

        it("forwards clearDepth prop to <rj-scene clear-depth>", () => {
            const { container } = render(<GalaxyScene clearDepth={true} />);

            const sceneEl = container.querySelector("rj-scene") as (HTMLElement & { clearDepth: boolean }) | null;
            expect(sceneEl).not.toBeNull();
            expect(sceneEl?.hasAttribute("clear-depth")).toBe(true);
        });

        it("resolves parameters with precedence: controller.params > params prop > DEFAULT_GALAXY_PARAMETERS, and forwards custom priority", () => {
            const controllerParams = createTestGalaxyParams({ fov: 50, pointScale: 3.5 });
            const propParams = createTestGalaxyParams({ fov: 80, pointScale: 1.5 });

            const mockController: GalaxyController = {
                params: controllerParams,
                updateParameters: vi.fn(),
                resetParameters: vi.fn(),
                applyPreset: vi.fn(),
                currentPresetId: "custom",
            };

            // 1. controller.params takes precedence over params prop
            const { container, rerender } = render(
                <GalaxyScene
                    controller={mockController}
                    params={propParams}
                    priority={15}
                />
            );

            const sceneEl = container.querySelector("rj-scene") as (HTMLElement & { priority: number }) | null;
            expect(sceneEl?.priority).toBe(15);

            const cameraEl = container.querySelector("rj-galaxy-camera") as (HTMLElement & { params: unknown }) | null;
            const cloudEl = container.querySelector("rj-galactic-cloud") as (HTMLElement & { params: unknown }) | null;
            const starsEl = container.querySelector("rj-galaxy-stars") as (HTMLElement & { params: unknown }) | null;
            expect(cameraEl?.params).toBe(controllerParams);
            expect(cloudEl?.params).toBe(controllerParams);
            expect(starsEl?.params).toBe(controllerParams);

            // 2. params prop is used when controller is omitted
            rerender(<GalaxyScene params={propParams} priority={15} />);
            expect(cameraEl?.params).toBe(propParams);
            expect(cloudEl?.params).toBe(propParams);
            expect(starsEl?.params).toBe(propParams);

            // 3. DEFAULT_GALAXY_PARAMETERS is used when both controller and params are omitted
            rerender(<GalaxyScene />);
            expect(cameraEl?.params).toBe(DEFAULT_GALAXY_PARAMETERS);
            expect(cloudEl?.params).toBe(DEFAULT_GALAXY_PARAMETERS);
            expect(starsEl?.params).toBe(DEFAULT_GALAXY_PARAMETERS);
        });
    });
});
