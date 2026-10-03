import { Material } from "../material";
import { DEFAULT_PINPRICK_PARAMETERS } from "../../../galaxy_backdrop/parameters/presets/pinprick";
import type { GalaxyParameters } from "../../../galaxy_backdrop/parameters/types";
import type { GalaxyMaterialOptions } from "./galaxy_material_types";

/**
 * Specialized material for rendering the interactive spiral galaxy starfield.
 * Encapsulates the pinprick shader program, additive blending pipeline state,
 * and pre-populates galaxy simulation domain uniforms.
 */
export class GalaxyMaterial extends Material {
    public readonly galaxyParams: GalaxyParameters;

    constructor(options?: GalaxyMaterialOptions) {
        const resolvedParams: GalaxyParameters = {
            ...DEFAULT_PINPRICK_PARAMETERS,
            ...options?.params,
        };

        const initialUniforms: Record<string, unknown> = {
            u_rotationSpeed: resolvedParams.rotationSpeed,
            u_differentialSpeed: resolvedParams.differentialSpeed,
            u_driftSpeed: resolvedParams.driftSpeed,
            u_driftAmplitude: resolvedParams.driftAmplitude,
            u_pointScale: resolvedParams.pointScale,
            u_minPointSize: resolvedParams.minPointSize,
            u_maxPointSize: resolvedParams.maxPointSize,
            u_nearFadeDistance: resolvedParams.nearFadeDistance,
            u_coreColor: resolvedParams.coreColor,
            u_coreBlazeColor: resolvedParams.coreBlazeColor,
            u_armInnerColor: resolvedParams.armInnerColor,
            u_armOuterColor: resolvedParams.armOuterColor,
            u_accentColor: resolvedParams.accentColor,
            u_coreGlowBoost: resolvedParams.coreGlowBoost,
            ...options?.uniforms,
        };

        super({
            shaderKey: options?.shaderKey ?? "galaxy_pinprick",
            pipelineState: {
                blendMode: options?.pipelineState?.blendMode ?? "additive",
                depthTest: options?.pipelineState?.depthTest ?? true,
                depthWrite: options?.pipelineState?.depthWrite ?? false,
                cullFace: options?.pipelineState?.cullFace ?? false,
            },
            uniforms: initialUniforms,
        });

        this.galaxyParams = resolvedParams;
    }
}
