import type { GalaxyParameters } from "../parameters/types";
import type { GalaxyStarsElement } from "./galaxy_stars_element";

/**
 * Declarative property inputs for the GalaxyStarsElement (<rj-galaxy-stars>).
 */
export interface GalaxyStarsElementProps {
    params?: GalaxyParameters;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-galaxy-stars": GalaxyStarsElement;
    }
}
