import type { Vector3Like, Vector2Like } from "../../maths/vector_types";
import type { Vector2Tuple } from "../../lit/converters/vector2_converter_types";
import type { ISpriteMaterial } from "../sprites/sprite_material_types";
import type { BillboardMode, SpriteSizeMode, SpriteSizeClamping } from "../sprites/sprite_instance_types";
import type { SpriteInstanceElement } from "./sprite_instance_element";

/**
 * Declarative property inputs for sprite instance elements (<rj-sprite-instance>).
 */
export interface SpriteInstanceElementProps {
    name?: string;
    position?: Vector3Like;
    rotation?: Vector3Like;
    scale?: Vector3Like;
    hidden?: boolean;
    renderOrder?: number;
    anchor?: Vector2Like | Vector2Tuple;
    size?: Vector2Like | Vector2Tuple;
    sizeMode?: SpriteSizeMode;
    sizeClamping?: SpriteSizeClamping;
    billboardMode?: BillboardMode;
    material?: ISpriteMaterial;
}

declare global {
    interface HTMLElementTagNameMap {
        "rj-sprite-instance": SpriteInstanceElement;
    }
}
