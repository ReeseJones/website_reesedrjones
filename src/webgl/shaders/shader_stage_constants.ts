/**
 * Explicit numeric constants for WebGL shader stage types.
 * Mapped to native WebGL2 specification constant values.
 */
export const ShaderStageType = {
    Vertex: 0x8b31, // WebGL2RenderingContext.VERTEX_SHADER
    Fragment: 0x8b30, // WebGL2RenderingContext.FRAGMENT_SHADER
} as const;

export type ShaderStageType = (typeof ShaderStageType)[keyof typeof ShaderStageType];
export type VertexStageType = typeof ShaderStageType.Vertex;
export type FragmentStageType = typeof ShaderStageType.Fragment;
