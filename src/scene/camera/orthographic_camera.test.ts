import { describe, it, expect, vi } from "vitest";
import { mat4, vec4 } from "gl-matrix";
import { OrthographicCamera } from "./orthographic_camera";
import { Camera } from "./camera";
import { SceneNode } from "../core/scene_node";

describe("OrthographicCamera", () => {
    describe("constructor and initial properties", () => {
        it("initializes with default values: left = -1, right = 1, top = 1, bottom = -1, zoom = 1.0, near = 0.1, far = 1000.0, name = 'OrthographicCamera', aspect is undefined, generated unique id", () => {
            const camera = new OrthographicCamera();

            expect(camera.left).toBe(-1);
            expect(camera.right).toBe(1);
            expect(camera.top).toBe(1);
            expect(camera.bottom).toBe(-1);
            expect(camera.zoom).toBe(1.0);
            expect(camera.near).toBe(0.1);
            expect(camera.far).toBe(1000.0);
            expect(camera.name).toBe("OrthographicCamera");
            expect(camera.aspect).toBeUndefined();
            expect(camera.id).toBeDefined();
            expect(camera.id).toMatch(/^OrthographicCamera_\d+/);
        });

        it("accepts custom options: left, right, top, bottom, zoom, near, far, custom name, and custom id", () => {
            const camera = new OrthographicCamera(
                {
                    left: -10,
                    right: 20,
                    top: 30,
                    bottom: -5,
                    zoom: 2.5,
                    near: 0.5,
                    far: 500.0
                },
                "CustomOrthoCam",
                "cam-ortho-99"
            );

            expect(camera.left).toBe(-10);
            expect(camera.right).toBe(20);
            expect(camera.top).toBe(30);
            expect(camera.bottom).toBe(-5);
            expect(camera.zoom).toBe(2.5);
            expect(camera.near).toBe(0.5);
            expect(camera.far).toBe(500.0);
            expect(camera.name).toBe("CustomOrthoCam");
            expect(camera.id).toBe("cam-ortho-99");
        });

        it("inherits from Camera and SceneNode", () => {
            const camera = new OrthographicCamera();

            expect(camera).toBeInstanceOf(OrthographicCamera);
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

    describe("bounds and zoom getters and setters", () => {
        describe("left getter and setter", () => {
            it("returns current value", () => {
                const camera = new OrthographicCamera({ left: -2 });
                expect(camera.left).toBe(-2);
            });

            it("updating left flags projection as dirty (verified by matrix changes upon updateMatrices())", () => {
                const camera = new OrthographicCamera();
                camera.updateMatrices();
                const initialM00 = camera.projectionMatrix[0];
                const initialM12 = camera.projectionMatrix[12];

                camera.left = -3;
                expect(camera.left).toBe(-3);

                camera.updateMatrices();
                expect(camera.projectionMatrix[0]).not.toBeCloseTo(initialM00, 4);
                expect(camera.projectionMatrix[12]).not.toBeCloseTo(initialM12, 4);

                const expected = mat4.create();
                mat4.ortho(expected, -3, 1, -1, 1, 0.1, 1000.0);
                expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
            });

            it("setting left to same value does not dirty projection (caching verified)", () => {
                const camera = new OrthographicCamera({ left: -2 });
                camera.updateMatrices();

                const spy = vi.spyOn(camera, "updateProjectionMatrix");
                camera.left = -2;
                camera.updateMatrices();

                expect(spy).not.toHaveBeenCalled();
            });
        });

        describe("right getter and setter", () => {
            it("returns current value", () => {
                const camera = new OrthographicCamera({ right: 5 });
                expect(camera.right).toBe(5);
            });

            it("updating right flags projection as dirty", () => {
                const camera = new OrthographicCamera();
                camera.updateMatrices();
                const initialM00 = camera.projectionMatrix[0];

                camera.right = 3;
                expect(camera.right).toBe(3);

                camera.updateMatrices();
                expect(camera.projectionMatrix[0]).not.toBeCloseTo(initialM00, 4);

                const expected = mat4.create();
                mat4.ortho(expected, -1, 3, -1, 1, 0.1, 1000.0);
                expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
            });

            it("setting right to same value does not dirty projection", () => {
                const camera = new OrthographicCamera({ right: 4 });
                camera.updateMatrices();

                const spy = vi.spyOn(camera, "updateProjectionMatrix");
                camera.right = 4;
                camera.updateMatrices();

                expect(spy).not.toHaveBeenCalled();
            });
        });

        describe("top getter and setter", () => {
            it("returns current value", () => {
                const camera = new OrthographicCamera({ top: 8 });
                expect(camera.top).toBe(8);
            });

            it("updating top flags projection as dirty", () => {
                const camera = new OrthographicCamera();
                camera.updateMatrices();
                const initialM55 = camera.projectionMatrix[5];

                camera.top = 3;
                expect(camera.top).toBe(3);

                camera.updateMatrices();
                expect(camera.projectionMatrix[5]).not.toBeCloseTo(initialM55, 4);

                const expected = mat4.create();
                mat4.ortho(expected, -1, 1, -1, 3, 0.1, 1000.0);
                expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
            });

            it("setting top to same value does not dirty projection", () => {
                const camera = new OrthographicCamera({ top: 5 });
                camera.updateMatrices();

                const spy = vi.spyOn(camera, "updateProjectionMatrix");
                camera.top = 5;
                camera.updateMatrices();

                expect(spy).not.toHaveBeenCalled();
            });
        });

        describe("bottom getter and setter", () => {
            it("returns current value", () => {
                const camera = new OrthographicCamera({ bottom: -6 });
                expect(camera.bottom).toBe(-6);
            });

            it("updating bottom flags projection as dirty", () => {
                const camera = new OrthographicCamera();
                camera.updateMatrices();
                const initialM55 = camera.projectionMatrix[5];

                camera.bottom = -3;
                expect(camera.bottom).toBe(-3);

                camera.updateMatrices();
                expect(camera.projectionMatrix[5]).not.toBeCloseTo(initialM55, 4);

                const expected = mat4.create();
                mat4.ortho(expected, -1, 1, -3, 1, 0.1, 1000.0);
                expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
            });

            it("setting bottom to same value does not dirty projection", () => {
                const camera = new OrthographicCamera({ bottom: -4 });
                camera.updateMatrices();

                const spy = vi.spyOn(camera, "updateProjectionMatrix");
                camera.bottom = -4;
                camera.updateMatrices();

                expect(spy).not.toHaveBeenCalled();
            });
        });

        describe("zoom getter and setter", () => {
            it("returns current zoom", () => {
                const camera = new OrthographicCamera({ zoom: 1.5 });
                expect(camera.zoom).toBe(1.5);
            });

            it("updating zoom flags projection as dirty", () => {
                const camera = new OrthographicCamera({ zoom: 1.0 });
                camera.updateMatrices();
                const initialM00 = camera.projectionMatrix[0];

                camera.zoom = 2.0;
                expect(camera.zoom).toBe(2.0);

                camera.updateMatrices();
                expect(camera.projectionMatrix[0]).toBeCloseTo(initialM00 * 2.0, 4);

                const expected = mat4.create();
                mat4.ortho(expected, -0.5, 0.5, -0.5, 0.5, 0.1, 1000.0);
                expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
            });

            it("setting zoom to same value does not dirty projection", () => {
                const camera = new OrthographicCamera({ zoom: 2.0 });
                camera.updateMatrices();

                const spy = vi.spyOn(camera, "updateProjectionMatrix");
                camera.zoom = 2.0;
                camera.updateMatrices();

                expect(spy).not.toHaveBeenCalled();
            });
        });

        describe("near and far setters", () => {
            it("updating near flags projection as dirty", () => {
                const camera = new OrthographicCamera({ near: 0.1, far: 100.0 });
                camera.updateMatrices();
                const initialM10 = camera.projectionMatrix[10];

                camera.near = 1.0;
                expect(camera.near).toBe(1.0);

                camera.updateMatrices();
                expect(camera.projectionMatrix[10]).not.toBeCloseTo(initialM10, 4);

                const expected = mat4.create();
                mat4.ortho(expected, -1, 1, -1, 1, 1.0, 100.0);
                expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
            });

            it("updating far flags projection as dirty", () => {
                const camera = new OrthographicCamera({ near: 0.1, far: 100.0 });
                camera.updateMatrices();
                const initialM10 = camera.projectionMatrix[10];

                camera.far = 200.0;
                expect(camera.far).toBe(200.0);

                camera.updateMatrices();
                expect(camera.projectionMatrix[10]).not.toBeCloseTo(initialM10, 4);

                const expected = mat4.create();
                mat4.ortho(expected, -1, 1, -1, 1, 0.1, 200.0);
                expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
            });

            it("setting near and far to same value does not dirty projection", () => {
                const camera = new OrthographicCamera({ near: 0.5, far: 50.0 });
                camera.updateMatrices();

                const spy = vi.spyOn(camera, "updateProjectionMatrix");
                camera.near = 0.5;
                camera.far = 50.0;
                camera.updateMatrices();

                expect(spy).not.toHaveBeenCalled();
            });
        });
    });

    describe("zoom fallbacks and edge cases", () => {
        it("zoom = 2.0 scales projection matrix by 2 (effective boundaries halved)", () => {
            const camera = new OrthographicCamera({ left: -2, right: 2, top: 4, bottom: -4, zoom: 2.0 });
            camera.updateMatrices();

            expect(camera.projectionMatrix[0]).toBeCloseTo(1.0, 5);
            expect(camera.projectionMatrix[5]).toBeCloseTo(0.5, 5);

            const expected = mat4.create();
            mat4.ortho(expected, -1, 1, -2, 2, 0.1, 1000.0);
            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });

        it("zoom = 0 falls back to effectiveZoom = 1.0 without dividing by zero or producing NaNs", () => {
            const camera = new OrthographicCamera({ left: -2, right: 2, top: 3, bottom: -3, zoom: 0 });
            camera.updateMatrices();

            for (let i = 0; i < 16; i++) {
                expect(Number.isFinite(camera.projectionMatrix[i])).toBe(true);
                expect(Number.isNaN(camera.projectionMatrix[i])).toBe(false);
            }

            const expected = mat4.create();
            mat4.ortho(expected, -2, 2, -3, 3, 0.1, 1000.0);
            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });

        it("negative zoom (e.g. -0.5) falls back to effectiveZoom = 1.0 safely", () => {
            const camera = new OrthographicCamera({ left: -4, right: 4, top: 4, bottom: -4, zoom: -0.5 });
            camera.updateMatrices();

            for (let i = 0; i < 16; i++) {
                expect(Number.isFinite(camera.projectionMatrix[i])).toBe(true);
                expect(Number.isNaN(camera.projectionMatrix[i])).toBe(false);
            }

            const expected = mat4.create();
            mat4.ortho(expected, -4, 4, -4, 4, 0.1, 1000.0);
            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });
    });

    describe("updateAspectRatio", () => {
        it("adapts horizontal bounds (left/right) to match aspect ratio while preserving vertical height and centerX", () => {
            const camera = new OrthographicCamera({ left: -2, right: 2, top: 2, bottom: -2 });
            camera.updateAspectRatio(16 / 9);

            expect(camera.left).toBeCloseTo(-32 / 9, 5);
            expect(camera.right).toBeCloseTo(32 / 9, 5);
            expect(camera.top).toBe(2);
            expect(camera.bottom).toBe(-2);
        });

        it("updates aspect getter property", () => {
            const camera = new OrthographicCamera();
            expect(camera.aspect).toBeUndefined();

            camera.updateAspectRatio(1.75);
            expect(camera.aspect).toBe(1.75);
        });

        it("flags projection as dirty", () => {
            const camera = new OrthographicCamera();
            camera.updateMatrices();
            const initialM00 = camera.projectionMatrix[0];

            camera.updateAspectRatio(2.0);
            camera.updateMatrices();

            expect(camera.projectionMatrix[0]).toBeCloseTo(initialM00 / 2.0, 5);
        });

        it("adapts asymmetrical centered bounds correctly (e.g. left=0, right=10, centerX=5, height=4, aspect=2.0 -> halfWidth=4 -> left=1, right=9)", () => {
            const camera = new OrthographicCamera({
                left: 0,
                right: 10,
                top: 2,
                bottom: -2
            });

            camera.updateAspectRatio(2.0);

            expect(camera.left).toBe(1);
            expect(camera.right).toBe(9);
            expect((camera.left + camera.right) * 0.5).toBe(5);
            expect(camera.top).toBe(2);
            expect(camera.bottom).toBe(-2);

            camera.updateMatrices();
            const expected = mat4.create();
            mat4.ortho(expected, 1, 9, -2, 2, 0.1, 1000.0);
            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });
    });

    describe("projection matrix computation", () => {
        it("verifies computed projectionMatrix against mat4.ortho for default settings", () => {
            const camera = new OrthographicCamera();
            camera.updateMatrices();

            const expected = mat4.create();
            mat4.ortho(expected, -1, 1, -1, 1, 0.1, 1000.0);

            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });

        it("verifies computed projectionMatrix against mat4.ortho for asymmetric bounds (left=-5, right=15, top=20, bottom=-10, near=1.0, far=500.0)", () => {
            const camera = new OrthographicCamera({
                left: -5,
                right: 15,
                top: 20,
                bottom: -10,
                near: 1.0,
                far: 500.0
            });
            camera.updateMatrices();

            const expected = mat4.create();
            mat4.ortho(expected, -5, 15, -10, 20, 1.0, 500.0);

            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });

        it("verifies computed projectionMatrix against mat4.ortho for zoomed camera (zoom=3.0)", () => {
            const camera = new OrthographicCamera({
                left: -6,
                right: 6,
                top: 3,
                bottom: -3,
                near: 0.5,
                far: 200.0,
                zoom: 3.0
            });
            camera.updateMatrices();

            const expected = mat4.create();
            mat4.ortho(expected, -6 / 3.0, 6 / 3.0, -3 / 3.0, 3 / 3.0, 0.5, 200.0);

            expect(camera.projectionMatrix).toBeMatrixCloseTo(expected);
        });

        it("verifies analytical invariants: proj[0], proj[5], proj[10], proj[11], proj[15]", () => {
            const left = -4;
            const right = 8;
            const top = 12;
            const bottom = -6;
            const near = 2.0;
            const far = 600.0;
            const zoom = 2.5;

            const camera = new OrthographicCamera({ left, right, top, bottom, near, far, zoom });
            camera.updateMatrices();

            const proj = camera.projectionMatrix;

            // proj[0] equals 2 * zoom / (right - left)
            expect(proj[0]).toBeCloseTo((2 * zoom) / (right - left), 5);
            // proj[5] equals 2 * zoom / (top - bottom)
            expect(proj[5]).toBeCloseTo((2 * zoom) / (top - bottom), 5);
            // proj[10] equals -2 / (far - near)
            expect(proj[10]).toBeCloseTo(-2 / (far - near), 5);
            // proj[15] equals 1.0 (affine parallel projection, unlike perspective)
            expect(proj[15]).toBe(1.0);
            // proj[11] equals 0.0 (no perspective W-divide)
            expect(proj[11]).toBe(0.0);
        });
    });

    describe("matrix update and caching integration", () => {
        it("calling updateMatrices() computes valid projectionMatrix and combined viewProjectionMatrix", () => {
            const camera = new OrthographicCamera({ left: -5, right: 5, top: 5, bottom: -5, near: 0.1, far: 100.0 });
            camera.transform.setPosition(0, 0, 10);
            camera.updateMatrices();

            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, camera.viewMatrix);

            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });

        it("projection matrix is cached across multiple updateMatrices() calls if no parameters changed", () => {
            const camera = new OrthographicCamera();
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
            const camera = new OrthographicCamera();
            camera.updateMatrices();

            const spyProj = vi.spyOn(camera, "updateProjectionMatrix");

            // Overwrite sentinel into projectionMatrix
            camera.projectionMatrix[15] = 777.0;

            camera.transform.setPosition(15, 25, 35);
            camera.updateMatrices();

            // Projection should NOT have recomputed
            expect(spyProj).not.toHaveBeenCalled();
            expect(camera.projectionMatrix[15]).toBe(777.0);

            // View matrix should reflect new position
            expect(camera.viewMatrix[12]).toBeCloseTo(-15, 4);
            expect(camera.viewMatrix[13]).toBeCloseTo(-25, 4);
            expect(camera.viewMatrix[14]).toBeCloseTo(-35, 4);

            // viewProjectionMatrix should reflect product of cached projection and updated view
            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, camera.viewMatrix);
            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });

        it("altering bounds or zoom updates projectionMatrix and viewProjectionMatrix while reusing cached viewMatrix", () => {
            const camera = new OrthographicCamera();
            camera.transform.setPosition(3, 4, 5);
            camera.updateMatrices();

            // Sentinel in viewMatrix
            camera.viewMatrix[12] = 888.0;

            camera.zoom = 2.0;
            camera.left = -10;
            camera.right = 10;
            camera.updateMatrices();

            // View matrix retained sentinel (was not re-inverted)
            expect(camera.viewMatrix[12]).toBe(888.0);

            // Projection matrix recomputed
            const expectedProj = mat4.create();
            mat4.ortho(expectedProj, -10 / 2.0, 10 / 2.0, -1 / 2.0, 1 / 2.0, 0.1, 1000.0);
            expect(camera.projectionMatrix).toBeMatrixCloseTo(expectedProj);

            // viewProjection updated with new projection and cached view
            const expectedVP = mat4.create();
            mat4.multiply(expectedVP, camera.projectionMatrix, camera.viewMatrix);
            expect(camera.viewProjectionMatrix).toBeMatrixCloseTo(expectedVP);
        });
    });

    describe("scene graph and lookAt integration", () => {
        it("camera can be positioned and oriented using lookAt(), transforming world coordinates linearly to view and clip space", () => {
            const camera = new OrthographicCamera({
                left: -5,
                right: 5,
                top: 5,
                bottom: -5,
                near: 1.0,
                far: 20.0
            });
            camera.transform.setPosition(0, 0, 10);
            camera.lookAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });

            camera.updateMatrices();

            // Origin in world space
            const originWorld = vec4.fromValues(0, 0, 0, 1);

            // In view space: camera is at (0, 0, 10) looking at (0, 0, 0)
            // Origin in view space should be at (0, 0, -10)
            const originView = vec4.create();
            vec4.transformMat4(originView, originWorld, camera.viewMatrix);

            expect(originView[0]).toBeCloseTo(0, 4);
            expect(originView[1]).toBeCloseTo(0, 4);
            expect(originView[2]).toBeCloseTo(-10, 4);
            expect(originView[3]).toBeCloseTo(1, 4);

            // In clip space: viewProjectionMatrix * originWorld
            const originClip = vec4.create();
            vec4.transformMat4(originClip, originWorld, camera.viewProjectionMatrix);

            // Linear parallel projection: clip.w is 1.0 (no perspective division)
            expect(originClip[3]).toBeCloseTo(1.0, 4);
            expect(originClip[0]).toBeCloseTo(0, 4);
            expect(originClip[1]).toBeCloseTo(0, 4);

            // Test a point offset horizontally: world (2.5, 0, 0)
            // In view space: (2.5, 0, -10)
            // In clip space: clip.x = 2.5 * (2 / (right - left)) = 2.5 * (2 / 10) = 0.5
            const offsetWorld = vec4.fromValues(2.5, 0, 0, 1);
            const offsetClip = vec4.create();
            vec4.transformMat4(offsetClip, offsetWorld, camera.viewProjectionMatrix);

            expect(offsetClip[0]).toBeCloseTo(0.5, 4);
            expect(offsetClip[1]).toBeCloseTo(0, 4);
            expect(offsetClip[3]).toBeCloseTo(1.0, 4);
        });

        it("moving in parent-child hierarchy updates view and viewProjection correctly", () => {
            const parentRig = new SceneNode("ParentRig");
            const camera = new OrthographicCamera({
                left: -10,
                right: 10,
                top: 10,
                bottom: -10,
                near: 0.1,
                far: 1000.0
            });
            parentRig.addChild(camera);

            // Camera offset relative to parent
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
