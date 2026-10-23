import type { Vector3Like } from "../../maths/vector_types";
import type { Node3DElement } from "./node_3d_element";

/**
 * Declarative property inputs for 3D node elements (<rj-node-3d>).
 */
export interface Node3DElementProps {
    name?: string;
    position?: Vector3Like;
    rotation?: Vector3Like;
    scale?: Vector3Like;
    hidden?: boolean;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-node-3d": Node3DElement;
    }
}
