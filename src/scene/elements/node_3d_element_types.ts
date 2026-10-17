import type { Vector3Tuple } from "../../lit/converters/vector3_converter_types";
import type { Node3DElement } from "./node_3d_element";

/**
 * Declarative property inputs for 3D node elements (<rj-node-3d>).
 */
export interface Node3DElementProps {
    name?: string;
    position?: Vector3Tuple;
    rotation?: Vector3Tuple;
    scale?: Vector3Tuple;
    visible?: boolean;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-node-3d": Node3DElement;
    }
}
