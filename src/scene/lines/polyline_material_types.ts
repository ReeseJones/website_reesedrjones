import type { IMaterial, MaterialOptions } from "../materials/material_types";
import type { RgbaLike } from "../../helpers/colors_types";

/**
 * Public interface for screen-space polyline ribbon shader appearance and uniforms.
 */
export interface IPolylineMaterial extends IMaterial {
    /** Stroke width in display pixels */
    lineWidth: number;

    /** Maximum miter join spike ratio before clamping */
    miterLimit: number;

    /** Exponential glow core and pulse multiplier */
    glowIntensity: number;

    /** Rate of traveling pulse waves along the route */
    dashSpeed: number;

    /** Spatial frequency / density of traveling pulse waves along the route */
    dashFrequency: number;

    /**
     * Retrieves the outer halo line color.
     */
    getColor(out?: RgbaLike): RgbaLike;

    /**
     * Sets the outer halo line color.
     */
    setColor(color: RgbaLike): this;
    setColor(r: number, g: number, b: number, a?: number): this;

    /**
     * Retrieves the central energy beam core color.
     */
    getGlowColor(out?: RgbaLike): RgbaLike;

    /**
     * Sets the central energy beam core color.
     */
    setGlowColor(color: RgbaLike): this;
    setGlowColor(r: number, g: number, b: number, a?: number): this;
}

/**
 * Configuration options for initializing a PolylineMaterial instance.
 */
export interface PolylineMaterialOptions extends Omit<MaterialOptions, "shaderKey"> {
    lineWidth?: number;
    miterLimit?: number;
    color?: RgbaLike;
    glowColor?: RgbaLike;
    glowIntensity?: number;
    dashSpeed?: number;
    dashFrequency?: number;
}
