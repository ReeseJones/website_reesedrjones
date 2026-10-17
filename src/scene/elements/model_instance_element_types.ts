import type { Vector3Tuple } from "../../lit/converters/vector3_converter_types";
import type { IMeshGeometry } from "../models/mesh_geometry_types";
import type { IMaterial } from "../materials/material_types";
import type { ModelInstanceElement } from "./model_instance_element";

/**
 * Declarative property inputs for 3D model instance elements (<rj-model-instance>).
 */
export interface ModelInstanceElementProps {
    name?: string;
    position?: Vector3Tuple;
    rotation?: Vector3Tuple;
    scale?: Vector3Tuple;
    visible?: boolean;
    renderOrder?: number;
    geometry?: IMeshGeometry;
    material?: IMaterial;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-model-instance": ModelInstanceElement;
    }
}
