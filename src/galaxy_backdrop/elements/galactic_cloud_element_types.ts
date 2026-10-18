import type { GalacticCloudParameters, GalaxyParameters } from "../parameters/types";
import type { GalaxyParallaxState } from "../galaxy_scene_types";
import type { GalacticCloudElement } from "./galactic_cloud_element";

/**
 * Declarative property inputs for the GalacticCloudElement (<rj-galactic-cloud>).
 */
export interface GalacticCloudElementProps {
    params?: GalacticCloudParameters | GalaxyParameters;
    parallaxState?: GalaxyParallaxState;
    name?: string;
    visible?: boolean;
    renderOrder?: number;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-galactic-cloud": GalacticCloudElement;
    }
}
