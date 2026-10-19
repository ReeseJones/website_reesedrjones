import type { GalaxyParameters } from "./parameters/types";
import type { GalaxyController } from "./galaxy_controller_types";

/**
 * Props for the declarative <GalaxyScene /> root backdrop component.
 */
export interface GalaxySceneProps {
    /** Target galaxy parameters (used if controller is not provided) */
    params?: GalaxyParameters;
    /** Interactive galaxy controller instance */
    controller?: GalaxyController;
    /** Pass priority in <WebGLCanvas> compositor pipeline (default: 0) */
    priority?: number;
    /** Whether to clear depth buffer before drawing (default: false for background stars) */
    clearDepth?: boolean;
}
