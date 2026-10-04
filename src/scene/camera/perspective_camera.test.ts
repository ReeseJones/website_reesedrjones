import { describe, it, expect, vi } from "vitest";
import { mat4, vec3, vec4 } from "gl-matrix";
import { PerspectiveCamera } from "./perspective_camera";
import { Camera } from "./camera";
import { SceneNode } from "../core/scene_node";

describe("PerspectiveCamera", () => {
    describe("constructor and initial properties", () => {
        it("initializes with default values: fov = 60, aspect = 1.0, near = 0.1, far = 1000.0, name = 'PerspectiveCamera', generated unique id", () => {
            const camera = new PerspectiveCamera();

            expect(camera.fov).toBe(60);
            expect(camera.aspect).toBe(1.0);
            expect(camera.near).toBe(0.1);
            expect(camera.far).toBe(1000.0);
            expect(camera.name).toBe("PerspectiveCamera");
            expect(camera.id).toBeDefined();
            expect(camera.id.startsWith("PerspectiveCamera_")).toBe(true);
        });

        it("accepts custom options: fov, aspect, near, far, custom name, and custom id", () => {
            const camera = new PerspectiveCamera(
                {
                    fov: 45,
                    aspect: 16 / 9,
                    near: 0.5,
                    far: 500.0
                },
                "CustomMainCam",
                "cam-persp-42"
            );

            expect(camera.fov).toBe(45);
            expect(camera.aspect).toBeCloseTo(16 / 9, 6);
            expect(camera.near).toBe(0.5);
            expect(camera.far).toBe(500.0);
            expect(camera.name).toBe("CustomMainCam");
            expect(camera.id).toBe("cam-persp-42");
        });

        it("inherits from Camera and SceneNode", () => {
            const camera = new PerspectiveCamera();

            expect(camera).toBeInstanceOf(PerspectiveCamera);
            expect(camera).toBeInstanceOf(Camera);
            expect(camera).toBeInstanceOf(SceneNode);
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

    describe("fov getter and setter", () => {
        it("returns current fov", () => {
            const camera = new PerspectiveCamera({ fov: 75 });
            expect(camera.fov).toBe(75);
        });

        it("updating fov flags projection as dirty (verified by change in projectionMatrix upon updateMatrices())", () => {
            const camera = new PerspectiveCamera({ fov: 60, aspect: 1.0 });
            camera.updateMatrices();

            const initialFov60Matrix = new Float32Array(camera.projectionMatrix);

            camera.fov = 90;
            expect(camera.fov).toBe(90);

            camera.updateMatrices();
            const updatedFov90Matrix = new Float32Array(camera.projectionMatrix);

            // Matrix entries should have changed noticeably
            expect(updatedFov90Matrix[0]).not.toBeCloseTo(initialFov60Matrix[0], 3);
            expect(updatedFov90Matrix[5]).not.toBeCloseTo(initialFov60Matrix[5], 3);

            // Verified against mat4.perspective with 90 degrees
            const expected = mat4.create();
            mat4.perspective(expected, (90 * Math.PI) / 180, 1.0, 0.1, 1000.0);
            expect(updatedFov90Matrix).toBeMatrixCloseTo(expected);
        });

        it("setting fov to same value does not dirty projection (caching verified)", () => {
            const camera = new PerspectiveCamera({ fov: 60 });
            camera.updateMatrices();

            const spy = vi.spyOn(camera, "updateProjectionMatrix");

            camera.fov = 60;
            camera.updateMatrices();

            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe("aspect getter and setter", () => {
        it("returns current aspect", () => {
            const camera = new PerspectiveCamera({ aspect: 16 / 9 });
            expect(camera.aspect).toBeCloseTo(16 / 9, 6);
        });

        it("updating aspect flags projection as dirty", () => {
            const camera = new PerspectiveCamera({ fov: 60, aspect: 1.0 });
            camera.updateMatrices();

            const initialMatrix = new Float32Array(camera.projectionMatrix);

            camera.aspect = 16 / 9;
            expect(camera.aspect).toBeCloseTo(16 / 9, 6);

            camera.updateMatrices();
            const updatedMatrix = new Float32Array(camera.projectionMatrix);

            // proj[0] depends on aspect ratio, proj[5] depends only on fov
            expect(updatedMatrix[0]).not.toBeCloseTo(initialMatrix[0], 3);
            expect(updatedMatrix[5]).toBeCloseTo(initialMatrix[5], 4);

            const expected = mat4.create();
            mat4.perspective(expected, (60 * Math.PI) / 180, 16 / 9, 0.1, 1000.0);
            expect(updatedMatrix).toBeMatrixCloseTo(expected);
        });

        it("setting aspect to same value does not dirty projection", () => {
            const camera = new PerspectiveCamera({ aspect: 1.5 });
            camera.updateMatrices();

            const spy = vi.spyOn(camera, "updateProjectionMatrix");

            camera.aspect = 1.5;
            camera.updateMatrices();

            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe("near and far setters", () => {
        it("updating near invalidates perspective projection matrix", () => {
            const camera = new PerspectiveCamera({ near: 0.1, far: 1000.0 });
            camera.updateMatrices();

            const initialMatrix = new Float32Array(camera.projectionMatrix);

            camera.near = 1.0;
            expect(camera.near).toBe(1.0);

            camera.updateMatrices();
            const updatedMatrix = new Float32Array(camera.projectionMatrix);

            // proj[10] and proj[14] depend on near/far
            expect(updatedMatrix[10]).not.toBeCloseTo(initialMatrix[10], 4);
            expect(updatedMatrix[14]).not.toBeCloseTo(initialMatrix[14], 4);

            const expected = mat4.create();
            mat4.perspective(expected, (60 * Math.PI) / 180, 1.0, 1.0, 1000.0);
            expect(updatedMatrix).toBeMatrixCloseTo(expected);
        });

        it("updating far invalidates perspective projection matrix", () => {
            const camera = new PerspectiveCamera({ near: 1.0, far: 10.0 });
            camera.updateMatrices();

            const initialMatrix = new Float32Array(camera.projectionMatrix);

            camera.far = 100.0;
            expect(camera.far).toBe(100.0);

            camera.updateMatrices();
            const updatedMatrix = new Float32Array(camera.projectionMatrix);

            expect(updatedMatrix[10]).not.toBeCloseTo(initialMatrix[10], 2);
            expect(updatedMatrix[14]).not.toBeCloseTo(initialMatrix[14], 2);

            const expected = mat4.create();
            mat4.perspective(expected, (60 * Math.PI) / 180, 1.0, 1.0, 100.0);
            expect(updatedMatrix).toBeMatrixCloseTo(expected);
        });

        it("setting near or far to same value does not dirty projection", () => {
            const camera = new PerspectiveCamera({ near: 0.5, far: 500.0 });
            camera.updateMatrices();

            const spy = vi.spyOn(camera, "updateProjectionMatrix");

            camera.near = 0.5;
            camera.far = 500.0;
            camera.updateMatrices();

            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe("updateAspectRatio", () => {
        it("updates aspect property and flags projection as dirty", () => {
            const camera = new PerspectiveCamera({ aspect: 1.0 });
            camera.updateMatrices();

            const initialM00 = camera.projectionMatrix[0];

            camera.updateAspectRatio(2.0);
            expect(camera.aspect).toBe(2.0);

            camera.updateMatrices();
            expect(camera.projectionMatrix[0]).toBeCloseTo(initialM00 / 2.0, 4);
        });

        it("no-op if aspect value is identical", () => {
            const camera = new PerspectiveCamera({ aspect: 16 / 9 });
            camera.updateMatrices();

            const spy = vi.spyOn(camera, "updateProjectionMatrix");

            camera.updateAspectRatio(16 / 9);
            camera.updateMatrices();

            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe("projection matrix computation", () => {
        it("verifies computed projectionMatrix against mat4.perspective for default settings", () => {
            const camera = new PerspectiveCamera();
            camera.updateMatrices();

            const expected = mat4.create();
            mat4.perspective(expected, (60 * Math.PI) / 180, 1.0, 0.1, 1000.0);

            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });

        it("verifies computed projectionMatrix against mat4.perspective for widescreen aspect ratio (16/9, fov=45, near=0.5, far=2000.0)", () => {
            const camera = new PerspectiveCamera({
                fov: 45,
                aspect: 16 / 9,
                near: 0.5,
                far: 2000.0
            });
            camera.updateMatrices();

            const expected = mat4.create();
            mat4.perspective(expected, (45 * Math.PI) / 180, 16 / 9, 0.5, 2000.0);

            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });

        it("verifies computed projectionMatrix against mat4.perspective for portrait aspect ratio (9/16, fov=75, near=0.01, far=500.0)", () => {
            const camera = new PerspectiveCamera({
                fov: 75,
                aspect: 9 / 16,
                near: 0.01,
                far: 500.0
            });
            camera.updateMatrices();

            const expected = mat4.create();
            mat4.perspective(expected, (75 * Math.PI) / 180, 9 / 16, 0.01, 500.0);

            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });

        it("verifies analytical invariants: proj[0], proj[5], proj[11]", () => {
            const fov = 50;
            const aspect = 1.777778;
            const near = 0.2;
            const far = 1500.0;
            const camera = new PerspectiveCamera({ fov, aspect, near, far });
            camera.updateMatrices();

            const fovRadians = (fov * Math.PI) / 180;
            const tanHalfFov = Math.tan(fovRadians / 2);

            const expectedProj0 = 1 / (aspect * tanHalfFov);
            const expectedProj5 = 1 / tanHalfFov;
            const expectedProj11 = -1;
            const expectedProj10 = (far + near) / (near - far);
            const expectedProj14 = (2 * far * near) / (near - far);

            const proj = camera.projectionMatrix;

            // proj[0] = 1 / (aspect * tan(fov / 2))
            expect(proj[0]).toBeCloseTo(expectedProj0, 5);
            // proj[5] = 1 / tan(fov / 2)
            expect(proj[5]).toBeCloseTo(expectedProj5, 5);
            // proj[11] = -1
            expect(proj[11]).toBeCloseTo(expectedProj11, 5);
            // Depth mapping
            expect(proj[10]).toBeCloseTo(expectedProj10, 5);
            expect(proj[14]).toBeCloseTo(expectedProj14, 5);
            // Perspective row 4 element 15 is 0
            expect(proj[15]).toBe(0);
        });
    });

    describe("matrix update and caching integration", () => {
        it("calling updateMatrices() computes valid projectionMatrix and combined viewProjectionMatrix", () => {
            const camera = new PerspectiveCamera({ fov: 60, aspect: 1.0, near: 0.1, far: 100.0 });
            camera.transform.setPosition(0, 0, 5);
            camera.updateMatrices();

            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, camera.viewMatrix);

            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });

        it("projection matrix is cached across multiple updateMatrices() calls if no camera parameters changed", () => {
            const camera = new PerspectiveCamera();
            camera.updateMatrices();

            const spy = vi.spyOn(camera, "updateProjectionMatrix");

            // Overwrite sentinel value into projectionMatrix
            camera.projectionMatrix[15] = 999.0;

            camera.updateMatrices();
            camera.updateMatrices();

            expect(spy).not.toHaveBeenCalled();
            expect(camera.projectionMatrix[15]).toBe(999.0);
        });

        it("moving camera transform updates viewMatrix and viewProjectionMatrix while reusing cached projectionMatrix", () => {
            const camera = new PerspectiveCamera();
            camera.updateMatrices();

            const spyProj = vi.spyOn(camera, "updateProjectionMatrix");

            // Overwrite sentinel into projectionMatrix
            camera.projectionMatrix[15] = 777.0;

            camera.transform.setPosition(10, 20, 30);
            camera.updateMatrices();

            // Projection should NOT have recomputed
            expect(spyProj).not.toHaveBeenCalled();
            expect(camera.projectionMatrix[15]).toBe(777.0);

            // View matrix should reflect new position
            expect(camera.viewMatrix[12]).toBeCloseTo(-10, 4);
            expect(camera.viewMatrix[13]).toBeCloseTo(-20, 4);
            expect(camera.viewMatrix[14]).toBeCloseTo(-30, 4);

            // viewProjectionMatrix should reflect product of cached projection and updated view
            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, camera.viewMatrix);
            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });

        it("altering fov updates projectionMatrix and viewProjectionMatrix while reusing cached viewMatrix", () => {
            const camera = new PerspectiveCamera();
            camera.transform.setPosition(5, 5, 5);
            camera.updateMatrices();

            // Sentinel in viewMatrix
            camera.viewMatrix[12] = 888.0;

            camera.fov = 90;
            camera.updateMatrices();

            // View matrix retained sentinel (was not re-inverted)
            expect(camera.viewMatrix[12]).toBe(888.0);

            // Projection matrix recomputed for 90 degrees
            const expectedProj = mat4.create();
            mat4.perspective(expectedProj, (90 * Math.PI) / 180, 1.0, 0.1, 1000.0);
            expect(camera.projectionMatrix).toBeMatrixCloseTo(expectedProj);

            // viewProjection updated with new projection and cached view
            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, camera.viewMatrix);
            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });
    });

    describe("scene graph and lookAt integration", () => {
        it("camera can be positioned and oriented using lookAt(), correctly transforming world coordinates to view and clip space", () => {
            const camera = new PerspectiveCamera({ fov: 60, aspect: 1.0, near: 0.1, far: 100.0 });
            camera.transform.setPosition(0, 0, 10);
            camera.lookAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });

            camera.updateMatrices();

            // Origin in world space
            const originWorld = vec4.fromValues(0, 0, 0, 1);

            // In view space: camera is at (0, 0, 10) looking down -Z at origin.
            // Origin in view space should be at (0, 0, -10).
            const originView = vec4.create();
            vec4.transformMat4(originView, originWorld, camera.viewMatrix);

            expect(originView[0]).toBeCloseTo(0, 4);
            expect(originView[1]).toBeCloseTo(0, 4);
            expect(originView[2]).toBeCloseTo(-10, 4);
            expect(originView[3]).toBeCloseTo(1, 4);

            // In clip space: viewProjectionMatrix * originWorld
            const originClip = vec4.create();
            vec4.transformMat4(originClip, originWorld, camera.viewProjectionMatrix);

            // Normalized Device Coordinates (NDC) should be centered at (0, 0)
            const ndcX = originClip[0] / originClip[3];
            const ndcY = originClip[1] / originClip[3];
            expect(ndcX).toBeCloseTo(0, 4);
            expect(ndcY).toBeCloseTo(0, 4);
        });

        it("moving in parent-child hierarchy updates view and viewProjection correctly", () => {
            const parentRig = new SceneNode("ParentRig");
            const camera = new PerspectiveCamera({ fov: 60, aspect: 1.0, near: 0.1, far: 1000.0 });
            parentRig.addChild(camera);

            // Camera is offset by (0, 2, 5) relative to parent
            camera.transform.setPosition(0, 2, 5);

            parentRig.updateWorldTransform();
            camera.updateMatrices();

            // Translate parent rig
            parentRig.transform.setPosition(100, 50, -200);
            parentRig.updateWorldTransform();
            camera.updateMatrices();

            // World position of camera: (100, 52, -195)
            expect(camera.worldMatrix[12]).toBeCloseTo(100, 4);
            expect(camera.worldMatrix[13]).toBeCloseTo(52, 4);
            expect(camera.worldMatrix[14]).toBeCloseTo(-195, 4);

            // Expected view matrix: inverse of camera worldMatrix
            const expectedView = mat4.create();
            mat4.invert(expectedView, camera.worldMatrix);
            expect(camera.viewMatrix).toBeMatrixCloseTo(expectedView);

            // Expected viewProjection matrix: proj * view
            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, expectedView);
            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });
    });
});
