import type { Vector3Tuple } from "../../lit/converters/vector3_converter_types";
import type { PerspectiveCameraElement } from "./perspective_camera_element";

/**
 * Declarative property inputs for perspective camera elements (<rj-perspective-camera>).
 */
export interface PerspectiveCameraElementProps {
    fov?: number;
    near?: number;
    far?: number;
    aspect?: number;
    makeDefault?: boolean;
    position?: Vector3Tuple;
    rotation?: Vector3Tuple;
    scale?: Vector3Tuple;
    visible?: boolean;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-perspective-camera": PerspectiveCameraElement;
    }
}
