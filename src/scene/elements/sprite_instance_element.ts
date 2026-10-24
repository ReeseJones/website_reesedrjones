import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { SpriteInstance } from "../sprites/sprite_instance";
import { SpritePinMaterial } from "../sprites/sprite_pin_material";
import type { ISpriteMaterial } from "../sprites/sprite_material_types";
import {
    BillboardMode,
    SpriteSizeMode,
    type SpriteSizeClamping,
} from "../sprites/sprite_instance_types";
import { vector2Converter } from "../../lit/converters/vector2_converter";
import type { Vector2Tuple } from "../../lit/converters/vector2_converter_types";
import { vector3Converter } from "../../lit/converters/vector3_converter";
import { createEnumConverter } from "../../lit/converters/enum_converter";
import type { Vector2Like, Vector3Like } from "../../maths/vector_types";
import type { ISceneNode } from "../core/scene_node_types";
import { parentNodeContext } from "./scene_element_types";
import {
    TAG_RJ_SPRITE_INSTANCE,
    DEFAULT_SPRITE_INSTANCE_NAME,
    DEFAULT_SPRITE_INSTANCE_HIDDEN,
    DEFAULT_SPRITE_INSTANCE_RENDER_ORDER,
    DEFAULT_SPRITE_INSTANCE_POSITION,
    DEFAULT_SPRITE_INSTANCE_ROTATION,
    DEFAULT_SPRITE_INSTANCE_SCALE,
    DEFAULT_SPRITE_INSTANCE_ANCHOR,
    DEFAULT_SPRITE_INSTANCE_SIZE,
    DEFAULT_SPRITE_INSTANCE_SIZE_MODE,
    DEFAULT_SPRITE_INSTANCE_BILLBOARD_MODE,
} from "./sprite_instance_element_constants";

const TUPLE_INDEX_X = 0;
const TUPLE_INDEX_Y = 1;

export const spriteSizeModeConverter = createEnumConverter(
    SpriteSizeMode,
    SpriteSizeMode.ScreenSpace
);

export const billboardModeConverter = createEnumConverter(
    BillboardMode,
    BillboardMode.Spherical
);

/**
 * Declarative 3D Billboard Sprite Instance Web Component (<rj-sprite-instance>)
 * synchronizing material, anchor, dimensions, sizing mode, billboarding rotation constraint,
 * render queue priority, transform hierarchy, Euler rotations, translation, scale,
 * and visibility with an underlying programmatic SpriteInstance,
 * wiring itself to parent and child nodes via @lit/context.
 */
export class SpriteInstanceElement extends LitElement {
    public static override properties = {
        name: { type: String, reflect: true },
        position: { converter: vector3Converter, reflect: true },
        rotation: { converter: vector3Converter, reflect: true },
        scale: { converter: vector3Converter, reflect: true },
        hidden: { type: Boolean, reflect: true },
        renderOrder: { type: Number, attribute: "render-order" },
        anchor: { converter: vector2Converter },
        size: { converter: vector2Converter },
        sizeMode: { converter: spriteSizeModeConverter, attribute: "size-mode" },
        sizeClamping: { attribute: false },
        billboardMode: { converter: billboardModeConverter, attribute: "billboard-mode" },
        material: { attribute: false },
    };

    public declare name: string;
    public declare position: Vector3Like;
    public declare rotation: Vector3Like;
    public declare scale: Vector3Like;
    public declare hidden: boolean;
    public declare renderOrder: number;
    public declare anchor: Vector2Like | Vector2Tuple;
    public declare size: Vector2Like | Vector2Tuple;
    public declare sizeMode: SpriteSizeMode;
    public declare sizeClamping: SpriteSizeClamping | undefined;
    public declare billboardMode: BillboardMode;
    public declare material: ISpriteMaterial;

    private readonly _spriteInstance: SpriteInstance;
    private readonly _parentConsumer: ContextConsumer<typeof parentNodeContext, SpriteInstanceElement>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    private _currentParent: ISceneNode | null = null;

    public constructor() {
        super();
        this.name = DEFAULT_SPRITE_INSTANCE_NAME;
        this.position = DEFAULT_SPRITE_INSTANCE_POSITION;
        this.rotation = DEFAULT_SPRITE_INSTANCE_ROTATION;
        this.scale = DEFAULT_SPRITE_INSTANCE_SCALE;
        // eslint-disable-next-line wc/no-constructor-attributes
        this.hidden = DEFAULT_SPRITE_INSTANCE_HIDDEN;
        this.renderOrder = DEFAULT_SPRITE_INSTANCE_RENDER_ORDER;
        this.anchor = DEFAULT_SPRITE_INSTANCE_ANCHOR;
        this.size = DEFAULT_SPRITE_INSTANCE_SIZE;
        this.sizeMode = DEFAULT_SPRITE_INSTANCE_SIZE_MODE;
        this.sizeClamping = undefined;
        this.billboardMode = DEFAULT_SPRITE_INSTANCE_BILLBOARD_MODE;
        this.material = new SpritePinMaterial();

        this._spriteInstance = new SpriteInstance(
            {
                material: this.material,
                anchor: this.anchor,
                size: this.size,
                sizeMode: this.sizeMode,
                sizeClamping: this.sizeClamping,
                billboardMode: this.billboardMode,
                renderOrder: this.renderOrder,
            },
            this.name
        );

        this._spriteInstance.transform.setPosition(
            this.position.x,
            this.position.y,
            this.position.z
        );
        this._spriteInstance.transform.setRotationEuler(
            this.rotation.x,
            this.rotation.y,
            this.rotation.z
        );
        this._spriteInstance.transform.setScale(
            this.scale.x,
            this.scale.y,
            this.scale.z
        );
        this._spriteInstance.visible = true;

        this._parentConsumer = new ContextConsumer(this, {
            context: parentNodeContext,
            subscribe: true,
            callback: (parent) => this._handleParentNode(parent),
        });

        this._parentProvider = new ContextProvider(this, {
            context: parentNodeContext,
            initialValue: this._spriteInstance,
        });
    }

    /**
     * Renders into the Light DOM rather than creating a Shadow Root,
     * enabling transparent DOM queries and child scene element attachment.
     */
    public override createRenderRoot(): HTMLElement {
        return this;
    }

    /**
     * Public accessor exposing the underlying programmatic SpriteInstance.
     */
    public get spriteInstance(): SpriteInstance {
        return this._spriteInstance;
    }

    /**
     * Public accessor exposing the underlying programmatic SpriteInstance as an ISceneNode.
     */
    public get node(): SpriteInstance {
        return this._spriteInstance;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._parentProvider.setValue(this._spriteInstance);
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this._currentParent) {
            this._currentParent.removeChild(this._spriteInstance);
            this._currentParent = null;
        }
    }

    protected override willUpdate(changedProperties: PropertyValues<this>): void {
        super.willUpdate(changedProperties);

        if (changedProperties.has("name")) {
            this._spriteInstance.name = this.name;
        }

        if (changedProperties.has("position") && this.position) {
            this._spriteInstance.transform.setPosition(
                this.position.x,
                this.position.y,
                this.position.z
            );
        }

        if (changedProperties.has("rotation") && this.rotation) {
            this._spriteInstance.transform.setRotationEuler(
                this.rotation.x,
                this.rotation.y,
                this.rotation.z
            );
        }

        if (changedProperties.has("scale") && this.scale) {
            this._spriteInstance.transform.setScale(
                this.scale.x,
                this.scale.y,
                this.scale.z
            );
        }

        if (changedProperties.has("hidden")) {
            this._spriteInstance.visible = !this.hidden;
        }

        if (changedProperties.has("renderOrder")) {
            this._spriteInstance.renderOrder = this.renderOrder;
        }

        if (changedProperties.has("anchor") && this.anchor) {
            const anchor = this.anchor;
            if ("x" in anchor && "y" in anchor) {
                this._spriteInstance.setAnchor(anchor);
            } else if (Array.isArray(anchor)) {
                const tuple = anchor as Vector2Tuple;
                this._spriteInstance.setAnchor(tuple[TUPLE_INDEX_X], tuple[TUPLE_INDEX_Y]);
            }
        }

        if (changedProperties.has("size") && this.size) {
            const size = this.size;
            if ("x" in size && "y" in size) {
                this._spriteInstance.setSize(size);
            } else if (Array.isArray(size)) {
                const tuple = size as Vector2Tuple;
                this._spriteInstance.setSize(tuple[TUPLE_INDEX_X], tuple[TUPLE_INDEX_Y]);
            }
        }

        if (changedProperties.has("sizeMode")) {
            this._spriteInstance.sizeMode = this.sizeMode;
        }

        if (changedProperties.has("sizeClamping")) {
            this._spriteInstance.sizeClamping = this.sizeClamping;
        }

        if (changedProperties.has("billboardMode")) {
            this._spriteInstance.billboardMode = this.billboardMode;
        }

        if (changedProperties.has("material") && this.material) {
            this._spriteInstance.material = this.material;
        }
    }

    private _handleParentNode(parent: ISceneNode | undefined): void {
        if (this._currentParent === parent) {
            return;
        }

        if (this._currentParent) {
            this._currentParent.removeChild(this._spriteInstance);
            this._currentParent = null;
        }

        if (parent) {
            parent.addChild(this._spriteInstance);
            this._currentParent = parent;
        }
    }
}

let isSpriteInstanceElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-sprite-instance> with customElements.
 */
export function setupSpriteInstanceElement(): void {
    if (
        isSpriteInstanceElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_SPRITE_INSTANCE))
    ) {
        return;
    }

    customElements.define(TAG_RJ_SPRITE_INSTANCE, SpriteInstanceElement);
    isSpriteInstanceElementRegistered = true;
}
