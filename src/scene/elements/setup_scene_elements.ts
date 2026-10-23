import { setupWebGLCanvasElement } from "./webgl_canvas_element";
import { setupSceneElement } from "./scene_element";
import { setupPerspectiveCameraElement } from "./perspective_camera_element";
import { setupNode3DElement } from "./node_3d_element";
import { setupModelInstanceElement } from "./model_instance_element";
import { setupSpriteInstanceElement } from "./sprite_instance_element";
import { setupPolylineElement } from "./polyline_instance_element";
import { setupGalacticCloudElement } from "../../galaxy_backdrop/elements/galactic_cloud_element";
import { setupGalaxyStarsElement } from "../../galaxy_backdrop/elements/galaxy_stars_element";
import { setupGalaxyCameraElement } from "../../galaxy_backdrop/elements/galaxy_camera_element";
import { setupFpsCounterElement } from "../../components/webgl_canvas/fps_counter_element";
import { setupWebGLFpsCounterElement } from "../../components/webgl_canvas/webgl_fps_counter_element";

/**
 * Registers all Lit Web Component elements for the 3D scene architecture:
 * - `<rj-webgl-canvas>` (`setupWebGLCanvasElement`)
 * - `<rj-scene>` (`setupSceneElement`)
 * - `<rj-perspective-camera>` (`setupPerspectiveCameraElement`)
 * - `<rj-galaxy-camera>` (`setupGalaxyCameraElement`)
 * - `<rj-node-3d>` (`setupNode3DElement`)
 * - `<rj-model-instance>` (`setupModelInstanceElement`)
 * - `<rj-sprite-instance>` (`setupSpriteInstanceElement`)
 * - `<rj-galactic-cloud>` (`setupGalacticCloudElement`)
 * - `<rj-galaxy-stars>` (`setupGalaxyStarsElement`)
 * - `<rj-fps-counter>` (`setupFpsCounterElement`)
 * - `<rj-webgl-fps-counter>` (`setupWebGLFpsCounterElement`)
 *
 * This function is completely idempotent and safe to call multiple times
 * across different entry points or render cycles because each individual
 * setup function is internally flag-guarded and verifies custom element registry presence.
 */
export function setupSceneElements(): void {
    setupWebGLCanvasElement();
    setupSceneElement();
    setupPerspectiveCameraElement();
    setupGalaxyCameraElement();
    setupNode3DElement();
    setupModelInstanceElement();
    setupSpriteInstanceElement();
    setupPolylineElement();
    setupGalacticCloudElement();
    setupGalaxyStarsElement();
    setupFpsCounterElement();
    setupWebGLFpsCounterElement();
}
