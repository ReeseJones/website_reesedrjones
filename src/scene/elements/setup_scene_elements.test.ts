import { describe, it, expect, beforeEach } from "vitest";
import { setupSceneElements } from "./setup_scene_elements";
import { WebGLCanvasElement } from "./webgl_canvas_element";
import { SceneElement } from "./scene_element";
import { PerspectiveCameraElement } from "./perspective_camera_element";
import { Node3DElement } from "./node_3d_element";
import { ModelInstanceElement } from "./model_instance_element";
import { GalacticCloudElement } from "../../galaxy_backdrop/elements/galactic_cloud_element";
import { GalaxyStarsElement } from "../../galaxy_backdrop/elements/galaxy_stars_element";
import { TAG_RJ_WEBGL_CANVAS } from "./webgl_canvas_element_constants";
import { TAG_RJ_SCENE } from "./scene_element_constants";
import { TAG_RJ_PERSPECTIVE_CAMERA } from "./perspective_camera_element_constants";
import { TAG_RJ_NODE_3D } from "./node_3d_element_constants";
import { TAG_RJ_MODEL_INSTANCE } from "./model_instance_element_constants";
import { TAG_RJ_GALACTIC_CLOUD } from "../../galaxy_backdrop/elements/galactic_cloud_element_constants";
import { TAG_RJ_GALAXY_STARS } from "../../galaxy_backdrop/elements/galaxy_stars_element_constants";

describe("setupSceneElements()", () => {
    beforeEach(() => {
        setupSceneElements();
    });

    describe("custom element registration", () => {
        it("should register all 7 custom element tag names with customElements", () => {
            expect(customElements.get(TAG_RJ_WEBGL_CANVAS)).toBe(WebGLCanvasElement);
            expect(customElements.get(TAG_RJ_SCENE)).toBe(SceneElement);
            expect(customElements.get(TAG_RJ_PERSPECTIVE_CAMERA)).toBe(PerspectiveCameraElement);
            expect(customElements.get(TAG_RJ_NODE_3D)).toBe(Node3DElement);
            expect(customElements.get(TAG_RJ_MODEL_INSTANCE)).toBe(ModelInstanceElement);
            expect(customElements.get(TAG_RJ_GALACTIC_CLOUD)).toBe(GalacticCloudElement);
            expect(customElements.get(TAG_RJ_GALAXY_STARS)).toBe(GalaxyStarsElement);
        });

        it("should register TAG_RJ_WEBGL_CANVAS ('rj-webgl-canvas') to WebGLCanvasElement", () => {
            expect(TAG_RJ_WEBGL_CANVAS).toBe("rj-webgl-canvas");
            expect(customElements.get(TAG_RJ_WEBGL_CANVAS)).toBe(WebGLCanvasElement);
        });

        it("should register TAG_RJ_SCENE ('rj-scene') to SceneElement", () => {
            expect(TAG_RJ_SCENE).toBe("rj-scene");
            expect(customElements.get(TAG_RJ_SCENE)).toBe(SceneElement);
        });

        it("should register TAG_RJ_PERSPECTIVE_CAMERA ('rj-perspective-camera') to PerspectiveCameraElement", () => {
            expect(TAG_RJ_PERSPECTIVE_CAMERA).toBe("rj-perspective-camera");
            expect(customElements.get(TAG_RJ_PERSPECTIVE_CAMERA)).toBe(PerspectiveCameraElement);
        });

        it("should register TAG_RJ_NODE_3D ('rj-node-3d') to Node3DElement", () => {
            expect(TAG_RJ_NODE_3D).toBe("rj-node-3d");
            expect(customElements.get(TAG_RJ_NODE_3D)).toBe(Node3DElement);
        });

        it("should register TAG_RJ_MODEL_INSTANCE ('rj-model-instance') to ModelInstanceElement", () => {
            expect(TAG_RJ_MODEL_INSTANCE).toBe("rj-model-instance");
            expect(customElements.get(TAG_RJ_MODEL_INSTANCE)).toBe(ModelInstanceElement);
        });

        it("should register TAG_RJ_GALACTIC_CLOUD ('rj-galactic-cloud') to GalacticCloudElement", () => {
            expect(TAG_RJ_GALACTIC_CLOUD).toBe("rj-galactic-cloud");
            expect(customElements.get(TAG_RJ_GALACTIC_CLOUD)).toBe(GalacticCloudElement);
        });

        it("should register TAG_RJ_GALAXY_STARS ('rj-galaxy-stars') to GalaxyStarsElement", () => {
            expect(TAG_RJ_GALAXY_STARS).toBe("rj-galaxy-stars");
            expect(customElements.get(TAG_RJ_GALAXY_STARS)).toBe(GalaxyStarsElement);
        });
    });

    describe("idempotency", () => {
        it("should be idempotent and not throw when called repeatedly", () => {
            expect(() => {
                setupSceneElements();
                setupSceneElements();
                setupSceneElements();
            }).not.toThrow();

            expect(customElements.get(TAG_RJ_WEBGL_CANVAS)).toBe(WebGLCanvasElement);
            expect(customElements.get(TAG_RJ_SCENE)).toBe(SceneElement);
            expect(customElements.get(TAG_RJ_PERSPECTIVE_CAMERA)).toBe(PerspectiveCameraElement);
            expect(customElements.get(TAG_RJ_NODE_3D)).toBe(Node3DElement);
            expect(customElements.get(TAG_RJ_MODEL_INSTANCE)).toBe(ModelInstanceElement);
            expect(customElements.get(TAG_RJ_GALACTIC_CLOUD)).toBe(GalacticCloudElement);
            expect(customElements.get(TAG_RJ_GALAXY_STARS)).toBe(GalaxyStarsElement);
        });
    });

    describe("element instantiation via document.createElement()", () => {
        it("should instantiate WebGLCanvasElement via document.createElement(TAG_RJ_WEBGL_CANVAS)", () => {
            const el = document.createElement(TAG_RJ_WEBGL_CANVAS);
            expect(el).toBeInstanceOf(WebGLCanvasElement);
            expect(el.tagName.toLowerCase()).toBe(TAG_RJ_WEBGL_CANVAS);
        });

        it("should instantiate SceneElement via document.createElement(TAG_RJ_SCENE)", () => {
            const el = document.createElement(TAG_RJ_SCENE);
            expect(el).toBeInstanceOf(SceneElement);
            expect(el.tagName.toLowerCase()).toBe(TAG_RJ_SCENE);
        });

        it("should instantiate PerspectiveCameraElement via document.createElement(TAG_RJ_PERSPECTIVE_CAMERA)", () => {
            const el = document.createElement(TAG_RJ_PERSPECTIVE_CAMERA);
            expect(el).toBeInstanceOf(PerspectiveCameraElement);
            expect(el.tagName.toLowerCase()).toBe(TAG_RJ_PERSPECTIVE_CAMERA);
        });

        it("should instantiate Node3DElement via document.createElement(TAG_RJ_NODE_3D)", () => {
            const el = document.createElement(TAG_RJ_NODE_3D);
            expect(el).toBeInstanceOf(Node3DElement);
            expect(el.tagName.toLowerCase()).toBe(TAG_RJ_NODE_3D);
        });

        it("should instantiate ModelInstanceElement via document.createElement(TAG_RJ_MODEL_INSTANCE)", () => {
            const el = document.createElement(TAG_RJ_MODEL_INSTANCE);
            expect(el).toBeInstanceOf(ModelInstanceElement);
            expect(el.tagName.toLowerCase()).toBe(TAG_RJ_MODEL_INSTANCE);
        });

        it("should instantiate GalacticCloudElement via document.createElement(TAG_RJ_GALACTIC_CLOUD)", () => {
            const el = document.createElement(TAG_RJ_GALACTIC_CLOUD);
            expect(el).toBeInstanceOf(GalacticCloudElement);
            expect(el.tagName.toLowerCase()).toBe(TAG_RJ_GALACTIC_CLOUD);
        });

        it("should instantiate GalaxyStarsElement via document.createElement(TAG_RJ_GALAXY_STARS)", () => {
            const el = document.createElement(TAG_RJ_GALAXY_STARS);
            expect(el).toBeInstanceOf(GalaxyStarsElement);
            expect(el.tagName.toLowerCase()).toBe(TAG_RJ_GALAXY_STARS);
        });

        it("should instantiate each registered tag successfully across all 7 definitions", () => {
            const definitions = [
                { tag: TAG_RJ_WEBGL_CANVAS, constructorFn: WebGLCanvasElement },
                { tag: TAG_RJ_SCENE, constructorFn: SceneElement },
                { tag: TAG_RJ_PERSPECTIVE_CAMERA, constructorFn: PerspectiveCameraElement },
                { tag: TAG_RJ_NODE_3D, constructorFn: Node3DElement },
                { tag: TAG_RJ_MODEL_INSTANCE, constructorFn: ModelInstanceElement },
                { tag: TAG_RJ_GALACTIC_CLOUD, constructorFn: GalacticCloudElement },
                { tag: TAG_RJ_GALAXY_STARS, constructorFn: GalaxyStarsElement },
            ] as const;

            for (const { tag, constructorFn } of definitions) {
                const el = document.createElement(tag);
                expect(el).toBeInstanceOf(constructorFn);
                expect(el).toBeInstanceOf(HTMLElement);
                expect(el.tagName.toLowerCase()).toBe(tag);
            }
        });
    });
});
