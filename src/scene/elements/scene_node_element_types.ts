import type { Vector3Tuple } from "../../lit/converters/vector3_converter_types";

/**
 * Common declarative property inputs for structural scene graph node elements.
 */
export interface SceneNodeElementProps {
    name?: string;
    position?: Vector3Tuple;
    rotation?: Vector3Tuple;
    scale?: Vector3Tuple;
    visible?: boolean;
}
