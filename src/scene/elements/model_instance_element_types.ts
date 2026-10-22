import type { Vector3Like } from "../../maths/vector_types";
import type { IMeshGeometry } from "../models/mesh_geometry_types";
import type { IMaterial } from "../materials/material_types";
import type { ModelInstanceElement } from "./model_instance_element";

/**
 * Declarative property inputs for 3D model instance elements (<rj-model-instance>).
 */
export interface ModelInstanceElementProps {
    name?: string;
    position?: Vector3Like;
    rotation?: Vector3Like;
    scale?: Vector3Like;
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
