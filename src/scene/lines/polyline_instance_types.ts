import type { IRenderable } from "../core/renderable_types";
import type { Vector3Like } from "../../maths/vector_types";
import type { RgbaLike } from "../../helpers/colors_types";
import type { IPolylineGeometry } from "./polyline_geometry_types";
import type { IPolylineMaterial } from "./polyline_material_types";

/**
 * Corner join style for adjacent line segments.
 */
export enum PolylineJoinStyle {
    Miter = 0,
    Bevel = 1,
    Round = 2,
}

/**
 * Line end cap style for route termination.
 */
export enum PolylineCapStyle {
    Butt = 0,
    Square = 1,
    Round = 2,
}

/**
 * Construction options for initializing a PolylineInstance scene node.
 */
export interface PolylineRouteOptions {
    /** 3D path coordinates defining the navigational route */
    points?: readonly Vector3Like[] | Float32Array;

    /** Stroke thickness in screen pixels */
    width?: number;

    /** Maximum miter join spike limit ratio */
    miterLimit?: number;

    /** Outer halo / glow line color */
    color?: RgbaLike;

    /** Core energy beam color */
    glowColor?: RgbaLike;

    /** Core exponential falloff and pulse luminosity scalar */
    glowIntensity?: number;

    /** Speed of directional wave pulses along the route */
    dashSpeed?: number;

    /** Frequency of directional wave pulses along the route */
    dashFrequency?: number;

    /** Corner joint style */
    joinStyle?: PolylineJoinStyle;

    /** Terminal cap style */
    capStyle?: PolylineCapStyle;

    /** Custom render order override in transparent render queue */
    renderOrder?: number;

    /** Optional custom material instance */
    material?: IPolylineMaterial;
}

/**
 * Contract for renderable polyline route scene nodes.
 */
export interface IPolylineInstance extends IRenderable {
    /** Associated extruded ribbon geometry */
    readonly geometry: IPolylineGeometry;

    /** Active polyline ribbon material */
    material: IPolylineMaterial;

    /** Stroke width in screen pixels */
    width: number;

    /** Maximum miter limit ratio */
    miterLimit: number;

    /** Core glow intensity scalar */
    glowIntensity: number;

    /** Speed of directional pulse waves */
    dashSpeed: number;

    /** Spatial frequency of directional pulse waves */
    dashFrequency: number;

    /** Corner joint style */
    joinStyle: PolylineJoinStyle;

    /** Route termination cap style */
    capStyle: PolylineCapStyle;

    /**
     * Updates 3D route coordinates.
     */
    setPoints(points: readonly Vector3Like[] | Float32Array): this;

    /**
     * Retrieves current 3D route coordinates as semantic Vector3Like objects.
     */
    getPoints(): readonly Vector3Like[];

    /**
     * Retrieves outer halo line color.
     */
    getColor(out?: RgbaLike): RgbaLike;

    /**
     * Updates outer halo line color.
     */
    setColor(color: RgbaLike): this;
    setColor(r: number, g: number, b: number, a?: number): this;

    /**
     * Retrieves core energy beam color.
     */
    getGlowColor(out?: RgbaLike): RgbaLike;

    /**
     * Updates core energy beam color.
     */
    setGlowColor(color: RgbaLike): this;
    setGlowColor(r: number, g: number, b: number, a?: number): this;
}
