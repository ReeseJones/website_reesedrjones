import type { Vector3Like } from "../../maths/vector_types";
import type { PerspectiveCameraElement } from "./perspective_camera_element";

/**
 * Declarative property inputs for perspective camera elements (<rj-perspective-camera>).
 */
export interface PerspectiveCameraElementProps {
    name?: string;
    fov?: number;
    near?: number;
    far?: number;
    aspect?: number;
    makeDefault?: boolean;
    "make-default"?: boolean;
    position?: Vector3Like;
    rotation?: Vector3Like;
    scale?: Vector3Like;
    visible?: boolean;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-perspective-camera": PerspectiveCameraElement;
    }
}
