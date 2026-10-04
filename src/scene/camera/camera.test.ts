import { describe, it, expect } from "vitest";
import { mat4, quat, vec3 } from "gl-matrix";
import { Camera } from "./camera";
import { SceneNode } from "../core/scene_node";

/**
 * Concrete test implementation of abstract Camera.
 */
class TestCamera extends Camera {
    public projectionUpdateCount: number = 0;
    public lastAspect: number | null = null;

    constructor(
        near: number = 0.1,
        far: number = 1000.0,
        name: string = "Camera",
        id?: string
    ) {
        super(near, far, name, id);
    }

    public updateAspectRatio(aspect: number): void {
        this.lastAspect = aspect;
        this.markProjectionDirty();
    }

    public updateProjectionMatrix(): void {
        this.projectionUpdateCount++;
        // Write a known non-identity test matrix (custom perspective/frustum shape)
        this.projectionMatrix[0] = 2.0;
        this.projectionMatrix[1] = 0.0;
        this.projectionMatrix[2] = 0.0;
        this.projectionMatrix[3] = 0.0;

        this.projectionMatrix[4] = 0.0;
        this.projectionMatrix[5] = 3.0;
        this.projectionMatrix[6] = 0.0;
        this.projectionMatrix[7] = 0.0;

        this.projectionMatrix[8] = 0.0;
        this.projectionMatrix[9] = 0.0;
        this.projectionMatrix[10] = -1.0;
        this.projectionMatrix[11] = -1.0;

        this.projectionMatrix[12] = 0.0;
        this.projectionMatrix[13] = 0.0;
        this.projectionMatrix[14] = -0.2;
        this.projectionMatrix[15] = 0.0;
    }

    public exposeMarkProjectionDirty(): void {
        this.markProjectionDirty();
    }
}

describe("Camera (abstract)", () => {
    describe("constructor and initial properties", () => {
        it("initializes with default near (0.1) and far (1000.0), default name 'Camera'", () => {
            const camera = new TestCamera();

            expect(camera.near).toBe(0.1);
            expect(camera.far).toBe(1000.0);
            expect(camera.name).toBe("Camera");
            expect(camera.id).toBeDefined();
            expect(camera.id.startsWith("Camera_")).toBe(true);
        });

        it("accepts custom near, far, name, and id", () => {
            const camera = new TestCamera(0.5, 500.0, "CinematicCam", "cam-test-99");

            expect(camera.near).toBe(0.5);
            expect(camera.far).toBe(500.0);
            expect(camera.name).toBe("CinematicCam");
            expect(camera.id).toBe("cam-test-99");
        });

        it("initializes viewMatrix, projectionMatrix, and viewProjectionMatrix as 4x4 identity matrices", () => {
            const camera = new TestCamera();

            const identity = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ];

            expect(camera.viewMatrix).toBeMatrixCloseTo(identity);
            expect(camera.projectionMatrix).toBeMatrixCloseTo(identity);
            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(identity);
        });

        it("is an instance of SceneNode and inherits transform, parent, children, and lifecycle methods", () => {
            const camera = new TestCamera();

            expect(camera).toBeInstanceOf(SceneNode);
            expect(camera).toBeInstanceOf(Camera);
            expect(camera.transform).toBeDefined();
            expect(camera.parent).toBeNull();
            expect(camera.children).toEqual([]);
            expect(camera.visible).toBe(true);
            expect(camera.computedVisible).toBe(true);
            expect(camera.isWorldDirty).toBe(true);

            let destroyed = false;
            camera.onDestroy(() => {
                destroyed = true;
            });
            camera.destroy();
            expect(destroyed).toBe(true);
        });
    });

    describe("near and far getters and setters", () => {
        it("returns current near and far values", () => {
            const camera = new TestCamera(1.5, 250.0);

            expect(camera.near).toBe(1.5);
            expect(camera.far).toBe(250.0);
        });

        it("modifying near dirties projection matrix (causing updateProjectionMatrix to run on next updateMatrices())", () => {
            const camera = new TestCamera();
            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(1);

            camera.near = 0.5;
            expect(camera.near).toBe(0.5);

            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(2);
        });

        it("modifying far dirties projection matrix", () => {
            const camera = new TestCamera();
            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(1);

            camera.far = 5000.0;
            expect(camera.far).toBe(5000.0);

            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(2);
        });

        it("setting near/far to identical value does NOT dirty projection matrix", () => {
            const camera = new TestCamera(0.1, 1000.0);
            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(1);

            camera.near = 0.1;
            camera.far = 1000.0;

            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(1);
        });
    });

    describe("markProjectionDirty and markWorldDirty", () => {
        it("calling markProjectionDirty flags projection as dirty", () => {
            const camera = new TestCamera();
            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(1);

            camera.exposeMarkProjectionDirty();
            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(2);
        });

        it("calling markWorldDirty flags view as dirty and cascades through SceneNode", () => {
            const camera = new TestCamera();
            const childNode = new SceneNode("ChildMarker");
            camera.addChild(childNode);

            camera.updateMatrices();
            childNode.updateWorldTransform();
            expect(camera.isWorldDirty).toBe(false);
            expect(childNode.isWorldDirty).toBe(false);

            camera.markWorldDirty();
            expect(camera.isWorldDirty).toBe(true);
            expect(childNode.isWorldDirty).toBe(true);
        });

        it("transform mutations automatically trigger markWorldDirty via transform dirty listener", () => {
            const camera = new TestCamera();
            camera.updateMatrices();
            expect(camera.isWorldDirty).toBe(false);

            camera.transform.setPosition(10, 20, 30);
            expect(camera.isWorldDirty).toBe(true);

            camera.updateMatrices();
            expect(camera.isWorldDirty).toBe(false);

            camera.transform.setRotationEuler(0, 45, 0);
            expect(camera.isWorldDirty).toBe(true);

            camera.updateMatrices();
            expect(camera.isWorldDirty).toBe(false);

            camera.transform.setScale(2, 2, 2);
            expect(camera.isWorldDirty).toBe(true);
        });

        it("updateAspectRatio flags projection as dirty and stores aspect", () => {
            const camera = new TestCamera();
            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(1);

            camera.updateAspectRatio(16 / 9);
            expect(camera.lastAspect).toBeCloseTo(16 / 9, 5);

            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(2);
        });
    });

    describe("lookAt", () => {
        it("points camera at a target along -Z axis (e.g., camera at (0, 0, 5) looking at (0, 0, 0) with up (0, 1, 0) has identity orientation)", () => {
            const camera = new TestCamera();
            camera.transform.setPosition(0, 0, 5);

            const ret = camera.lookAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
            expect(ret).toBe(camera);

            const rot = camera.transform.getQuaternion();
            // Quaternion for identity orientation is (0, 0, 0, 1)
            expect(rot[0]).toBeCloseTo(0, 5);
            expect(rot[1]).toBeCloseTo(0, 5);
            expect(rot[2]).toBeCloseTo(0, 5);
            expect(rot[3]).toBeCloseTo(1, 5);
        });

        it("camera at (5, 0, 0) looking at (0, 0, 0) with up (0, 1, 0) rotates yaw to point down -Z toward target", () => {
            const camera = new TestCamera();
            camera.transform.setPosition(5, 0, 0);

            camera.lookAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });

            const rot = camera.transform.getQuaternion();
            // Looking from +X to origin: yaw rotation of +90 degrees around Y axis
            // Quaternion: (0, sin(45 deg), 0, cos(45 deg)) = (0, 0.7071068, 0, 0.7071068)
            expect(rot[0]).toBeCloseTo(0, 4);
            expect(rot[1]).toBeCloseTo(Math.SQRT1_2, 4);
            expect(rot[2]).toBeCloseTo(0, 4);
            expect(rot[3]).toBeCloseTo(Math.SQRT1_2, 4);

            // Vector along local -Z axis in world space should point toward target (-1, 0, 0)
            const forwardLocal = vec3.fromValues(0, 0, -1);
            const forwardWorld = vec3.create();
            vec3.transformQuat(forwardWorld, forwardLocal, quat.fromValues(rot[0], rot[1], rot[2], rot[3]));

            expect(forwardWorld[0]).toBeCloseTo(-1.0, 4);
            expect(forwardWorld[1]).toBeCloseTo(0.0, 4);
            expect(forwardWorld[2]).toBeCloseTo(0.0, 4);
        });

        it("returns this for method chaining", () => {
            const camera = new TestCamera();
            const result = camera.lookAt({ x: 1, y: 2, z: 3 });
            expect(result).toBe(camera);
        });

        it("degenerate case: eye equals target does not produce NaN quaternion or crash", () => {
            const camera = new TestCamera();
            camera.transform.setPosition(2, 3, 4);
            camera.transform.setRotationEuler(10, 20, 30);
            const rotBefore = [...camera.transform.getQuaternion()];

            camera.lookAt({ x: 2, y: 3, z: 4 });

            const rotAfter = camera.transform.getQuaternion();
            expect(rotAfter[0]).toBeCloseTo(rotBefore[0], 5);
            expect(rotAfter[1]).toBeCloseTo(rotBefore[1], 5);
            expect(rotAfter[2]).toBeCloseTo(rotBefore[2], 5);
            expect(rotAfter[3]).toBeCloseTo(rotBefore[3], 5);

            for (let i = 0; i < 4; i++) {
                expect(Number.isNaN(rotAfter[i])).toBe(false);
            }
        });

        it("collinear up case: looking straight down -Y with up (0, 1, 0) falls back to alternate up vector without NaN or crash", () => {
            const camera = new TestCamera();
            camera.transform.setPosition(0, 5, 0);

            camera.lookAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });

            const rot = camera.transform.getQuaternion();
            for (let i = 0; i < 4; i++) {
                expect(Number.isNaN(rot[i])).toBe(false);
            }

            // Must be a normalized unit quaternion
            const len = Math.hypot(rot[0], rot[1], rot[2], rot[3]);
            expect(len).toBeCloseTo(1.0, 5);

            // Vector along local -Z in world space should point down toward (0, -1, 0)
            const forwardLocal = vec3.fromValues(0, 0, -1);
            const forwardWorld = vec3.create();
            vec3.transformQuat(forwardWorld, forwardLocal, quat.fromValues(rot[0], rot[1], rot[2], rot[3]));

            expect(forwardWorld[0]).toBeCloseTo(0.0, 4);
            expect(forwardWorld[1]).toBeCloseTo(-1.0, 4);
            expect(forwardWorld[2]).toBeCloseTo(0.0, 4);
        });

        it("looking straight up +Y with up (0, 1, 0) handles alternate up vector gracefully", () => {
            const camera = new TestCamera();
            camera.transform.setPosition(0, -5, 0);

            camera.lookAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });

            const rot = camera.transform.getQuaternion();
            for (let i = 0; i < 4; i++) {
                expect(Number.isNaN(rot[i])).toBe(false);
            }

            const len = Math.hypot(rot[0], rot[1], rot[2], rot[3]);
            expect(len).toBeCloseTo(1.0, 5);

            // Vector along local -Z in world space should point up toward (0, 1, 0)
            const forwardLocal = vec3.fromValues(0, 0, -1);
            const forwardWorld = vec3.create();
            vec3.transformQuat(forwardWorld, forwardLocal, quat.fromValues(rot[0], rot[1], rot[2], rot[3]));

            expect(forwardWorld[0]).toBeCloseTo(0.0, 4);
            expect(forwardWorld[1]).toBeCloseTo(1.0, 4);
            expect(forwardWorld[2]).toBeCloseTo(0.0, 4);
        });

        it("uses default worldUp { x: 0, y: 1, z: 0 } when worldUp argument is omitted", () => {
            const camera1 = new TestCamera();
            camera1.transform.setPosition(0, 0, 10);
            camera1.lookAt({ x: 0, y: 0, z: 0 });

            const camera2 = new TestCamera();
            camera2.transform.setPosition(0, 0, 10);
            camera2.lookAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });

            const rot1 = camera1.transform.getQuaternion();
            const rot2 = camera2.transform.getQuaternion();
            for (let i = 0; i < 4; i++) {
                expect(rot1[i]).toBeCloseTo(rot2[i], 5);
            }
        });
    });

    describe("updateMatrices and matrix caching", () => {
        it("initial updateMatrices() recalculates both view and projection matrices, and multiplies them into viewProjectionMatrix", () => {
            const camera = new TestCamera();

            camera.updateMatrices();

            expect(camera.projectionUpdateCount).toBe(1);

            // View matrix is inverse of identity worldMatrix -> identity
            const expectedView = mat4.create();
            mat4.invert(expectedView, camera.worldMatrix);
            expect(camera.viewMatrix).toBeMatrixCloseTo(expectedView);

            // viewProjectionMatrix is projectionMatrix * viewMatrix
            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, camera.viewMatrix);
            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });

        it("caching: subsequent updateMatrices() without modifications does NOT re-run updateProjectionMatrix or re-invert viewMatrix", () => {
            const camera = new TestCamera();
            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(1);

            // Stash sentinel value into viewMatrix to prove it is not overwritten
            camera.viewMatrix[12] = 999.0;

            camera.updateMatrices();

            // Projection should NOT be re-evaluated
            expect(camera.projectionUpdateCount).toBe(1);
            // View should NOT be re-inverted
            expect(camera.viewMatrix[12]).toBe(999.0);
        });

        it("moving camera transform (e.g. setPosition) invalidates view and updates viewMatrix to be the exact inverse of worldMatrix", () => {
            const camera = new TestCamera();
            camera.updateMatrices();

            camera.transform.setPosition(10, 20, -30);
            camera.updateMatrices();

            const expectedView = mat4.create();
            mat4.invert(expectedView, camera.worldMatrix);

            expect(camera.viewMatrix).toBeMatrixCloseTo(expectedView);
            // Inverse translation of (10, 20, -30) is (-10, -20, 30)
            expect(camera.viewMatrix[12]).toBeCloseTo(-10, 5);
            expect(camera.viewMatrix[13]).toBeCloseTo(-20, 5);
            expect(camera.viewMatrix[14]).toBeCloseTo(30, 5);
        });

        it("viewMatrix is verified against mat4.invert of worldMatrix", () => {
            const camera = new TestCamera();
            camera.transform.setPosition(3, 4, 5);
            camera.transform.setRotationEuler(15, 30, 45);
            camera.transform.setScale(1.2, 1.2, 1.2);

            camera.updateMatrices();

            const expectedView = mat4.create();
            const inverted = mat4.invert(expectedView, camera.worldMatrix);
            expect(inverted).not.toBeNull();

            expect(camera.viewMatrix).toBeMatrixCloseTo(expectedView);
        });

        it("rotating camera updates viewMatrix correctly", () => {
            const camera = new TestCamera();
            camera.transform.setRotationEuler(0, 90, 0);

            camera.updateMatrices();

            const expectedView = mat4.create();
            mat4.invert(expectedView, camera.worldMatrix);
            expect(camera.viewMatrix).toBeMatrixCloseTo(expectedView);
        });

        it("uninvertible world matrix (e.g., zero scale) falls back safely to identity viewMatrix", () => {
            const camera = new TestCamera();
            camera.transform.setScale(0, 0, 0);

            expect(() => camera.updateMatrices()).not.toThrow();

            const identity = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ];
            expect(camera.viewMatrix).toBeMatrixCloseTo(identity);

            for (let i = 0; i < 16; i++) {
                expect(Number.isNaN(camera.viewMatrix[i])).toBe(false);
            }
        });

        it("updating projection (via near, far, or markProjectionDirty) causes projectionMatrix and viewProjectionMatrix update while reusing cached viewMatrix if view was not dirty", () => {
            const camera = new TestCamera();
            camera.transform.setPosition(0, 0, 10);
            camera.updateMatrices();
            expect(camera.projectionUpdateCount).toBe(1);

            // Sentinel in viewMatrix to confirm view is not recomputed
            camera.viewMatrix[12] = 777.0;

            // Trigger projection dirty
            camera.near = 0.5;
            camera.updateMatrices();

            // Projection was recomputed
            expect(camera.projectionUpdateCount).toBe(2);
            // View was NOT re-inverted, preserving sentinel
            expect(camera.viewMatrix[12]).toBe(777.0);

            // VP matrix was re-multiplied with the dirty projection and cached view
            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, camera.viewMatrix);
            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });
    });

    describe("hierarchical parent-child scene graph integration", () => {
        it("when camera is attached as child of another SceneNode (e.g. a camera rig/gimbal), moving the parent node dirties the camera world transform and updates viewMatrix accordingly", () => {
            const rig = new SceneNode("CameraGimbal");
            const camera = new TestCamera();
            rig.addChild(camera);

            camera.transform.setPosition(0, 2, 5);
            rig.updateWorldTransform();
            camera.updateMatrices();
            expect(camera.isWorldDirty).toBe(false);

            // Move parent rig
            rig.transform.setPosition(50, 10, 100);
            expect(camera.isWorldDirty).toBe(true);

            rig.updateWorldTransform();
            camera.updateMatrices();
            expect(camera.isWorldDirty).toBe(false);

            // Camera's world position is (50, 12, 105)
            expect(camera.worldMatrix[12]).toBeCloseTo(50, 5);
            expect(camera.worldMatrix[13]).toBeCloseTo(12, 5);
            expect(camera.worldMatrix[14]).toBeCloseTo(105, 5);

            // View matrix translation is (-50, -12, -105)
            expect(camera.viewMatrix[12]).toBeCloseTo(-50, 5);
            expect(camera.viewMatrix[13]).toBeCloseTo(-12, 5);
            expect(camera.viewMatrix[14]).toBeCloseTo(-105, 5);
        });

        it("viewMatrix properly reflects the combined parent * local inverse transformation", () => {
            const rig = new SceneNode("ParentRig");
            const camera = new TestCamera();
            rig.addChild(camera);

            rig.transform.setPosition(10, 20, 30);
            rig.transform.setRotationEuler(0, 90, 0);

            camera.transform.setPosition(0, 5, 10);
            camera.transform.setRotationEuler(30, 0, 0);

            rig.updateWorldTransform();
            camera.updateMatrices();

            // Expected world matrix: parent.worldMatrix * camera.localMatrix
            const expectedWorld = mat4.create();
            mat4.multiply(expectedWorld, rig.worldMatrix, camera.transform.localMatrix);
            expect(camera.worldMatrix).toBeMatrixCloseTo(expectedWorld);

            // Expected view matrix: inverse(expectedWorld)
            const expectedView = mat4.create();
            mat4.invert(expectedView, expectedWorld);
            expect(camera.viewMatrix).toBeMatrixCloseTo(expectedView);

            // Expected viewProjectionMatrix: projection * view
            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, expectedView);
            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });
    });
});
