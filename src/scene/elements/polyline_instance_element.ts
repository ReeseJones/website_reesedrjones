import { LitElement, type PropertyValues } from "lit";
import { ContextConsumer, ContextProvider } from "@lit/context";
import { PolylineInstance } from "../lines/polyline_instance";
import { PolylineMaterial } from "../lines/polyline_material";
import type { IPolylineMaterial } from "../lines/polyline_material_types";
import {
    PolylineJoinStyle,
    PolylineCapStyle,
} from "../lines/polyline_instance_types";
import { vector3Converter } from "../../lit/converters/vector3_converter";
import { rgbaColorConverter } from "../../lit/converters/rgba_color_converter";
import { createEnumConverter } from "../../lit/converters/enum_converter";
import type { Vector3Like } from "../../maths/vector_types";
import type { RgbaLike } from "../../helpers/colors_types";
import type { ISceneNode } from "../core/scene_node_types";
import { parentNodeContext } from "./scene_element_types";
import {
    TAG_RJ_POLYLINE,
    DEFAULT_POLYLINE_NAME,
    DEFAULT_POLYLINE_HIDDEN,
    DEFAULT_POLYLINE_ELEMENT_RENDER_ORDER,
    DEFAULT_POLYLINE_ELEMENT_POSITION,
    DEFAULT_POLYLINE_ELEMENT_ROTATION,
    DEFAULT_POLYLINE_ELEMENT_SCALE,
    DEFAULT_POLYLINE_ELEMENT_POINTS,
    DEFAULT_POLYLINE_ELEMENT_WIDTH,
    DEFAULT_POLYLINE_ELEMENT_MITER_LIMIT,
    DEFAULT_POLYLINE_ELEMENT_COLOR,
    DEFAULT_POLYLINE_ELEMENT_GLOW_COLOR,
    DEFAULT_POLYLINE_ELEMENT_GLOW_INTENSITY,
    DEFAULT_POLYLINE_ELEMENT_DASH_SPEED,
    DEFAULT_POLYLINE_ELEMENT_DASH_FREQUENCY,
} from "./polyline_instance_element_constants";

export const polylineJoinStyleConverter = createEnumConverter(
    PolylineJoinStyle,
    PolylineJoinStyle.Miter
);

export const polylineCapStyleConverter = createEnumConverter(
    PolylineCapStyle,
    PolylineCapStyle.Round
);

/**
 * ComplexAttributeConverter translating between serialized coordinate strings
 * (JSON arrays or space/comma-separated triplets) and Vector3Like[] path sequences.
 */
export const polylinePointsConverter = {
    fromAttribute(value: string | null): Vector3Like[] {
        if (!value) return [];
        const trimmed = value.trim();
        if (trimmed.startsWith("[")) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map((item) => {
                        if (Array.isArray(item)) {
                            return {
                                x: Number(item[0]) || 0,
                                y: Number(item[1]) || 0,
                                z: Number(item[2]) || 0,
                            };
                        }
                        if (typeof item === "object" && item !== null) {
                            return {
                                x: Number(item.x) || 0,
                                y: Number(item.y) || 0,
                                z: Number(item.z) || 0,
                            };
                        }
                        return { x: 0, y: 0, z: 0 };
                    });
                }
            } catch {
                // fall through to text parsing
            }
        }
        const points: Vector3Like[] = [];
        const segments = trimmed.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
        for (const seg of segments) {
            const parts = seg.split(/\s+/).map(Number);
            if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                points.push({ x: parts[0], y: parts[1], z: parts[2] });
            }
        }
        return points;
    },
    toAttribute(value: readonly Vector3Like[] | Float32Array | null): string {
        if (!value) return "";
        if (value instanceof Float32Array) {
            const arr: string[] = [];
            for (let i = 0; i < value.length; i += 3) {
                arr.push(`${value[i]} ${value[i + 1]} ${value[i + 2]}`);
            }
            return arr.join(", ");
        }
        return value.map((p) => `${p.x} ${p.y} ${p.z}`).join(", ");
    },
};

/**
 * Declarative 3D Polyline Route Web Component (<rj-polyline>)
 * synchronizing path waypoints, line width, glow colors, miter joins, pulse animations,
 * transform hierarchy, and render priority with an underlying programmatic PolylineInstance,
 * wiring itself to parent and child nodes via @lit/context.
 */
export class PolylineInstanceElement extends LitElement {
    public static override properties = {
        name: { type: String, reflect: true },
        position: { converter: vector3Converter, reflect: true },
        rotation: { converter: vector3Converter, reflect: true },
        scale: { converter: vector3Converter, reflect: true },
        hidden: { type: Boolean, reflect: true },
        renderOrder: { type: Number, attribute: "render-order" },
        points: { converter: polylinePointsConverter },
        lineWidth: { type: Number, attribute: "line-width" },
        miterLimit: { type: Number, attribute: "miter-limit" },
        color: { converter: rgbaColorConverter },
        glowColor: { converter: rgbaColorConverter, attribute: "glow-color" },
        glowIntensity: { type: Number, attribute: "glow-intensity" },
        dashSpeed: { type: Number, attribute: "dash-speed" },
        dashFrequency: { type: Number, attribute: "dash-frequency" },
        joinStyle: { converter: polylineJoinStyleConverter, attribute: "join-style" },
        capStyle: { converter: polylineCapStyleConverter, attribute: "cap-style" },
        material: { attribute: false },
    };

    public declare name: string;
    public declare position: Vector3Like;
    public declare rotation: Vector3Like;
    public declare scale: Vector3Like;
    public declare hidden: boolean;
    public declare renderOrder: number;
    public declare points: readonly Vector3Like[] | Float32Array;
    public declare lineWidth: number;
    public declare miterLimit: number;
    public declare color: RgbaLike;
    public declare glowColor: RgbaLike;
    public declare glowIntensity: number;
    public declare dashSpeed: number;
    public declare dashFrequency: number;
    public declare joinStyle: PolylineJoinStyle;
    public declare capStyle: PolylineCapStyle;
    public declare material: IPolylineMaterial;

    private readonly _polylineInstance: PolylineInstance;
    private readonly _parentConsumer: ContextConsumer<typeof parentNodeContext, PolylineInstanceElement>;
    private readonly _parentProvider: ContextProvider<typeof parentNodeContext>;

    private _currentParent: ISceneNode | null = null;

    public constructor() {
        super();
        this.name = DEFAULT_POLYLINE_NAME;
        this.position = DEFAULT_POLYLINE_ELEMENT_POSITION;
        this.rotation = DEFAULT_POLYLINE_ELEMENT_ROTATION;
        this.scale = DEFAULT_POLYLINE_ELEMENT_SCALE;
        // eslint-disable-next-line wc/no-constructor-attributes
        this.hidden = DEFAULT_POLYLINE_HIDDEN;
        this.renderOrder = DEFAULT_POLYLINE_ELEMENT_RENDER_ORDER;
        this.points = DEFAULT_POLYLINE_ELEMENT_POINTS;
        this.lineWidth = DEFAULT_POLYLINE_ELEMENT_WIDTH;
        this.miterLimit = DEFAULT_POLYLINE_ELEMENT_MITER_LIMIT;
        this.color = DEFAULT_POLYLINE_ELEMENT_COLOR;
        this.glowColor = DEFAULT_POLYLINE_ELEMENT_GLOW_COLOR;
        this.glowIntensity = DEFAULT_POLYLINE_ELEMENT_GLOW_INTENSITY;
        this.dashSpeed = DEFAULT_POLYLINE_ELEMENT_DASH_SPEED;
        this.dashFrequency = DEFAULT_POLYLINE_ELEMENT_DASH_FREQUENCY;
        this.joinStyle = PolylineJoinStyle.Miter;
        this.capStyle = PolylineCapStyle.Round;
        this.material = new PolylineMaterial({
            lineWidth: this.lineWidth,
            miterLimit: this.miterLimit,
            color: this.color,
            glowColor: this.glowColor,
            glowIntensity: this.glowIntensity,
            dashSpeed: this.dashSpeed,
            dashFrequency: this.dashFrequency,
        });

        this._polylineInstance = new PolylineInstance(
            {
                points: this.points,
                material: this.material,
                width: this.lineWidth,
                miterLimit: this.miterLimit,
                color: this.color,
                glowColor: this.glowColor,
                glowIntensity: this.glowIntensity,
                dashSpeed: this.dashSpeed,
                dashFrequency: this.dashFrequency,
                joinStyle: this.joinStyle,
                capStyle: this.capStyle,
                renderOrder: this.renderOrder,
            },
            this.name
        );

        this._polylineInstance.transform.setPosition(
            this.position.x,
            this.position.y,
            this.position.z
        );
        this._polylineInstance.transform.setRotationEuler(
            this.rotation.x,
            this.rotation.y,
            this.rotation.z
        );
        this._polylineInstance.transform.setScale(
            this.scale.x,
            this.scale.y,
            this.scale.z
        );
        this._polylineInstance.visible = true;

        this._parentConsumer = new ContextConsumer(this, {
            context: parentNodeContext,
            subscribe: true,
            callback: (parent) => this._handleParentNode(parent),
        });

        this._parentProvider = new ContextProvider(this, {
            context: parentNodeContext,
            initialValue: this._polylineInstance,
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
     * Public accessor exposing the underlying programmatic PolylineInstance.
     */
    public get polylineInstance(): PolylineInstance {
        return this._polylineInstance;
    }

    /**
     * Public accessor exposing the underlying programmatic PolylineInstance as an ISceneNode.
     */
    public get node(): PolylineInstance {
        return this._polylineInstance;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        this._parentProvider.setValue(this._polylineInstance);
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this._currentParent) {
            this._currentParent.removeChild(this._polylineInstance);
            this._currentParent = null;
        }
    }

    protected override willUpdate(changedProperties: PropertyValues<this>): void {
        super.willUpdate(changedProperties);

        if (changedProperties.has("name")) {
            this._polylineInstance.name = this.name;
        }

        if (changedProperties.has("position") && this.position) {
            this._polylineInstance.transform.setPosition(
                this.position.x,
                this.position.y,
                this.position.z
            );
        }

        if (changedProperties.has("rotation") && this.rotation) {
            this._polylineInstance.transform.setRotationEuler(
                this.rotation.x,
                this.rotation.y,
                this.rotation.z
            );
        }

        if (changedProperties.has("scale") && this.scale) {
            this._polylineInstance.transform.setScale(
                this.scale.x,
                this.scale.y,
                this.scale.z
            );
        }

        if (changedProperties.has("hidden")) {
            this._polylineInstance.visible = !this.hidden;
        }

        if (changedProperties.has("renderOrder")) {
            this._polylineInstance.renderOrder = this.renderOrder;
        }

        if (changedProperties.has("material") && this.material) {
            this._polylineInstance.material = this.material;
        }

        if (changedProperties.has("points") && this.points) {
            this._polylineInstance.setPoints(this.points);
        }

        if (changedProperties.has("lineWidth")) {
            this._polylineInstance.width = this.lineWidth;
        }

        if (changedProperties.has("miterLimit")) {
            this._polylineInstance.miterLimit = this.miterLimit;
        }

        if (changedProperties.has("color") && this.color) {
            this._polylineInstance.setColor(this.color);
        }

        if (changedProperties.has("glowColor") && this.glowColor) {
            this._polylineInstance.setGlowColor(this.glowColor);
        }

        if (changedProperties.has("glowIntensity")) {
            this._polylineInstance.glowIntensity = this.glowIntensity;
        }

        if (changedProperties.has("dashSpeed")) {
            this._polylineInstance.dashSpeed = this.dashSpeed;
        }

        if (changedProperties.has("dashFrequency")) {
            this._polylineInstance.dashFrequency = this.dashFrequency;
        }

        if (changedProperties.has("joinStyle")) {
            this._polylineInstance.joinStyle = this.joinStyle;
        }

        if (changedProperties.has("capStyle")) {
            this._polylineInstance.capStyle = this.capStyle;
        }
    }

    private _handleParentNode(newParent: ISceneNode | undefined): void {
        const targetParent = newParent ?? null;

        if (this._currentParent === targetParent) {
            return;
        }

        if (this._currentParent) {
            this._currentParent.removeChild(this._polylineInstance);
            this._currentParent = null;
        }

        if (targetParent) {
            targetParent.addChild(this._polylineInstance);
            this._currentParent = targetParent;
        }
    }
}

/**
 * Registers the <rj-polyline> custom element if not already registered.
 * Completely idempotent and side-effect free on module import.
 */
export function setupPolylineElement(): void {
    if (!customElements.get(TAG_RJ_POLYLINE)) {
        customElements.define(TAG_RJ_POLYLINE, PolylineInstanceElement);
    }
}
