import type { GalaxyParameters } from "./parameters/index";
import type { GalaxyController } from "./galaxy_controller_types";

export interface GalacticCloudPassProps {
    /** Target parameters or controller instance */
    params?: GalaxyParameters;
    controller?: GalaxyController;
    /** Subscriber priority (default: -10 for background pass) */
    priority?: number;
}
