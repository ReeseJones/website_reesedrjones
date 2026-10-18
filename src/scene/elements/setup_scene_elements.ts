import { setupWebGLCanvasElement } from "./webgl_canvas_element";
import { setupSceneElement } from "./scene_element";
import { setupPerspectiveCameraElement } from "./perspective_camera_element";
import { setupNode3DElement } from "./node_3d_element";
import { setupModelInstanceElement } from "./model_instance_element";

/**
 * Registers all Lit Web Component elements for the 3D scene architecture:
 * - `<rj-webgl-canvas>` (`setupWebGLCanvasElement`)
 * - `<rj-scene>` (`setupSceneElement`)
 * - `<rj-perspective-camera>` (`setupPerspectiveCameraElement`)
 * - `<rj-node-3d>` (`setupNode3DElement`)
 * - `<rj-model-instance>` (`setupModelInstanceElement`)
 *
 * This function is completely idempotent and safe to call multiple times
 * across different entry points or render cycles because each individual
 * setup function is internally flag-guarded and verifies custom element registry presence.
 */
export function setupSceneElements(): void {
    setupWebGLCanvasElement();
    setupSceneElement();
    setupPerspectiveCameraElement();
    setupNode3DElement();
    setupModelInstanceElement();
}
