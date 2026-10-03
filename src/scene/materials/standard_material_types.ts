import type { MaterialOptions } from "./material_types";

/**
 * Options for configuring a StandardMaterial.
 */
export interface StandardMaterialOptions extends Partial<MaterialOptions> {
    /** Base color multiplier [r, g, b] or [r, g, b, a] */
    color?: [number, number, number] | [number, number, number, number];
    /** Surface roughness (0.0 = mirror, 1.0 = diffuse) */
    roughness?: number;
    /** Metallic reflection factor (0.0 = dielectric, 1.0 = metallic) */
    metallic?: number;
}
