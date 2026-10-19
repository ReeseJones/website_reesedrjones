import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import {
    GalaxyCameraElement,
    setupGalaxyCameraElement,
} from "./galaxy_camera_element";
import {
    DEFAULT_GALAXY_CAMERA_NAME,
    TAG_RJ_GALAXY_CAMERA,
} from "./galaxy_camera_element_constants";
import { setupSceneElement, SceneElement } from "../../scene/elements/scene_element";
import { TAG_RJ_SCENE } from "../../scene/elements/scene_element_constants";
import { DEFAULT_GALAXY_PARAMETERS } from "../parameters/index";
import type { GalaxyParameters } from "../parameters/types";
import { calculateAutoFarPlane } from "../galaxy_math";
import {
    CAMERA_RIG_FRAME_PRIORITY,
    DEFAULT_GALAXY_INPUT_DAMPING,
    GALAXY_ASPECT_SCALE_REFERENCE,
    MAX_GALAXY_ASPECT_SCALE,
} from "../galaxy_scene_constants";
import { DEFAULT_CLOUD_ASPECT } from "../../scene/materials/galactic_cloud_material_constants";
import { OrientationInputController } from "../orientation_input";
import { PerspectiveCamera } from "../../scene/camera/perspective_camera";
import type { SceneFrameCallback, SceneFrameState } from "../../scene/core/scene_types";

describe("setupGalaxyCameraElement()", () => {
    it("should be idempotent and register the custom element tag", () => {
        setupGalaxyCameraElement();
        expect(customElements.get(TAG_RJ_GALAXY_CAMERA)).toBe(GalaxyCameraElement);

        expect(() => setupGalaxyCameraElement()).not.toThrow();
        expect(customElements.get(TAG_RJ_GALAXY_CAMERA)).toBe(GalaxyCameraElement);
    });
});

describe("GalaxyCameraElement", () => {
    let element: GalaxyCameraElement;

    beforeAll(() => {
        setupGalaxyCameraElement();
        setupSceneElement();
    });

    beforeEach(() => {
        element = document.createElement(TAG_RJ_GALAXY_CAMERA);
        document.body.appendChild(element);
    });

    afterEach(() => {
        element.remove();
        document.body.innerHTML = "";
        vi.restoreAllMocks();
    });

    describe("createRenderRoot()", () => {
        it("should return the element itself for Light DOM rendering without shadow root", () => {
            expect(element.createRenderRoot()).toBe(element);
            expect(element.shadowRoot).toBeNull();
        });
    });

    describe("defaults", () => {
        it("should initialize name matching DEFAULT_GALAXY_CAMERA_NAME ('BackdropCamera')", () => {
            expect(element.name).toBe(DEFAULT_GALAXY_CAMERA_NAME);
            expect(element.camera.name).toBe(DEFAULT_GALAXY_CAMERA_NAME);
        });

        it("should initialize makeDefault to true", () => {
            expect(element.makeDefault).toBe(true);
        });

        it("should initialize params with DEFAULT_GALAXY_PARAMETERS", () => {
            expect(element.params).toBe(DEFAULT_GALAXY_PARAMETERS);
        });

        it("should initialize fov, near, and far from params and calculateAutoFarPlane", () => {
            const expectedFar = calculateAutoFarPlane(
                DEFAULT_GALAXY_PARAMETERS.cameraDistance,
                DEFAULT_GALAXY_PARAMETERS.diskRadius,
                DEFAULT_GALAXY_PARAMETERS.farPlane
            );
            expect(element.fov).toBe(DEFAULT_GALAXY_PARAMETERS.fov);
            expect(element.camera.fov).toBe(DEFAULT_GALAXY_PARAMETERS.fov);
            expect(element.near).toBe(DEFAULT_GALAXY_PARAMETERS.nearPlane);
            expect(element.camera.near).toBe(DEFAULT_GALAXY_PARAMETERS.nearPlane);
            expect(element.far).toBe(expectedFar);
            expect(element.camera.far).toBe(expectedFar);
        });

        it("should initialize offset getters to zero", () => {
            expect(element.currentPitchOffset).toBe(0);
            expect(element.currentYawOffset).toBe(0);
            expect(element.targetPitchOffset).toBe(0);
            expect(element.targetYawOffset).toBe(0);
        });

        it("should expose an OrientationInputController instance", () => {
            expect(element.orientationController).toBeInstanceOf(OrientationInputController);
        });
    });

    describe("properties", () => {
        describe("params", () => {
            it("should update fov, near, and far when params setter is called", async () => {
                const customParams: GalaxyParameters = {
                    ...DEFAULT_GALAXY_PARAMETERS,
                    fov: 55,
                    nearPlane: 0.1,
                    cameraDistance: 400,
                    diskRadius: 200,
                    farPlane: 700,
                };
                const expectedFar = calculateAutoFarPlane(400, 200, 700);

                element.params = customParams;
                await element.updateComplete;

                expect(element.params).toBe(customParams);
                expect(element.fov).toBe(55);
                expect(element.camera.fov).toBe(55);
                expect(element.near).toBe(0.1);
                expect(element.camera.near).toBe(0.1);
                expect(element.far).toBe(expectedFar);
                expect(element.camera.far).toBe(expectedFar);
            });
        });

        describe("fov", () => {
            it("should reflect to attribute and reconcile to camera.fov", async () => {
                element.fov = 85;
                await element.updateComplete;

                expect(element.fov).toBe(85);
                expect(element.camera.fov).toBe(85);
                expect(element.getAttribute("fov")).toBe("85");
            });
        });

        describe("near", () => {
            it("should reflect to attribute and reconcile to camera.near", async () => {
                element.near = 0.5;
                await element.updateComplete;

                expect(element.near).toBe(0.5);
                expect(element.camera.near).toBe(0.5);
                expect(element.getAttribute("near")).toBe("0.5");
            });
        });

        describe("far", () => {
            it("should reflect to attribute and reconcile to camera.far", async () => {
                element.far = 1500;
                await element.updateComplete;

                expect(element.far).toBe(1500);
                expect(element.camera.far).toBe(1500);
                expect(element.getAttribute("far")).toBe("1500");
            });
        });

        describe("position", () => {
            it("should update position and reflect to attribute", async () => {
                element.position = [10, 20, 30];
                await element.updateComplete;

                expect(element.position).toEqual([10, 20, 30]);
                expect(element.camera.transform.getPosition()).toEqual({ x: 10, y: 20, z: 30 });
                expect(element.getAttribute("position")).toBe("10 20 30");
            });
        });

        describe("rotation", () => {
            it("should update rotation and reflect to attribute", async () => {
                element.rotation = [0.1, 0.2, 0.3];
                await element.updateComplete;

                expect(element.rotation).toEqual([0.1, 0.2, 0.3]);
                expect(element.getAttribute("rotation")).toBe("0.1 0.2 0.3");
            });
        });

        describe("makeDefault", () => {
            it("should reflect makeDefault property and attribute changes", async () => {
                expect(element.makeDefault).toBe(true);
                expect(element.hasAttribute("make-default")).toBe(true);

                element.makeDefault = false;
                await element.updateComplete;

                expect(element.makeDefault).toBe(false);
                expect(element.hasAttribute("make-default")).toBe(false);
            });
        });

        describe("orientation offsets and controller", () => {
            it("should update targetPitchOffset and targetYawOffset when orientation controller fires onUpdate callback", () => {
                // Simulate pointer move via window event (which OrientationInputController listens to)
                Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
                Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });

                // clientX: 1000, clientY: 1000 -> normalized x = 1, y = 1 -> pitch = -0.4, yaw = 0.5
                window.dispatchEvent(
                    new PointerEvent("pointermove", { clientX: 1000, clientY: 1000 })
                );

                expect(element.targetPitchOffset).toBeCloseTo(-0.4, 4);
                expect(element.targetYawOffset).toBeCloseTo(0.5, 4);
            });
        });
    });

    describe("lifecycle", () => {
        describe("connectedCallback()", () => {
            it("should attach orientation controller on connect", () => {
                const attachSpy = vi.spyOn(element.orientationController, "attach");

                element.remove();
                expect(attachSpy).not.toHaveBeenCalled();

                document.body.appendChild(element);
                expect(attachSpy).toHaveBeenCalledTimes(1);
            });

            it("should register camera with scene context when connected inside SceneElement", () => {
                const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
                document.body.appendChild(sceneElement);

                const registerSpy = vi.spyOn(sceneElement, "registerCamera");
                sceneElement.appendChild(element);

                expect(registerSpy).toHaveBeenCalledWith(element.camera, true);
                expect(sceneElement.activeCamera).toBe(element.camera);

                sceneElement.remove();
            });

            it("should subscribe to frame ticks at CAMERA_RIG_FRAME_PRIORITY (-10)", () => {
                const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
                document.body.appendChild(sceneElement);

                const subscribeSpy = vi.spyOn(sceneElement, "subscribeFrame");
                sceneElement.appendChild(element);

                expect(subscribeSpy).toHaveBeenCalledWith(
                    expect.any(Function),
                    CAMERA_RIG_FRAME_PRIORITY
                );

                sceneElement.remove();
            });
        });

        describe("disconnectedCallback()", () => {
            it("should detach orientation controller on disconnect", () => {
                const detachSpy = vi.spyOn(element.orientationController, "detach");

                element.remove();
                expect(detachSpy).toHaveBeenCalledTimes(1);
            });

            it("should unsubscribe from frame ticks when disconnected", () => {
                const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
                document.body.appendChild(sceneElement);

                const unsubscribeSpy = vi.fn();
                vi.spyOn(sceneElement, "subscribeFrame").mockReturnValue(unsubscribeSpy);

                sceneElement.appendChild(element);
                expect(unsubscribeSpy).not.toHaveBeenCalled();

                element.remove();
                expect(unsubscribeSpy).toHaveBeenCalledTimes(1);

                sceneElement.remove();
            });

            it("should unregister camera from scene when disconnected", () => {
                const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
                document.body.appendChild(sceneElement);

                sceneElement.appendChild(element);
                expect(sceneElement.activeCamera).toBe(element.camera);

                element.remove();
                expect(sceneElement.activeCamera).toBeNull();

                sceneElement.remove();
            });
        });

        describe("context transitions", () => {
            it("should ignore redundant context emissions when context is unchanged", () => {
                const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
                document.body.appendChild(sceneElement);

                const subscribeSpy = vi.spyOn(sceneElement, "subscribeFrame");
                sceneElement.appendChild(element);
                expect(subscribeSpy).toHaveBeenCalledTimes(1);

                sceneElement.requestUpdate();
                expect(subscribeSpy).toHaveBeenCalledTimes(1);

                sceneElement.remove();
            });

            it("should resubscribe to frame loop when reparented into another scene", () => {
                const sceneElement1 = document.createElement(TAG_RJ_SCENE) as SceneElement;
                const sceneElement2 = document.createElement(TAG_RJ_SCENE) as SceneElement;
                document.body.appendChild(sceneElement1);
                document.body.appendChild(sceneElement2);

                const unsubscribe1 = vi.fn();
                const unsubscribe2 = vi.fn();
                vi.spyOn(sceneElement1, "subscribeFrame").mockReturnValue(unsubscribe1);
                vi.spyOn(sceneElement2, "subscribeFrame").mockReturnValue(unsubscribe2);

                sceneElement1.appendChild(element);
                expect(unsubscribe1).not.toHaveBeenCalled();

                sceneElement2.appendChild(element);
                expect(unsubscribe1).toHaveBeenCalledTimes(1);
                expect(unsubscribe2).not.toHaveBeenCalled();

                element.remove();
                expect(unsubscribe2).toHaveBeenCalledTimes(1);

                sceneElement1.remove();
                sceneElement2.remove();
            });
        });
    });

    describe("willUpdate()", () => {
        it("should synchronize fov, near, and auto-far plane when params property updates", async () => {
            const nextParams: GalaxyParameters = {
                ...DEFAULT_GALAXY_PARAMETERS,
                fov: 72,
                nearPlane: 0.2,
                cameraDistance: 320,
                diskRadius: 160,
                farPlane: 650,
            };
            const expectedFar = calculateAutoFarPlane(320, 160, 650);

            element.params = nextParams;
            await element.updateComplete;

            expect(element.fov).toBe(72);
            expect(element.near).toBe(0.2);
            expect(element.far).toBe(expectedFar);
            expect(element.camera.fov).toBe(72);
            expect(element.camera.near).toBe(0.2);
            expect(element.camera.far).toBe(expectedFar);
        });
    });

    describe("_onFrame() simulation and camera rig calculation", () => {
        it("should apply exponential damping decay to pitch and yaw offsets", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);
            expect(frameCallback).toBeDefined();

            // Simulate pointer move to set target offsets
            Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
            Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
            window.dispatchEvent(
                new PointerEvent("pointermove", { clientX: 1000, clientY: 1000 })
            );

            const targetPitch = element.targetPitchOffset;
            const targetYaw = element.targetYawOffset;
            expect(targetPitch).toBeCloseTo(-0.4, 4);
            expect(targetYaw).toBeCloseTo(0.5, 4);

            const dt = 0.1; // 100ms
            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: element.camera,
                timeInfo: { time: 1.0, dt, frameCount: 1 },
            };

            frameCallback!(frameState);

            const damping = element.params.inputDamping ?? DEFAULT_GALAXY_INPUT_DAMPING;
            const expectedDecay = 1.0 - Math.exp(-damping * dt);

            expect(element.currentPitchOffset).toBeCloseTo(targetPitch * expectedDecay, 4);
            expect(element.currentYawOffset).toBeCloseTo(targetYaw * expectedDecay, 4);

            sceneElement.remove();
        });

        it("should scale X center offset based on aspect ratio compensation", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            // Configure known center offsets with zero angles and zero mouse sensitivity
            const testParams: GalaxyParameters = {
                ...DEFAULT_GALAXY_PARAMETERS,
                centerOffsetX: 50,
                centerOffsetY: -20,
                cameraDistance: 300,
                pitchAngle: 0,
                yawAngle: 0,
                rollAngle: 0,
                mouseSensitivity: 0,
            };
            element.params = testParams;

            const narrowAspect = 0.75;
            element.camera.aspect = narrowAspect;

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: element.camera,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            frameCallback!(frameState);

            const expectedAspectScale = Math.min(
                MAX_GALAXY_ASPECT_SCALE,
                narrowAspect / GALAXY_ASPECT_SCALE_REFERENCE
            );
            const expectedOffsetX = testParams.centerOffsetX * expectedAspectScale;
            const expectedOffsetY = testParams.centerOffsetY;

            // View matrix translates by [offsetX, offsetY, -cameraDistance]
            // Inverse camera world translation gives [-offsetX, -offsetY, cameraDistance]
            expect(element.position[0]).toBeCloseTo(-expectedOffsetX, 4);
            expect(element.position[1]).toBeCloseTo(-expectedOffsetY, 4);
            expect(element.position[2]).toBeCloseTo(testParams.cameraDistance, 4);

            const camPos = element.camera.transform.getPosition();
            expect(camPos.x).toBeCloseTo(-expectedOffsetX, 4);
            expect(camPos.y).toBeCloseTo(-expectedOffsetY, 4);
            expect(camPos.z).toBeCloseTo(testParams.cameraDistance, 4);

            sceneElement.remove();
        });

        it("should fall back to frameState.activeCamera.aspect or DEFAULT_CLOUD_ASPECT when camera.aspect is null", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            // Nullify aspect on element.camera
            (element.camera as unknown as { aspect: number | null }).aspect = null;

            const fallbackCam = new PerspectiveCamera({ aspect: 1.6 });
            const frameStateWithCamera: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: fallbackCam,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            frameCallback!(frameStateWithCamera);
            expect(element.position).toBeDefined();

            // Nullify activeCamera on frameState -> should fall back to DEFAULT_CLOUD_ASPECT without throwing
            const frameStateWithoutCamera: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: null,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 2 },
            };

            expect(() => frameCallback!(frameStateWithoutCamera)).not.toThrow();

            sceneElement.remove();
        });

        it("should invert view matrix into camera position and rotation quaternion and compute auto-far", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            const testParams: GalaxyParameters = {
                ...DEFAULT_GALAXY_PARAMETERS,
                pitchAngle: 0.2,
                yawAngle: -0.3,
                rollAngle: 0.1,
                cameraDistance: 250,
                diskRadius: 120,
                farPlane: 500,
            };
            element.params = testParams;

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: element.camera,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            frameCallback!(frameState);

            const expectedFar = calculateAutoFarPlane(250, 120, 500);
            expect(element.far).toBe(expectedFar);
            expect(element.camera.far).toBe(expectedFar);

            // Verify position and rotation properties were set
            expect(element.position).toHaveLength(3);
            expect(element.rotation).toHaveLength(3);

            // Transform on camera should have matching position
            const camPos = element.camera.transform.getPosition();
            expect(camPos.x).toBeCloseTo(element.position[0], 4);
            expect(camPos.y).toBeCloseTo(element.position[1], 4);
            expect(camPos.z).toBeCloseTo(element.position[2], 4);

            sceneElement.remove();
        });

        it("should preserve rotation quaternion on camera transform during willUpdate() lifecycle when _hasWorldTransform is true", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: element.camera,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            frameCallback!(frameState);
            await element.updateComplete;

            const initialQuat = [...element.camera.transform.getQuaternion()];

            // Trigger an update cycle that touches rotation
            element.requestUpdate("rotation", [0, 0, 0]);
            await element.updateComplete;

            const currentQuat = element.camera.transform.getQuaternion();
            expect(currentQuat[0]).toBeCloseTo(initialQuat[0], 4);
            expect(currentQuat[1]).toBeCloseTo(initialQuat[1], 4);
            expect(currentQuat[2]).toBeCloseTo(initialQuat[2], 4);
            expect(currentQuat[3]).toBeCloseTo(initialQuat[3], 4);

            sceneElement.remove();
        });
    });

    describe("attribute reflection", () => {
        it("should reflect position and rotation to DOM attributes after frame tick updates", async () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE) as SceneElement;
            document.body.appendChild(sceneElement);

            let frameCallback: SceneFrameCallback | undefined;
            vi.spyOn(sceneElement, "subscribeFrame").mockImplementation((cb) => {
                frameCallback = cb;
                return () => {
                    frameCallback = undefined;
                };
            });

            sceneElement.appendChild(element);

            const frameState: SceneFrameState = {
                scene: sceneElement.scene,
                activeCamera: element.camera,
                timeInfo: { time: 1.0, dt: 0.016, frameCount: 1 },
            };

            frameCallback!(frameState);
            await element.updateComplete;

            expect(element.hasAttribute("position")).toBe(true);
            expect(element.hasAttribute("rotation")).toBe(true);

            const posAttr = element.getAttribute("position")!;
            const rotAttr = element.getAttribute("rotation")!;

            const parsedPos = posAttr.split(/\s+/).map(Number);
            const parsedRot = rotAttr.split(/\s+/).map(Number);

            expect(parsedPos).toHaveLength(3);
            expect(parsedRot).toHaveLength(3);
            expect(parsedPos[0]).toBeCloseTo(element.position[0], 4);
            expect(parsedPos[1]).toBeCloseTo(element.position[1], 4);
            expect(parsedPos[2]).toBeCloseTo(element.position[2], 4);

            sceneElement.remove();
        });
    });
});
