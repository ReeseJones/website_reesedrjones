import type { GalaxyParameters } from "../parameters/types";
import type { PerspectiveCameraElementProps } from "../../scene/elements/perspective_camera_element_types";
import type { GalaxyCameraElement } from "./galaxy_camera_element";

/**
 * Declarative property inputs for the GalaxyCameraElement (<rj-galaxy-camera>).
 */
export interface GalaxyCameraElementProps extends PerspectiveCameraElementProps {
    params?: GalaxyParameters;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-galaxy-camera": GalaxyCameraElement;
    }
}
