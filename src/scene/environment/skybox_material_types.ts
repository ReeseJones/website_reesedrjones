import type { ICubeTexture } from "../../webgl/textures/cube_texture_types";
import type { PipelineState } from "../materials/material_types";
import type { SkyboxShaderKey } from "../../webgl/shaders/shader_types";

/**
 * Options for configuring a SkyboxMaterial.
 */
export interface SkyboxMaterialOptions {
    /** Shader program key. Defaults to "skybox". */
    shaderKey?: SkyboxShaderKey;
    /** Cubemap texture resource assigned to TextureUnit.Environment (unit 11) */
    cubeTexture?: ICubeTexture | null;
    /** Exposure brightness multiplier (defaults to 1.0) */
    exposure?: number;
    /** RGB color tint multiplier (defaults to [1.0, 1.0, 1.0]) */
    tint?: [number, number, number];
    /** Y-axis azimuth orientation rotation in radians (defaults to 0.0) */
    rotationY?: number;
    /** Pipeline state overrides (depthWrite defaults to false, cullFace to false) */
    pipelineState?: Partial<PipelineState>;
    /** Additional custom uniforms */
    uniforms?: Record<string, unknown>;
}
