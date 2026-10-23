import type { Vector3Like } from "../../maths/vector_types";
import type { RgbaLike } from "../../helpers/colors_types";
import type { IPolylineMaterial } from "../lines/polyline_material_types";
import type { PolylineJoinStyle, PolylineCapStyle } from "../lines/polyline_instance_types";
import type { PolylineInstanceElement } from "./polyline_instance_element";

/**
 * Declarative property inputs for polyline route elements (<rj-polyline>).
 */
export interface PolylineInstanceElementProps {
    name?: string;
    position?: Vector3Like;
    rotation?: Vector3Like;
    scale?: Vector3Like;
    hidden?: boolean;
    renderOrder?: number;
    points?: readonly Vector3Like[] | Float32Array;
    lineWidth?: number;
    "line-width"?: number;
    miterLimit?: number;
    "miter-limit"?: number;
    color?: RgbaLike | string;
    glowColor?: RgbaLike | string;
    "glow-color"?: RgbaLike | string;
    glowIntensity?: number;
    "glow-intensity"?: number;
    dashSpeed?: number;
    "dash-speed"?: number;
    dashFrequency?: number;
    "dash-frequency"?: number;
    joinStyle?: PolylineJoinStyle;
    capStyle?: PolylineCapStyle;
    material?: IPolylineMaterial;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-polyline": PolylineInstanceElement;
    }
}
