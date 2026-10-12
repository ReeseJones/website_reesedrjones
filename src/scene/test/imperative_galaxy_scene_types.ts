import type { GalaxyParameters } from "../../galaxy_backdrop/parameters/index";
import type { GalaxyController } from "../../galaxy_backdrop/galaxy_controller_types";

/**
 * Configuration props for the imperative scene graph galaxy test pass.
 */
export interface ImperativeGalaxyScenePassProps {
    /** Target parameters or controller instance */
    params?: GalaxyParameters;
    controller?: GalaxyController;
    /** Pass priority in <WebGLCanvas> compositor pipeline (default: 0) */
    priority?: number;
    /** Whether to clear depth buffer before drawing (default: false for background stars) */
    clearDepth?: boolean;
}

