import { SceneNode } from "../core/scene_node";
import type { RenderContext } from "../core/renderable_types";
import type { Vector3Like } from "../../maths/vector_types";
import type { RgbaLike } from "../../helpers/colors_types";
import { applyMaterial } from "../materials/material_binder";
import { PolylineGeometry } from "./polyline_geometry";
import { PolylineMaterial } from "./polyline_material";
import type { IPolylineGeometry } from "./polyline_geometry_types";
import type { IPolylineMaterial } from "./polyline_material_types";
import {
    PolylineJoinStyle,
    PolylineCapStyle,
    type IPolylineInstance,
    type PolylineRouteOptions,
} from "./polyline_instance_types";
import {
    DEFAULT_POLYLINE_RENDER_ORDER,
    MIN_POLYLINE_POINTS,
} from "./polyline_constants";

/**
 * Concrete scene graph entity representing a screen-space extruded polyline route.
 * Draws a continuous styled path across 3D waypoints with constant pixel thickness,
 * corner miter joints, anti-aliased edge feathering, and traveling wave pulses.
 */
export class PolylineInstance extends SceneNode implements IPolylineInstance {
    public override readonly isRenderable: true = true;
    public renderOrder: number;

    public readonly geometry: IPolylineGeometry;
    public material: IPolylineMaterial;
    public joinStyle: PolylineJoinStyle = PolylineJoinStyle.Miter;
    public capStyle: PolylineCapStyle = PolylineCapStyle.Round;

    constructor(
        options?: PolylineRouteOptions,
        name: string = "PolylineInstance",
        id?: string
    ) {
        super(name, id);

        this.geometry = new PolylineGeometry({ points: options?.points });
        this.material =
            options?.material ??
            new PolylineMaterial({
                lineWidth: options?.width,
                miterLimit: options?.miterLimit,
                color: options?.color,
                glowColor: options?.glowColor,
                glowIntensity: options?.glowIntensity,
                dashSpeed: options?.dashSpeed,
                dashFrequency: options?.dashFrequency,
            });

        if (options?.joinStyle !== undefined) {
            this.joinStyle = options.joinStyle;
        }

        if (options?.capStyle !== undefined) {
            this.capStyle = options.capStyle;
        }

        this.renderOrder = options?.renderOrder ?? DEFAULT_POLYLINE_RENDER_ORDER;
    }

    public get width(): number {
        return this.material.lineWidth;
    }

    public set width(value: number) {
        this.material.lineWidth = value;
    }

    public get miterLimit(): number {
        return this.material.miterLimit;
    }

    public set miterLimit(value: number) {
        this.material.miterLimit = value;
    }

    public get glowIntensity(): number {
        return this.material.glowIntensity;
    }

    public set glowIntensity(value: number) {
        this.material.glowIntensity = value;
    }

    public get dashSpeed(): number {
        return this.material.dashSpeed;
    }

    public set dashSpeed(value: number) {
        this.material.dashSpeed = value;
    }

    public get dashFrequency(): number {
        return this.material.dashFrequency;
    }

    public set dashFrequency(value: number) {
        this.material.dashFrequency = value;
    }

    /**
     * Updates 3D route coordinates, rebuilding underlying GPU vertex and index buffers.
     */
    public setPoints(points: readonly Vector3Like[] | Float32Array): this {
        this.geometry.setPoints(points);
        return this;
    }

    /**
     * Retrieves current 3D route coordinates as semantic Vector3Like objects.
     */
    public getPoints(): readonly Vector3Like[] {
        return this.geometry.getPoints();
    }

    /**
     * Retrieves outer halo line color.
     */
    public getColor(out?: RgbaLike): RgbaLike {
        return this.material.getColor(out);
    }

    /**
     * Sets outer halo line color.
     */
    public setColor(color: RgbaLike): this;
    public setColor(r: number, g: number, b: number, a?: number): this;
    public setColor(rOrColor: number | RgbaLike, g?: number, b?: number, a?: number): this {
        if (typeof rOrColor === "number") {
            this.material.setColor(rOrColor, g ?? rOrColor, b ?? rOrColor, a);
        } else {
            this.material.setColor(rOrColor);
        }
        return this;
    }

    /**
     * Retrieves central energy beam core color.
     */
    public getGlowColor(out?: RgbaLike): RgbaLike {
        return this.material.getGlowColor(out);
    }

    /**
     * Sets central energy beam core color.
     */
    public setGlowColor(color: RgbaLike): this;
    public setGlowColor(r: number, g: number, b: number, a?: number): this;
    public setGlowColor(rOrColor: number | RgbaLike, g?: number, b?: number, a?: number): this {
        if (typeof rOrColor === "number") {
            this.material.setGlowColor(rOrColor, g ?? rOrColor, b ?? rOrColor, a);
        } else {
            this.material.setGlowColor(rOrColor);
        }
        return this;
    }

    /**
     * Executes material pipeline configuration, uniform distribution, and ribbon draw.
     */
    public render(context: RenderContext): void {
        if (!this.visible || !this.computedVisible || this.geometry.pointsCount < MIN_POLYLINE_POINTS) {
            return;
        }

        const { contextManager, dimensions } = context;

        // 1. Assert rasterization pipeline state and activate material program
        const shader = applyMaterial(this.material, contextManager, context);

        // 2. Upload instance transform, screen dimensions, and animation uniforms
        shader.setMat4("u_modelMatrix", this.worldMatrix);
        shader.setVec2("u_viewportResolution", dimensions.width, dimensions.height);
        shader.setFloat("u_lineWidth", this.material.lineWidth);
        shader.setFloat("u_miterLimit", this.material.miterLimit);
        shader.setFloat("u_glowIntensity", this.material.glowIntensity);
        shader.setFloat("u_time", context.time);
        shader.setFloat("u_dashSpeed", this.material.dashSpeed);
        shader.setFloat("u_dashFrequency", this.material.dashFrequency);

        // 3. Issue indexed draw call for extruded polyline geometry
        contextManager.geometries.draw(this.geometry);
    }

    /**
     * Disposes geometry and releases node resources.
     */
    public override destroy(): void {
        this.geometry.dispose();
        super.destroy();
    }
}
