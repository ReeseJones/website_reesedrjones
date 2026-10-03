/**
 * WebGL texture magnification and minification filter presets.
 */
export type TextureFilter =
    | "nearest"
    | "linear"
    | "nearest_mipmap_nearest"
    | "linear_mipmap_nearest"
    | "nearest_mipmap_linear"
    | "linear_mipmap_linear";

/**
 * WebGL texture wrapping modes for S and T coordinates.
 */
export type TextureWrap = "clamp_to_edge" | "repeat" | "mirrored_repeat";

/**
 * Pixel data formats supported for texture allocation.
 */
export type TextureFormat = "rgba" | "rgb" | "alpha" | "luminance";

/**
 * Supported image source types for texture loading.
 */
export type TextureSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap | ImageData;

/**
 * Conventional hardware texture unit semantic slots.
 * Maps standard material texture roles to fixed WebGL texture unit indices (0 to 15).
 * While WebGL shaders and materials can bind any arbitrary texture to any unit,
 * these standard slots establish convention across standard shaders, materials, and automated bindings.
 */
export enum TextureUnit {
    /** Primary base color / diffuse / albedo map (u_texture, u_colorMap0, u_diffuseMap) */
    Color0 = 0,
    /** Backwards-compatible alias for primary color (Color0) */
    Color = 0,
    /** Secondary layered diffuse / color blend map (u_colorMap1, u_texture1) */
    Color1 = 1,
    /** Tertiary layered diffuse / color blend map (u_colorMap2, u_texture2) */
    Color2 = 2,
    /** Quaternary layered diffuse / color blend map (u_colorMap3, u_texture3) */
    Color3 = 3,

    /** Tangent-space normal map (u_normalMap) */
    Normal = 4,
    /** Surface roughness / specular map (u_roughnessMap) */
    Roughness = 5,
    /** Surface metalness / conductivity map (u_metallicMap, u_metalnessMap) */
    Metallic = 6,
    /** Emissive / self-illumination glow map (u_emissiveMap) */
    Emissive = 7,
    /** Ambient occlusion / cavity shadow map (u_aoMap, u_occlusionMap) */
    Occlusion = 8,

    /** Displacement / parallax / bump height map (u_heightMap, u_bumpMap) */
    Height = 9,
    /** Alpha cutoff / multi-layer splat / blend mask (u_maskMap, u_splatMap, u_blendMask) */
    Mask = 10,
    /** Image-based lighting / sky reflection cubemap (u_envMap, u_irradianceMap) */
    Environment = 11,

    /** Directional / spot light shadow depth map (u_shadowMap) */
    ShadowMap = 12,
    /** Glass / water / subsurface transmission and refraction map (u_transmissionMap, u_thicknessMap) */
    Transmission = 13,
    /** Split-sum BRDF lookup table or color grading LUT (u_brdfLut, u_lutMap) */
    Lut = 14,
    /** Procedural noise, flow vectors, or distortion map for VFX (u_noiseMap, u_flowMap, u_distortionMap) */
    Noise = 15,
}

/**
 * Standard registry mapping conventional GLSL sampler uniform names to their default TextureUnit slots.
 * Used by build-time verification and automated runtime shader reflection.
 */
export const DEFAULT_TEXTURE_UNIT_MAP: Readonly<Record<string, TextureUnit>> = {
    // Diffuse / Color 0
    u_texture: TextureUnit.Color0,
    u_diffuseMap: TextureUnit.Color0,
    u_colorMap: TextureUnit.Color0,
    u_colorMap0: TextureUnit.Color0,
    u_texture0: TextureUnit.Color0,

    // Diffuse / Color 1
    u_colorMap1: TextureUnit.Color1,
    u_texture1: TextureUnit.Color1,
    u_diffuseMap1: TextureUnit.Color1,

    // Diffuse / Color 2
    u_colorMap2: TextureUnit.Color2,
    u_texture2: TextureUnit.Color2,
    u_diffuseMap2: TextureUnit.Color2,

    // Diffuse / Color 3
    u_colorMap3: TextureUnit.Color3,
    u_texture3: TextureUnit.Color3,
    u_diffuseMap3: TextureUnit.Color3,

    // PBR Channels
    u_normalMap: TextureUnit.Normal,
    u_roughnessMap: TextureUnit.Roughness,
    u_metallicMap: TextureUnit.Metallic,
    u_metalnessMap: TextureUnit.Metallic,
    u_emissiveMap: TextureUnit.Emissive,
    u_aoMap: TextureUnit.Occlusion,
    u_occlusionMap: TextureUnit.Occlusion,

    // Surface & Details
    u_heightMap: TextureUnit.Height,
    u_bumpMap: TextureUnit.Height,
    u_maskMap: TextureUnit.Mask,
    u_splatMap: TextureUnit.Mask,
    u_blendMask: TextureUnit.Mask,

    // Environment & Advanced
    u_envMap: TextureUnit.Environment,
    u_irradianceMap: TextureUnit.Environment,
    u_shadowMap: TextureUnit.ShadowMap,
    u_transmissionMap: TextureUnit.Transmission,
    u_thicknessMap: TextureUnit.Transmission,
    u_brdfLut: TextureUnit.Lut,
    u_lutMap: TextureUnit.Lut,
    u_noiseMap: TextureUnit.Noise,
    u_flowMap: TextureUnit.Noise,
    u_distortionMap: TextureUnit.Noise,
};

/**
 * Configuration options for constructing or updating a Texture.
 */
export interface TextureOptions {
    /** Image source element, bitmap, canvas, or URL string */
    source?: TextureSource | string;
    /** Horizontal wrap mode (defaults to "clamp_to_edge") */
    wrapS?: TextureWrap;
    /** Vertical wrap mode (defaults to "clamp_to_edge") */
    wrapT?: TextureWrap;
    /** Minification filter (defaults to "linear_mipmap_linear") */
    minFilter?: TextureFilter;
    /** Magnification filter (defaults to "linear") */
    magFilter?: TextureFilter;
    /** Whether to flip the Y axis to match WebGL UV coordinates (defaults to true) */
    flipY?: boolean;
    /** Whether to generate mipmaps when dimensions allow (defaults to true) */
    generateMipmaps?: boolean;
    /** Human-readable label for debugging and context logging */
    label?: string;
}

import type { IDisposable } from "../core/subsystem_types";

/**
 * Public contract for managed WebGL texture resources.
 */
export interface ITexture extends IDisposable {
    /** Unique debug label */
    readonly label: string;

    /** Underlying WebGLTexture GPU handle (null if context lost or unallocated) */
    readonly handle: WebGLTexture | null;

    /** Width in pixels (1 before image decode completes) */
    readonly width: number;

    /** Height in pixels (1 before image decode completes) */
    readonly height: number;

    /** Whether the full source asset has finished loading and uploading */
    readonly isLoaded: boolean;

    /** Active configuration options */
    readonly options: Readonly<TextureOptions>;

    /** Allocates the GPU texture handle with initial fallback and uploads source */
    init(gl: WebGL2RenderingContext): void;

    /** Re-uploads pixel data from the stored image or canvas source */
    updateFromSource(): void;

    /** Binds texture to a specific hardware texture unit via context manager */
    bind(unit?: TextureUnit | number): void;

    /** Releases GPU texture memory */
    destroy(): void;

    /** WebGL context lost lifecycle hook */
    onContextLost(): void;

    /** WebGL context restored lifecycle hook */
    onContextRestored(gl: WebGL2RenderingContext): void;
}
