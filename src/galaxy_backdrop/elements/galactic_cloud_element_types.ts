import type { GalacticCloudParameters, GalaxyParameters } from "../parameters/types";
import type { GalacticCloudElement } from "./galactic_cloud_element";

/**
 * Declarative property inputs for the GalacticCloudElement (<rj-galactic-cloud>).
 */
export interface GalacticCloudElementProps {
    params?: GalacticCloudParameters | GalaxyParameters;
    visible?: boolean;
    renderOrder?: number;
    "render-order"?: number;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-galactic-cloud": GalacticCloudElement;
    }
}
