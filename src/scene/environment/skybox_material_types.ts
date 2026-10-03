import type { ICubeTexture } from "../../webgl/textures/cube_texture_types";
import type { IPipelineState } from "../materials/material_types";

/**
 * Options for configuring a SkyboxMaterial.
 */
export interface SkyboxMaterialOptions {
    /** Cubemap texture resource assigned to TextureUnit.Environment (unit 11) */
    cubeTexture?: ICubeTexture;
    /** Exposure brightness multiplier (defaults to 1.0) */
    exposure?: number;
    /** RGB color tint multiplier (defaults to [1.0, 1.0, 1.0]) */
    tint?: [number, number, number];
    /** Y-axis azimuth orientation rotation in radians (defaults to 0.0) */
    rotationY?: number;
    /** Pipeline state overrides (depthWrite defaults to false, cullFace to false) */
    pipelineState?: Partial<IPipelineState>;
    /** Additional custom uniforms */
    uniforms?: Record<string, unknown>;
}
