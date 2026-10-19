import type { GalaxyParameters } from "../../galaxy_backdrop/parameters/types";
import type { MaterialOptions } from "./material_types";
import type { GenerativeShaderKey } from "../../webgl/shaders/shader_types";

/**
 * Dynamic per-frame uniforms required for celestial horizon view-ray reconstruction.
 */
export interface GalacticCloudFrameUniforms {
    /** Viewport aspect ratio (width / height) */
    aspect: number;
    /** Tangent of half vertical FOV (Math.tan(fovRad * 0.5)) */
    fovScale: number;
    /** 3x3 orientation matrix transforming view ray from camera space to world space */
    cameraRotation: Float32Array | number[];
}

/**
 * Construction options for GalacticCloudMaterial.
 */
export interface GalacticCloudMaterialOptions extends Partial<MaterialOptions> {
    /** Generative shader program key ("galactic_cloud"). Defaults to "galactic_cloud". */
    shaderKey?: GenerativeShaderKey;
    /** Galaxy simulation parameters determining horizon gradient uniforms */
    params?: Partial<GalaxyParameters>;
}
