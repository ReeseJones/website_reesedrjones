import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { createRef } from "react";
import { render, renderHook } from "@testing-library/react";
import { SceneContext, ParentNodeContext, useScene, useParentNode } from "./scene_context";
import { Scene } from "./scene_component";
import { Group } from "./group_component";
import { PerspectiveCamera } from "./camera_component";
import { ModelInstance } from "./model_instance_component";
import { useSceneNode } from "./use_scene_node";
import { useSceneFrame } from "./use_scene_frame";
import {
    DEFAULT_TRANSFORM_ORIGIN,
    DEFAULT_TRANSFORM_UNIT_SCALE,
} from "./scene_react_constants";
import {
    DEFAULT_FRAME_SUBSCRIBER_PRIORITY,
    MAX_SIMULATION_DT_SEC,
    MIN_SIMULATION_DT_SEC,
} from "../core/animation_frame_manager_constants";
import type { ISceneContextValue, Vector3Tuple, EulerTuple } from "./scene_react_types";
import type { SceneFrameState } from "../core/scene_types";
import { Scene as ProgrammaticScene } from "../core/scene";
import { SceneNode } from "../core/scene_node";
import { PerspectiveCamera as ProgrammaticCamera } from "../camera/perspective_camera";
import type { ICamera } from "../camera/camera_types";
import { QuadGeometry } from "../models/primitives/quad_geometry";
import { UnlitMaterial } from "../materials/unlit_material";
import { ModelInstance as ProgrammaticModelInstance } from "../models/model_instance";
import { WebGLCanvasContext } from "../../components/webgl_canvas/webgl_context";
import type { WebGLCanvasContextValue } from "../../components/webgl_canvas/webgl_canvas_types";
import type { CanvasDimensions } from "../../webgl/canvas/canvas_types";
import type { WebGLSubscriber } from "../../webgl/canvas/subscriber_types";
import { createMockContextManager } from "../../testing/mocks/mock_context_manager";
import { createMockAnimationFrameScheduler } from "../../testing/mocks/mock_animation_frame";
import type { IMockAnimationFrameScheduler } from "../../testing/mocks/mock_animation_frame_types";

/**
 * Creates a spy-wrapped WebGLCanvasContextValue fixture for pure CPU component testing.
 */
function createMockCanvasContext() {
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
        aspect: 800 / 600,
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
        mockGl,
        mockDims,
        subscribeSpy,
        unsubscribeSpy,
        getSubscriber: () => currentSubscriber,
    };
}

describe("Declarative Scene Architecture", () => {
    describe("Context Boundaries", () => {
        describe("useScene()", () => {
            it("throws a descriptive error when invoked outside <Scene> provider", () => {
                expect(() => {
                    renderHook(() => useScene());
                }).toThrowError("useScene must be used within a <Scene> component.");
            });

            it("returns the root ISceneContextValue when rendered inside <SceneContext.Provider>", () => {
                const mockScene = new ProgrammaticScene();
                const mockContextValue: ISceneContextValue = {
                    scene: mockScene,
                    activeCamera: null,
                    setActiveCamera: vi.fn(),
                    registerCamera: vi.fn(() => vi.fn()),
                    subscribeFrame: vi.fn(() => vi.fn()),
                };

                const wrapper = ({ children }: { children: React.ReactNode }) => (
                    <SceneContext.Provider value={mockContextValue}>
                        {children}
                    </SceneContext.Provider>
                );

                const { result } = renderHook(() => useScene(), { wrapper });
                expect(result.current.scene).toBe(mockScene);
                expect(result.current.activeCamera).toBeNull();
                expect(typeof result.current.setActiveCamera).toBe("function");
                expect(typeof result.current.registerCamera).toBe("function");
                expect(typeof result.current.subscribeFrame).toBe("function");
            });
        });

        describe("useParentNode()", () => {
            it("throws a descriptive error when invoked outside scene node provider", () => {
                expect(() => {
                    renderHook(() => useParentNode());
                }).toThrowError("useParentNode must be used within a scene node provider (<Scene>, <Group>, etc.).");
            });

            it("returns immediate parent node when rendered inside <ParentNodeContext.Provider>", () => {
                const mockNode = new SceneNode("TestParent");
                const wrapper = ({ children }: { children: React.ReactNode }) => (
                    <ParentNodeContext.Provider value={{ parent: mockNode }}>
                        {children}
                    </ParentNodeContext.Provider>
                );

                const { result } = renderHook(() => useParentNode(), { wrapper });
                expect(result.current.parent).toBe(mockNode);
                expect(result.current.parent.name).toBe("TestParent");
            });
        });
    });

    describe("<Scene />", () => {
        it("renders child components and provides SceneContext and ParentNodeContext", () => {
            const { contextValue } = createMockCanvasContext();
            let capturedSceneContext: ISceneContextValue | null = null;
            let capturedParent: SceneNode | null = null;

            function Probe() {
                capturedSceneContext = useScene();
                capturedParent = useParentNode().parent as SceneNode;
                return <span data-testid="child-probe">Active Probe</span>;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <Probe />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(capturedSceneContext).not.toBeNull();
            if (!capturedSceneContext) {
                throw new Error("capturedSceneContext should not be null");
            }
            const sceneCtx: ISceneContextValue = capturedSceneContext;
            expect(sceneCtx.scene).toBeInstanceOf(ProgrammaticScene);
            expect(sceneCtx.activeCamera).toBeNull();
            expect(capturedParent).toBe(sceneCtx.scene);
        });

        it("assigns React 19 ref directly to underlying programmatic Scene instance", () => {
            const { contextValue } = createMockCanvasContext();
            const sceneRef = createRef<ProgrammaticScene>();

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene ref={sceneRef} />
                </WebGLCanvasContext.Provider>
            );

            expect(sceneRef.current).toBeInstanceOf(ProgrammaticScene);
        });

        it("appoints initial camera as activeCamera and syncs scene.activeCamera", () => {
            const { contextValue } = createMockCanvasContext();
            const camera = new ProgrammaticCamera();

            function CameraRegistrar() {
                const { registerCamera } = useScene();
                React.useEffect(() => {
                    return registerCamera(camera);
                }, [registerCamera]);
                return null;
            }

            let sceneContextValue: ISceneContextValue | null = null;
            function ContextProbe() {
                sceneContextValue = useScene();
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <ContextProbe />
                        <CameraRegistrar />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(sceneContextValue).not.toBeNull();
            if (!sceneContextValue) {
                throw new Error("sceneContextValue should not be null");
            }
            const activeCamCtx: ISceneContextValue = sceneContextValue;
            expect(activeCamCtx.activeCamera).toBe(camera);
            expect(activeCamCtx.scene.activeCamera).toBe(camera);
        });

        it("switches activeCamera when a secondary camera registers with makeDefault", () => {
            const { contextValue } = createMockCanvasContext();
            const camera1 = new ProgrammaticCamera({}, "Cam1");
            const camera2 = new ProgrammaticCamera({}, "Cam2");

            function CameraRegistrar({ makeCam2Default }: { makeCam2Default: boolean }) {
                const { registerCamera } = useScene();
                React.useEffect(() => {
                    const unreg1 = registerCamera(camera1, false);
                    const unreg2 = registerCamera(camera2, makeCam2Default);
                    return () => {
                        unreg1();
                        unreg2();
                    };
                }, [registerCamera, makeCam2Default]);
                return null;
            }

            let sceneContextValue: ISceneContextValue | null = null;
            function ContextProbe() {
                sceneContextValue = useScene();
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <ContextProbe />
                        <CameraRegistrar makeCam2Default={true} />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(sceneContextValue).not.toBeNull();
            if (!sceneContextValue) {
                throw new Error("sceneContextValue should not be null");
            }
            const defaultCamCtx: ISceneContextValue = sceneContextValue;
            expect(defaultCamCtx.activeCamera).toBe(camera2);
            expect(defaultCamCtx.scene.activeCamera).toBe(camera2);
        });

        it("allows manually changing activeCamera via setActiveCamera()", () => {
            const { contextValue } = createMockCanvasContext();
            const camera1 = new ProgrammaticCamera({}, "Cam1");
            const camera2 = new ProgrammaticCamera({}, "Cam2");

            let setCam: ((cam: ICamera | null) => void) | null = null;
            let currentActive: ICamera | null = null;

            function Controller() {
                const ctx = useScene();
                setCam = ctx.setActiveCamera;
                currentActive = ctx.activeCamera;
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <Controller />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(currentActive).toBeNull();
            React.act(() => {
                setCam!(camera1);
            });
            expect(currentActive).toBe(camera1);

            React.act(() => {
                setCam!(camera2);
            });
            expect(currentActive).toBe(camera2);

            React.act(() => {
                setCam!(null);
            });
            expect(currentActive).toBeNull();
        });

        it("falls back to previous registered camera when active camera unregisters", () => {
            const { contextValue } = createMockCanvasContext();
            const camera1 = new ProgrammaticCamera({}, "Cam1");
            const camera2 = new ProgrammaticCamera({}, "Cam2");

            let active: ICamera | null = null;
            function Probe() {
                active = useScene().activeCamera;
                return null;
            }

            function DynamicApp({ renderCam2 }: { renderCam2: boolean }) {
                const { registerCamera } = useScene();
                React.useEffect(() => {
                    return registerCamera(camera1);
                }, [registerCamera]);

                return (
                    <>
                        <Probe />
                        {renderCam2 && <Cam2Component />}
                    </>
                );
            }

            function Cam2Component() {
                const { registerCamera } = useScene();
                React.useEffect(() => {
                    return registerCamera(camera2, true);
                }, [registerCamera]);
                return null;
            }

            const { rerender } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <DynamicApp renderCam2={true} />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(active).toBe(camera2);

            // Unmount Cam2
            rerender(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <DynamicApp renderCam2={false} />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(active).toBe(camera1);
        });

        it("mounts <ScenePass> when activeCamera is present and passes priority & clearDepth", () => {
            const { contextValue, subscribeSpy } = createMockCanvasContext();
            const camera = new ProgrammaticCamera();

            function RegisterProbe() {
                const { registerCamera } = useScene();
                React.useEffect(() => {
                    return registerCamera(camera);
                }, [registerCamera]);
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene priority={25} clearDepth={false}>
                        <RegisterProbe />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(subscribeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    priority: 25,
                    render: expect.any(Function),
                })
            );
        });

        it("calls scene.destroy() when <Scene> unmounts", () => {
            const { contextValue } = createMockCanvasContext();
            let capturedScene: ProgrammaticScene | null = null;

            function Capture() {
                capturedScene = useScene().scene as ProgrammaticScene;
                return null;
            }

            const { unmount } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <Capture />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(capturedScene).not.toBeNull();
            const destroySpy = vi.spyOn(capturedScene!, "destroy");

            unmount();
            expect(destroySpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("<Group />", () => {
        it("instantiates SceneNode, attaches to parent on mount, and re-provides itself as ParentNodeContext", () => {
            const { contextValue } = createMockCanvasContext();
            let sceneInstance: ProgrammaticScene | null = null;
            let groupInstance: SceneNode | null = null;

            function Probe() {
                groupInstance = useParentNode().parent as SceneNode;
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene ref={(s) => { sceneInstance = s as ProgrammaticScene | null; }}>
                        <Group name="SubGroup">
                            <Probe />
                        </Group>
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(sceneInstance).not.toBeNull();
            expect(groupInstance).not.toBeNull();
            if (!sceneInstance || !groupInstance) {
                throw new Error("Instances should not be null");
            }
            const testedScene: ProgrammaticScene = sceneInstance;
            const testedGroup: SceneNode = groupInstance;
            expect(testedGroup.name).toBe("SubGroup");
            expect(testedGroup.parent).toBe(testedScene);
            expect(testedScene.children).toContain(testedGroup);
        });

        it("forwards ref to underlying SceneNode", () => {
            const { contextValue } = createMockCanvasContext();
            const groupRef = createRef<SceneNode>();

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <Group ref={groupRef} name="ForwardedGroup" />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(groupRef.current).toBeInstanceOf(SceneNode);
            expect(groupRef.current?.name).toBe("ForwardedGroup");
        });

        it("unmounts cleanly by removing child from parent and destroying node", () => {
            const { contextValue } = createMockCanvasContext();
            let capturedParent: ProgrammaticScene | null = null;
            let capturedGroup: SceneNode | null = null;

            function Probe() {
                capturedGroup = useParentNode().parent as SceneNode;
                return null;
            }

            function App({ showGroup }: { showGroup: boolean }) {
                return (
                    <Scene ref={(s) => { capturedParent = s as ProgrammaticScene | null; }}>
                        {showGroup && (
                            <Group name="RemovableGroup">
                                <Probe />
                            </Group>
                        )}
                    </Scene>
                );
            }

            const { rerender } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App showGroup={true} />
                </WebGLCanvasContext.Provider>
            );

            expect(capturedParent).not.toBeNull();
            expect(capturedGroup).not.toBeNull();
            if (!capturedParent || !capturedGroup) {
                throw new Error("Parent or group should not be null");
            }
            const parentNode: ProgrammaticScene = capturedParent;
            const groupNode: SceneNode = capturedGroup;
            expect(parentNode.children).toContain(groupNode);

            const removeChildSpy = vi.spyOn(parentNode, "removeChild");
            const destroySpy = vi.spyOn(groupNode, "destroy");

            rerender(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App showGroup={false} />
                </WebGLCanvasContext.Provider>
            );

            expect(removeChildSpy).toHaveBeenCalledWith(groupNode);
            expect(destroySpy).toHaveBeenCalledTimes(1);
            expect(parentNode.children).not.toContain(groupNode);
        });
    });

    describe("<PerspectiveCamera />", () => {
        it("instantiates camera, mounts to parent, and registers with SceneContext", () => {
            const { contextValue } = createMockCanvasContext();
            let sceneContext: ISceneContextValue | null = null;
            let cameraParent: SceneNode | null = null;

            function InnerProbe() {
                cameraParent = useParentNode().parent as SceneNode;
                return null;
            }

            function SceneProbe() {
                sceneContext = useScene();
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <SceneProbe />
                        <PerspectiveCamera
                            name="MainCam"
                            fov={75}
                            near={0.5}
                            far={500}
                            aspect={16 / 9}
                            makeDefault
                        >
                            <InnerProbe />
                        </PerspectiveCamera>
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(sceneContext).not.toBeNull();
            if (!sceneContext) {
                throw new Error("sceneContext should not be null");
            }
            const camCtx: ISceneContextValue = sceneContext;
            expect(camCtx.activeCamera).toBeInstanceOf(ProgrammaticCamera);
            const cam = camCtx.activeCamera as ProgrammaticCamera;
            expect(cam.name).toBe("MainCam");
            expect(cam.fov).toBe(75);
            expect(cam.near).toBe(0.5);
            expect(cam.far).toBe(500);
            expect(cam.aspect).toBe(16 / 9);

            // Nested child receives the camera as parent node
            expect(cameraParent).toBe(cam);
        });

        it("synchronizes fov, near, far, and aspect prop changes", () => {
            const { contextValue } = createMockCanvasContext();
            const camRef = createRef<ICamera>();

            function CameraWrapper({
                fov,
                near,
                far,
                aspect,
            }: {
                fov: number;
                near: number;
                far: number;
                aspect: number;
            }) {
                return (
                    <Scene>
                        <PerspectiveCamera
                            ref={camRef}
                            fov={fov}
                            near={near}
                            far={far}
                            aspect={aspect}
                        />
                    </Scene>
                );
            }

            const { rerender } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <CameraWrapper fov={60} near={0.1} far={1000} aspect={1} />
                </WebGLCanvasContext.Provider>
            );

            const cam = camRef.current as ProgrammaticCamera;
            expect(cam.fov).toBe(60);
            expect(cam.near).toBe(0.1);
            expect(cam.far).toBe(1000);
            expect(cam.aspect).toBe(1);

            rerender(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <CameraWrapper fov={90} near={1.0} far={2000} aspect={2} />
                </WebGLCanvasContext.Provider>
            );

            expect(cam.fov).toBe(90);
            expect(cam.near).toBe(1.0);
            expect(cam.far).toBe(2000);
            expect(cam.aspect).toBe(2);
        });

        it("unmounts cleanly and unregisters camera from scene", () => {
            const { contextValue } = createMockCanvasContext();
            let activeCam: ICamera | null = null;

            function Probe() {
                activeCam = useScene().activeCamera;
                return null;
            }

            function App({ showCam }: { showCam: boolean }) {
                return (
                    <Scene>
                        <Probe />
                        {showCam && <PerspectiveCamera makeDefault />}
                    </Scene>
                );
            }

            const { rerender } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App showCam={true} />
                </WebGLCanvasContext.Provider>
            );

            expect(activeCam).toBeInstanceOf(ProgrammaticCamera);

            rerender(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App showCam={false} />
                </WebGLCanvasContext.Provider>
            );

            expect(activeCam).toBeNull();
        });
    });

    describe("<ModelInstance />", () => {
        it("mounts to parent with real QuadGeometry and UnlitMaterial and forwards ref", () => {
            const { contextValue } = createMockCanvasContext();
            const quadGeo = new QuadGeometry();
            const unlitMat = new UnlitMaterial();
            const modelRef = createRef<ProgrammaticModelInstance>();

            let modelParent: SceneNode | null = null;
            function ChildProbe() {
                modelParent = useParentNode().parent as SceneNode;
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <ModelInstance
                            ref={modelRef}
                            name="QuadModel"
                            geometry={quadGeo}
                            material={unlitMat}
                            renderOrder={5}
                        >
                            <ChildProbe />
                        </ModelInstance>
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(modelRef.current).toBeInstanceOf(ProgrammaticModelInstance);
            expect(modelRef.current?.name).toBe("QuadModel");
            expect(modelRef.current?.geometry).toBe(quadGeo);
            expect(modelRef.current?.material).toBe(unlitMat);
            expect(modelRef.current?.renderOrder).toBe(5);
            expect(modelRef.current?.isRenderable).toBe(true);

            // Re-provides itself as parent for nested children
            expect(modelParent).toBe(modelRef.current);
        });

        it("updates geometry, material, and renderOrder on prop change", () => {
            const { contextValue } = createMockCanvasContext();
            const geo1 = new QuadGeometry({ width: 1, height: 1 });
            const geo2 = new QuadGeometry({ width: 2, height: 2 });
            const mat1 = new UnlitMaterial({ color: [1, 0, 0] });
            const mat2 = new UnlitMaterial({ color: [0, 1, 0] });

            const modelRef = createRef<ProgrammaticModelInstance>();

            function App({
                geometry,
                material,
                renderOrder,
            }: {
                geometry: QuadGeometry;
                material: UnlitMaterial;
                renderOrder: number;
            }) {
                return (
                    <Scene>
                        <ModelInstance
                            ref={modelRef}
                            geometry={geometry}
                            material={material}
                            renderOrder={renderOrder}
                        />
                    </Scene>
                );
            }

            const { rerender } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App geometry={geo1} material={mat1} renderOrder={1} />
                </WebGLCanvasContext.Provider>
            );

            expect(modelRef.current?.geometry).toBe(geo1);
            expect(modelRef.current?.material).toBe(mat1);
            expect(modelRef.current?.renderOrder).toBe(1);

            rerender(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App geometry={geo2} material={mat2} renderOrder={10} />
                </WebGLCanvasContext.Provider>
            );

            expect(modelRef.current?.geometry).toBe(geo2);
            expect(modelRef.current?.material).toBe(mat2);
            expect(modelRef.current?.renderOrder).toBe(10);
        });

        it("unmounts cleanly by removing child from parent and calling destroy", () => {
            const { contextValue } = createMockCanvasContext();
            const geo = new QuadGeometry();
            const mat = new UnlitMaterial();

            let parentScene: ProgrammaticScene | null = null;
            const modelRef = createRef<ProgrammaticModelInstance>();

            function App({ showModel }: { showModel: boolean }) {
                return (
                    <Scene ref={(s) => { parentScene = s as ProgrammaticScene | null; }}>
                        {showModel && (
                            <ModelInstance
                                ref={modelRef}
                                geometry={geo}
                                material={mat}
                            />
                        )}
                    </Scene>
                );
            }

            const { rerender } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App showModel={true} />
                </WebGLCanvasContext.Provider>
            );

            expect(parentScene).not.toBeNull();
            if (!parentScene) {
                throw new Error("parentScene should not be null");
            }
            const testedParent: ProgrammaticScene = parentScene;
            const modelInstance = modelRef.current!;
            expect(testedParent.children).toContain(modelInstance);

            const destroySpy = vi.spyOn(modelInstance, "destroy");
            const removeChildSpy = vi.spyOn(testedParent, "removeChild");

            rerender(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App showModel={false} />
                </WebGLCanvasContext.Provider>
            );

            expect(removeChildSpy).toHaveBeenCalledWith(modelInstance);
            expect(destroySpy).toHaveBeenCalledTimes(1);
            expect(testedParent.children).not.toContain(modelInstance);
        });
    });

    describe("useSceneNode transform reconciliation", () => {
        it("reconciles position updates and falls back to origin when position becomes undefined", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");

            const setPosSpy = vi.spyOn(child.transform, "setPosition");

            function NodeConsumer({ position }: { position?: Vector3Tuple }) {
                useSceneNode(child, { position });
                return null;
            }

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <ParentNodeContext.Provider value={{ parent }}>
                    {children}
                </ParentNodeContext.Provider>
            );

            const { rerender } = render(<NodeConsumer position={[1, 2, 3]} />, { wrapper });

            expect(setPosSpy).toHaveBeenCalledWith(1, 2, 3);
            const pos1 = child.transform.getPosition();
            expect(pos1.x).toBe(1);
            expect(pos1.y).toBe(2);
            expect(pos1.z).toBe(3);

            // Re-render with identical coordinates shouldn't call setPosition again
            setPosSpy.mockClear();
            rerender(<NodeConsumer position={[1, 2, 3]} />);
            expect(setPosSpy).not.toHaveBeenCalled();

            // Re-render with new coordinates
            rerender(<NodeConsumer position={[4, 5, 6]} />);
            expect(setPosSpy).toHaveBeenCalledWith(4, 5, 6);
            const pos2 = child.transform.getPosition();
            expect(pos2.x).toBe(4);
            expect(pos2.y).toBe(5);
            expect(pos2.z).toBe(6);

            // Fallback when position becomes undefined
            setPosSpy.mockClear();
            rerender(<NodeConsumer position={undefined} />);
            expect(setPosSpy).toHaveBeenCalledWith(
                DEFAULT_TRANSFORM_ORIGIN,
                DEFAULT_TRANSFORM_ORIGIN,
                DEFAULT_TRANSFORM_ORIGIN
            );
            const pos3 = child.transform.getPosition();
            expect(pos3.x).toBe(0);
            expect(pos3.y).toBe(0);
            expect(pos3.z).toBe(0);
        });

        it("reconciles rotation updates and falls back to origin when rotation becomes undefined", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");

            const setRotSpy = vi.spyOn(child.transform, "setRotationEuler");

            function NodeConsumer({ rotation }: { rotation?: EulerTuple }) {
                useSceneNode(child, { rotation });
                return null;
            }

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <ParentNodeContext.Provider value={{ parent }}>
                    {children}
                </ParentNodeContext.Provider>
            );

            const { rerender } = render(<NodeConsumer rotation={[0.1, 0.2, 0.3]} />, { wrapper });

            expect(setRotSpy).toHaveBeenCalledWith(0.1, 0.2, 0.3);

            // Re-render with identical rotation shouldn't invoke setter again
            setRotSpy.mockClear();
            rerender(<NodeConsumer rotation={[0.1, 0.2, 0.3]} />);
            expect(setRotSpy).not.toHaveBeenCalled();

            // Update rotation
            rerender(<NodeConsumer rotation={[0.5, 0.6, 0.7]} />);
            expect(setRotSpy).toHaveBeenCalledWith(0.5, 0.6, 0.7);

            // Fallback when rotation becomes undefined
            setRotSpy.mockClear();
            rerender(<NodeConsumer rotation={undefined} />);
            expect(setRotSpy).toHaveBeenCalledWith(
                DEFAULT_TRANSFORM_ORIGIN,
                DEFAULT_TRANSFORM_ORIGIN,
                DEFAULT_TRANSFORM_ORIGIN
            );
        });

        it("reconciles scale (number and tuple) updates and falls back to unit scale when undefined", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("Child");

            const setUniformScaleSpy = vi.spyOn(child.transform, "setUniformScale");
            const setScaleSpy = vi.spyOn(child.transform, "setScale");

            function NodeConsumer({ scale }: { scale?: Vector3Tuple | number }) {
                useSceneNode(child, { scale });
                return null;
            }

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <ParentNodeContext.Provider value={{ parent }}>
                    {children}
                </ParentNodeContext.Provider>
            );

            // Uniform number scale
            const { rerender } = render(<NodeConsumer scale={2.5} />, { wrapper });
            expect(setUniformScaleSpy).toHaveBeenCalledWith(2.5);
            expect(child.transform.getScale().x).toBe(2.5);

            // Identical uniform number scale
            setUniformScaleSpy.mockClear();
            rerender(<NodeConsumer scale={2.5} />);
            expect(setUniformScaleSpy).not.toHaveBeenCalled();

            // Vector3Tuple scale
            rerender(<NodeConsumer scale={[2, 3, 4]} />);
            expect(setScaleSpy).toHaveBeenCalledWith(2, 3, 4);
            const scaleVec = child.transform.getScale();
            expect(scaleVec.x).toBe(2);
            expect(scaleVec.y).toBe(3);
            expect(scaleVec.z).toBe(4);

            // Identical Vector3Tuple scale
            setScaleSpy.mockClear();
            rerender(<NodeConsumer scale={[2, 3, 4]} />);
            expect(setScaleSpy).not.toHaveBeenCalled();

            // Fallback when scale becomes undefined
            setUniformScaleSpy.mockClear();
            rerender(<NodeConsumer scale={undefined} />);
            expect(setUniformScaleSpy).toHaveBeenCalledWith(DEFAULT_TRANSFORM_UNIT_SCALE);
            expect(child.transform.getScale().x).toBe(1);
            expect(child.transform.getScale().y).toBe(1);
            expect(child.transform.getScale().z).toBe(1);
        });

        it("reconciles visible and name property updates", () => {
            const parent = new SceneNode("Parent");
            const child = new SceneNode("OriginalName");

            function NodeConsumer({ visible, name }: { visible?: boolean; name?: string }) {
                useSceneNode(child, { visible, name });
                return null;
            }

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <ParentNodeContext.Provider value={{ parent }}>
                    {children}
                </ParentNodeContext.Provider>
            );

            const { rerender } = render(<NodeConsumer visible={false} name="UpdatedName" />, { wrapper });

            expect(child.visible).toBe(false);
            expect(child.name).toBe("UpdatedName");

            rerender(<NodeConsumer visible={true} name="FinalName" />);
            expect(child.visible).toBe(true);
            expect(child.name).toBe("FinalName");
        });
    });

    describe("<Scene /> simulation loop & subscribeFrame", () => {
        let scheduler: IMockAnimationFrameScheduler;
        let restoreGlobal: () => void;

        beforeEach(() => {
            scheduler = createMockAnimationFrameScheduler(1000);
            restoreGlobal = scheduler.installGlobal();
        });

        afterEach(() => {
            restoreGlobal();
        });

        it("does not schedule requestAnimationFrame on <Scene /> mount when zero frame subscribers are registered", () => {
            const { contextValue } = createMockCanvasContext();

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <Group name="StaticGroup" />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(scheduler.requestAnimationFrame).not.toHaveBeenCalled();
            expect(scheduler.pendingCount).toBe(0);
        });

        it("starts the requestAnimationFrame loop when the first subscriber registers and cancels it immediately when the last subscriber unsubscribes", () => {
            const { contextValue } = createMockCanvasContext();
            let subscribeFrameFn: ISceneContextValue["subscribeFrame"] | null = null;

            function Probe() {
                subscribeFrameFn = useScene().subscribeFrame;
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <Probe />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(subscribeFrameFn).not.toBeNull();
            expect(scheduler.requestAnimationFrame).not.toHaveBeenCalled();

            const sub1 = vi.fn();
            const sub2 = vi.fn();

            const unsub1 = subscribeFrameFn!(sub1);
            expect(typeof unsub1).toBe("function");
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(1);

            // Second subscriber reuses the existing scheduled RAF
            const unsub2 = subscribeFrameFn!(sub2);
            expect(typeof unsub2).toBe("function");
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);

            // Unsubscribing first subscriber leaves 1 active, so RAF is not cancelled
            unsub1();
            expect(scheduler.cancelAnimationFrame).not.toHaveBeenCalled();
            expect(scheduler.pendingCount).toBe(1);

            // Unsubscribing last subscriber immediately cancels pending RAF
            unsub2();
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledWith(1);
            expect(scheduler.pendingCount).toBe(0);
        });

        it("cancels any active requestAnimationFrame when <Scene /> unmounts while subscribers are still active", () => {
            const { contextValue } = createMockCanvasContext();
            const frameSpy = vi.fn();

            function ActiveBehavior() {
                useSceneFrame(frameSpy);
                return null;
            }

            const { unmount } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <ActiveBehavior />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(1);

            scheduler.stepFrame(16);
            expect(frameSpy).toHaveBeenCalledTimes(1);
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(2);
            expect(scheduler.pendingCount).toBe(1);

            unmount();
            expect(scheduler.cancelAnimationFrame).toHaveBeenCalledWith(2);
            expect(scheduler.pendingCount).toBe(0);
        });

        it("executes subscribers in ascending priority order (a.priority - b.priority), defaulting to DEFAULT_FRAME_SUBSCRIBER_PRIORITY (0)", () => {
            const { contextValue } = createMockCanvasContext();
            let subscribeFrameFn: ISceneContextValue["subscribeFrame"] | null = null;

            function Probe() {
                subscribeFrameFn = useScene().subscribeFrame;
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <Probe />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            const executionOrder: string[] = [];

            subscribeFrameFn!(() => {
                executionOrder.push("priority_10");
            }, 10);

            subscribeFrameFn!(() => {
                executionOrder.push(`default_${DEFAULT_FRAME_SUBSCRIBER_PRIORITY}`);
            });

            subscribeFrameFn!(() => {
                executionOrder.push("priority_-5");
            }, -5);

            subscribeFrameFn!(() => {
                executionOrder.push("priority_2");
            }, 2);

            scheduler.stepFrame(16);

            expect(executionOrder).toEqual([
                "priority_-5",
                "default_0",
                "priority_2",
                "priority_10",
            ]);
        });

        it("passes SceneFrameState with { scene, activeCamera, timeInfo } reflecting the latest appointed activeCamera as cameras mount and switch", () => {
            const { contextValue } = createMockCanvasContext();
            const cam1Ref = createRef<ICamera>();
            const cam2Ref = createRef<ICamera>();
            const sceneRef = createRef<ProgrammaticScene>();
            const receivedStates: SceneFrameState[] = [];

            function FrameRecorder() {
                useSceneFrame((state) => {
                    receivedStates.push(state);
                });
                return null;
            }

            function App({ showCam1, showCam2Default }: { showCam1: boolean; showCam2Default: boolean }) {
                return (
                    <Scene ref={sceneRef}>
                        <FrameRecorder />
                        {showCam1 && <PerspectiveCamera ref={cam1Ref} name="Cam1" makeDefault />}
                        {showCam2Default && <PerspectiveCamera ref={cam2Ref} name="Cam2" makeDefault />}
                    </Scene>
                );
            }

            const { rerender } = render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App showCam1={false} showCam2Default={false} />
                </WebGLCanvasContext.Provider>
            );

            // Tick 1: No camera mounted
            scheduler.stepFrame(20);
            expect(receivedStates).toHaveLength(1);
            expect(receivedStates[0].scene).toBe(sceneRef.current);
            expect(receivedStates[0].activeCamera).toBeNull();
            expect(receivedStates[0].timeInfo.frameCount).toBe(1);
            expect(receivedStates[0].timeInfo.dt).toBeCloseTo(0.02, 5);
            expect(receivedStates[0].timeInfo.time).toBeCloseTo(0.02, 5);

            // Mount Cam1
            rerender(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App showCam1={true} showCam2Default={false} />
                </WebGLCanvasContext.Provider>
            );

            scheduler.stepFrame(30);
            expect(receivedStates).toHaveLength(2);
            expect(receivedStates[1].scene).toBe(sceneRef.current);
            expect(receivedStates[1].activeCamera).toBe(cam1Ref.current);
            expect(receivedStates[1].timeInfo.frameCount).toBe(2);
            expect(receivedStates[1].timeInfo.dt).toBeCloseTo(0.03, 5);
            expect(receivedStates[1].timeInfo.time).toBeCloseTo(0.05, 5);

            // Mount Cam2 with makeDefault
            rerender(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <App showCam1={true} showCam2Default={true} />
                </WebGLCanvasContext.Provider>
            );

            scheduler.stepFrame(25);
            expect(receivedStates).toHaveLength(3);
            expect(receivedStates[2].activeCamera).toBe(cam2Ref.current);
            expect(receivedStates[2].timeInfo.frameCount).toBe(3);
        });

        it("clamps simulation dt between MIN_SIMULATION_DT_SEC (0.0001) and MAX_SIMULATION_DT_SEC (0.1) and accumulates time and frameCount", () => {
            const { contextValue } = createMockCanvasContext();
            const receivedStates: SceneFrameState[] = [];

            function FrameRecorder() {
                useSceneFrame((state) => {
                    receivedStates.push(state);
                });
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <FrameRecorder />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            // Frame 1: Zero elapsed ms -> clamps to MIN_SIMULATION_DT_SEC (0.0001)
            scheduler.stepFrame(0);
            expect(receivedStates[0].timeInfo.dt).toBe(MIN_SIMULATION_DT_SEC);
            expect(receivedStates[0].timeInfo.time).toBeCloseTo(MIN_SIMULATION_DT_SEC, 6);
            expect(receivedStates[0].timeInfo.frameCount).toBe(1);

            // Frame 2: Negative elapsed ms -> clamps to MIN_SIMULATION_DT_SEC (0.0001)
            scheduler.stepFrame(-50);
            expect(receivedStates[1].timeInfo.dt).toBe(MIN_SIMULATION_DT_SEC);
            expect(receivedStates[1].timeInfo.time).toBeCloseTo(MIN_SIMULATION_DT_SEC * 2, 6);
            expect(receivedStates[1].timeInfo.frameCount).toBe(2);

            // Frame 3: Huge elapsed ms (5000ms = 5s) -> clamps to MAX_SIMULATION_DT_SEC (0.1)
            scheduler.stepFrame(5000);
            expect(receivedStates[2].timeInfo.dt).toBe(MAX_SIMULATION_DT_SEC);
            expect(receivedStates[2].timeInfo.time).toBeCloseTo(MIN_SIMULATION_DT_SEC * 2 + MAX_SIMULATION_DT_SEC, 6);
            expect(receivedStates[2].timeInfo.frameCount).toBe(3);

            // Frame 4: Nominal 50ms (0.05s) -> unclamped
            scheduler.stepFrame(50);
            expect(receivedStates[3].timeInfo.dt).toBeCloseTo(0.05, 6);
            expect(receivedStates[3].timeInfo.time).toBeCloseTo(
                MIN_SIMULATION_DT_SEC * 2 + MAX_SIMULATION_DT_SEC + 0.05,
                6
            );
            expect(receivedStates[3].timeInfo.frameCount).toBe(4);
        });

        it("handles a subscriber unsubscribing during a tick without throwing or scheduling another RAF when the subscriber map becomes empty", () => {
            const { contextValue } = createMockCanvasContext();
            let subscribeFrameFn: ISceneContextValue["subscribeFrame"] | null = null;

            function Probe() {
                subscribeFrameFn = useScene().subscribeFrame;
                return null;
            }

            render(
                <WebGLCanvasContext.Provider value={contextValue}>
                    <Scene>
                        <Probe />
                    </Scene>
                </WebGLCanvasContext.Provider>
            );

            let unsub1: (() => void) | null = null;
            let unsub2: (() => void) | null = null;

            const sub2Spy = vi.fn();
            const sub1Spy = vi.fn(() => {
                // Unsubscribe both self and downstream subscriber during tick
                unsub1?.();
                unsub2?.();
            });

            unsub1 = subscribeFrameFn!(sub1Spy, 1);
            unsub2 = subscribeFrameFn!(sub2Spy, 2);

            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(1);

            expect(() => {
                scheduler.stepFrame(16);
            }).not.toThrow();

            expect(sub1Spy).toHaveBeenCalledTimes(1);
            // Downstream subscriber was unsubscribed mid-tick, so it must be skipped
            expect(sub2Spy).not.toHaveBeenCalled();
            // Because subscribersMap became empty during the tick, no follow-up RAF is scheduled
            expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(scheduler.pendingCount).toBe(0);
        });
    });

    describe("useSceneFrame()", () => {
        it("throws a descriptive error when invoked outside <Scene />", () => {
            expect(() => {
                renderHook(() => useSceneFrame(vi.fn()));
            }).toThrowError("useScene must be used within a <Scene> component.");
        });

        it("subscribes on mount and unsubscribes on unmount", () => {
            const mockScene = new ProgrammaticScene();
            const unsubscribeSpy = vi.fn();
            const subscribeFrameSpy = vi.fn(() => unsubscribeSpy);

            const mockContextValue: ISceneContextValue = {
                scene: mockScene,
                activeCamera: null,
                setActiveCamera: vi.fn(),
                registerCamera: vi.fn(() => vi.fn()),
                subscribeFrame: subscribeFrameSpy,
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <SceneContext.Provider value={mockContextValue}>
                    {children}
                </SceneContext.Provider>
            );

            const callback = vi.fn();
            const { result, unmount } = renderHook(() => useSceneFrame(callback), { wrapper });

            expect(result.current).toBeUndefined();
            expect(subscribeFrameSpy).toHaveBeenCalledTimes(1);
            expect(subscribeFrameSpy).toHaveBeenCalledWith(
                expect.any(Function),
                DEFAULT_FRAME_SUBSCRIBER_PRIORITY
            );
            expect(unsubscribeSpy).not.toHaveBeenCalled();

            unmount();
            expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
        });

        it("always invokes the latest inline callback closure across component re-renders without unsubscribing or re-subscribing when priority is unchanged", () => {
            const mockScene = new ProgrammaticScene();
            let registeredCallback: ((state: SceneFrameState) => void) | null = null;
            const unsubscribeSpy = vi.fn();
            const subscribeFrameSpy = vi.fn((cb: (state: SceneFrameState) => void) => {
                registeredCallback = cb;
                return unsubscribeSpy;
            });

            const mockContextValue: ISceneContextValue = {
                scene: mockScene,
                activeCamera: null,
                setActiveCamera: vi.fn(),
                registerCamera: vi.fn(() => vi.fn()),
                subscribeFrame: subscribeFrameSpy,
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <SceneContext.Provider value={mockContextValue}>
                    {children}
                </SceneContext.Provider>
            );

            const firstCallback = vi.fn();
            const secondCallback = vi.fn();

            const { rerender } = renderHook(
                ({ cb, priority }) => useSceneFrame(cb, priority),
                {
                    wrapper,
                    initialProps: { cb: firstCallback, priority: 5 },
                }
            );

            expect(subscribeFrameSpy).toHaveBeenCalledTimes(1);
            expect(unsubscribeSpy).not.toHaveBeenCalled();

            // Re-render with a fresh inline callback closure but identical priority
            rerender({ cb: secondCallback, priority: 5 });

            expect(subscribeFrameSpy).toHaveBeenCalledTimes(1);
            expect(unsubscribeSpy).not.toHaveBeenCalled();

            // Triggering the registered callback should invoke the latest closure (secondCallback)
            const sampleState: SceneFrameState = {
                scene: mockScene,
                activeCamera: null,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 60 },
            };
            registeredCallback!(sampleState);

            expect(firstCallback).not.toHaveBeenCalled();
            expect(secondCallback).toHaveBeenCalledTimes(1);
            expect(secondCallback).toHaveBeenCalledWith(sampleState);
        });

        it("re-subscribes with new ordering when priority prop changes", () => {
            const { contextValue } = createMockCanvasContext();
            const scheduler = createMockAnimationFrameScheduler(1000);
            const restoreGlobal = scheduler.installGlobal();

            try {
                const executionOrder: string[] = [];

                function DynamicSubscriber({ dynamicPriority }: { dynamicPriority: number }) {
                    useSceneFrame(() => {
                        executionOrder.push("dynamic");
                    }, dynamicPriority);
                    return null;
                }

                function FixedSubscriber() {
                    useSceneFrame(() => {
                        executionOrder.push("fixed_0");
                    }, 0);
                    return null;
                }

                const { rerender } = render(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene>
                            <DynamicSubscriber dynamicPriority={10} />
                            <FixedSubscriber />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                // First frame: dynamicPriority = 10 runs after fixed_0 (priority 0)
                scheduler.stepFrame(16);
                expect(executionOrder).toEqual(["fixed_0", "dynamic"]);

                // Update dynamicPriority to -10 so it runs before fixed_0
                executionOrder.length = 0;
                rerender(
                    <WebGLCanvasContext.Provider value={contextValue}>
                        <Scene>
                            <DynamicSubscriber dynamicPriority={-10} />
                            <FixedSubscriber />
                        </Scene>
                    </WebGLCanvasContext.Provider>
                );

                scheduler.stepFrame(16);
                expect(executionOrder).toEqual(["dynamic", "fixed_0"]);
            } finally {
                restoreGlobal();
            }
        });
    });
});
