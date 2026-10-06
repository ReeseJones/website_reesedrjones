import { Material } from "./material";
import { BlendMode } from "./material_types";
import type { GalaxyParameters } from "../../galaxy_backdrop/parameters/types";
import type { GenerativeShaderKey } from "../../webgl/shaders/shader_types";
import {
    DEFAULT_HORIZON_INTENSITY,
    DEFAULT_HORIZON_THICKNESS,
    DEFAULT_HORIZON_COLOR_CENTER,
    DEFAULT_HORIZON_COLOR_OUTER,
    DEFAULT_CLOUD_ASPECT,
    DEFAULT_CLOUD_FOV_SCALE,
    DEFAULT_CLOUD_PITCH,
    DEFAULT_CLOUD_YAW,
    DEFAULT_CLOUD_ROLL,
    DEFAULT_CLOUD_PITCH_OFFSET,
    DEFAULT_CLOUD_YAW_OFFSET,
} from "./galactic_cloud_material_constants";
import type {
    GalacticCloudFrameUniforms,
    GalacticCloudMaterialOptions,
} from "./galactic_cloud_material_types";

/**
 * Specialized material for the celestial horizon and galactic cloud background pass.
 * Configures the "galactic_cloud" procedural shader, alpha blending rasterization state,
 * and manages horizon color gradient and dynamic view-ray reconstruction uniforms.
 */
export class GalacticCloudMaterial extends Material {
    private readonly _params: Partial<GalaxyParameters>;

    constructor(options?: GalacticCloudMaterialOptions) {
        const resolvedShaderKey: GenerativeShaderKey = options?.shaderKey ?? "galactic_cloud";
        const params = options?.params ?? {};

        const centerColor = params.horizonColorCenter ?? DEFAULT_HORIZON_COLOR_CENTER;
        const outerColor = params.horizonColorOuter ?? DEFAULT_HORIZON_COLOR_OUTER;
        const intensity = params.horizonIntensity ?? DEFAULT_HORIZON_INTENSITY;
        const thickness = params.horizonThickness ?? DEFAULT_HORIZON_THICKNESS;

        const initialUniforms: Record<string, unknown> = {
            uHorizonIntensity: intensity,
            uHorizonThickness: thickness,
            uHorizonColorCenter: centerColor,
            uHorizonColorOuter: outerColor,
            uAspect: DEFAULT_CLOUD_ASPECT,
            uFovScale: DEFAULT_CLOUD_FOV_SCALE,
            uPitch: DEFAULT_CLOUD_PITCH,
            uYaw: DEFAULT_CLOUD_YAW,
            uRoll: DEFAULT_CLOUD_ROLL,
            uPitchOffset: DEFAULT_CLOUD_PITCH_OFFSET,
            uYawOffset: DEFAULT_CLOUD_YAW_OFFSET,
            ...options?.uniforms,
        };

        super({
            shaderKey: resolvedShaderKey,
            pipelineState: {
                blendMode: options?.pipelineState?.blendMode ?? BlendMode.Alpha,
                depthTest: options?.pipelineState?.depthTest ?? false,
                depthWrite: options?.pipelineState?.depthWrite ?? false,
                cullFace: options?.pipelineState?.cullFace ?? false,
            },
            uniforms: initialUniforms,
        });

        this._params = { ...params };
    }

    public override get shaderKey(): GenerativeShaderKey {
        return super.shaderKey as GenerativeShaderKey;
    }

    public override set shaderKey(key: GenerativeShaderKey) {
        super.shaderKey = key;
    }

    /**
     * Dynamically updates static horizon styling uniforms when galaxy parameters change.
     */
    public updateParameters(params: Partial<GalaxyParameters>): void {
        const uniforms: Record<string, unknown> = {};

        if (params.horizonIntensity !== undefined) {
            uniforms.uHorizonIntensity = params.horizonIntensity;
            this._params.horizonIntensity = params.horizonIntensity;
        }
        if (params.horizonThickness !== undefined) {
            uniforms.uHorizonThickness = params.horizonThickness;
            this._params.horizonThickness = params.horizonThickness;
        }
        if (params.horizonColorCenter !== undefined) {
            uniforms.uHorizonColorCenter = params.horizonColorCenter;
            this._params.horizonColorCenter = params.horizonColorCenter;
        }
        if (params.horizonColorOuter !== undefined) {
            uniforms.uHorizonColorOuter = params.horizonColorOuter;
            this._params.horizonColorOuter = params.horizonColorOuter;
        }

        if (Object.keys(uniforms).length > 0) {
            this.setUniforms(uniforms);
        }
    }

    /**
     * Uploads dynamic per-frame uniforms for orientation and view-ray reconstruction.
     */
    public updateFrameUniforms(uniforms: GalacticCloudFrameUniforms): void {
        this.setUniforms({
            uAspect: uniforms.aspect,
            uFovScale: uniforms.fovScale,
            uPitch: uniforms.pitch,
            uYaw: uniforms.yaw,
            uRoll: uniforms.roll,
            uPitchOffset: uniforms.effectivePitchOffset,
            uYawOffset: uniforms.effectiveYawOffset,
        });
    }

    /**
     * Duplicates this material preserving pipeline state, uniforms, and params.
     */
    public override clone(): GalacticCloudMaterial {
        const baseClone = super.clone();
        return new GalacticCloudMaterial({
            shaderKey: this.shaderKey,
            pipelineState: { ...this.pipelineState },
            uniforms: baseClone.getUniforms(),
            params: { ...this._params },
        });
    }

    /**
     * CPU disposal hook for deterministic resource release.
     */
    public dispose(): void {
        // Pure CPU material descriptor; no hardware handles to delete directly.
    }
}
