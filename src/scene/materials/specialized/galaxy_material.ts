import { Material } from "../material";
import { BlendMode } from "../material_types";
import {
    DEFAULT_ORB_PARAMETERS,
    DEFAULT_PINPRICK_PARAMETERS,
} from "../../../galaxy_backdrop/parameters/index";
import type { GalaxyParameters } from "../../../galaxy_backdrop/parameters/types";
import type { GalaxyShaderKey } from "../../../webgl/shaders/shader_types";
import type { GalaxyMaterialOptions } from "./galaxy_material_types";

/**
 * Specialized material for rendering the interactive spiral galaxy starfield.
 * Encapsulates pinprick and orb shader programs, additive blending pipeline state,
 * and pre-populates galaxy simulation domain uniforms.
 */
export class GalaxyMaterial extends Material {
    public readonly galaxyParams: GalaxyParameters;

    constructor(options?: GalaxyMaterialOptions) {
        const resolvedShaderKey: GalaxyShaderKey = options?.shaderKey ?? "galaxy_orb";
        const defaultParams = resolvedShaderKey === "galaxy_orb" ? DEFAULT_ORB_PARAMETERS : DEFAULT_PINPRICK_PARAMETERS;
        const resolvedParams: GalaxyParameters = {
            ...defaultParams,
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
            shaderKey: resolvedShaderKey,
            pipelineState: {
                blendMode: options?.pipelineState?.blendMode ?? BlendMode.Additive,
                depthTest: options?.pipelineState?.depthTest ?? false,
                depthWrite: options?.pipelineState?.depthWrite ?? false,
                cullFace: options?.pipelineState?.cullFace ?? false,
            },
            uniforms: initialUniforms,
        });

        this.galaxyParams = resolvedParams;
    }

    public override get shaderKey(): GalaxyShaderKey {
        return super.shaderKey as GalaxyShaderKey;
    }

    public override set shaderKey(key: GalaxyShaderKey) {
        super.shaderKey = key;
    }

    /**
     * Dynamically updates simulation uniforms when galaxy parameters change.
     */
    public updateParameters(params: Partial<GalaxyParameters>): void {

        const uniforms: Record<string, unknown> = {};
        if (params.rotationSpeed !== undefined) uniforms.u_rotationSpeed = params.rotationSpeed;
        if (params.differentialSpeed !== undefined) uniforms.u_differentialSpeed = params.differentialSpeed;
        if (params.driftSpeed !== undefined) uniforms.u_driftSpeed = params.driftSpeed;
        if (params.driftAmplitude !== undefined) uniforms.u_driftAmplitude = params.driftAmplitude;
        if (params.pointScale !== undefined) uniforms.u_pointScale = params.pointScale;
        if (params.minPointSize !== undefined) uniforms.u_minPointSize = params.minPointSize;
        if (params.maxPointSize !== undefined) uniforms.u_maxPointSize = params.maxPointSize;
        if (params.nearFadeDistance !== undefined) uniforms.u_nearFadeDistance = params.nearFadeDistance;
        if (params.coreColor !== undefined) uniforms.u_coreColor = params.coreColor;
        if (params.coreBlazeColor !== undefined) uniforms.u_coreBlazeColor = params.coreBlazeColor;
        if (params.armInnerColor !== undefined) uniforms.u_armInnerColor = params.armInnerColor;
        if (params.armOuterColor !== undefined) uniforms.u_armOuterColor = params.armOuterColor;
        if (params.accentColor !== undefined) uniforms.u_accentColor = params.accentColor;
        if (params.coreGlowBoost !== undefined) uniforms.u_coreGlowBoost = params.coreGlowBoost;

        this.setUniforms(uniforms);
        Object.assign(this.galaxyParams, params);
    }
}
