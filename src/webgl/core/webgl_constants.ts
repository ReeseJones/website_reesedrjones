import {
    GLBlendEquation,
    GLBlendFactor,
    GLBufferTarget,
    GLBufferUsage,
    GLCapability,
    GLClearMask,
    GLCubeFace,
    GLCullFace,
    GLDataType,
    GLDepthFunction,
    GLFrontFace,
    GLParameterLimit,
    GLPixelFormat,
    GLPrimitive,
    GLShaderParameter,
    GLShaderType,
    GLTextureFilter,
    GLTextureTarget,
    GLTextureWrap,
} from "./webgl_constants_types";

export * from "./webgl_constants_types";

/**
 * Consolidated WebGL2 constant dictionary for direct access.
 * Mirrors native WebGL2RenderingContext constants with zero global-scope dependency.
 */
export const GL = {
    // Buffers & Draw Modes
    ARRAY_BUFFER: GLBufferTarget.ArrayBuffer,
    ELEMENT_ARRAY_BUFFER: GLBufferTarget.ElementArrayBuffer,
    UNIFORM_BUFFER: GLBufferTarget.UniformBuffer,
    COPY_READ_BUFFER: GLBufferTarget.CopyReadBuffer,
    COPY_WRITE_BUFFER: GLBufferTarget.CopyWriteBuffer,
    PIXEL_PACK_BUFFER: GLBufferTarget.PixelPackBuffer,
    PIXEL_UNPACK_BUFFER: GLBufferTarget.PixelUnpackBuffer,
    TRANSFORM_FEEDBACK_BUFFER: GLBufferTarget.TransformFeedbackBuffer,

    STATIC_DRAW: GLBufferUsage.StaticDraw,
    DYNAMIC_DRAW: GLBufferUsage.DynamicDraw,
    STREAM_DRAW: GLBufferUsage.StreamDraw,
    STATIC_READ: GLBufferUsage.StaticRead,
    DYNAMIC_READ: GLBufferUsage.DynamicRead,
    STREAM_READ: GLBufferUsage.StreamRead,
    STATIC_COPY: GLBufferUsage.StaticCopy,
    DYNAMIC_COPY: GLBufferUsage.DynamicCopy,
    STREAM_COPY: GLBufferUsage.StreamCopy,

    // Data Types
    BYTE: GLDataType.Byte,
    UNSIGNED_BYTE: GLDataType.UnsignedByte,
    SHORT: GLDataType.Short,
    UNSIGNED_SHORT: GLDataType.UnsignedShort,
    INT: GLDataType.Int,
    UNSIGNED_INT: GLDataType.UnsignedInt,
    FLOAT: GLDataType.Float,
    HALF_FLOAT: GLDataType.HalfFloat,

    // Primitives
    POINTS: GLPrimitive.Points,
    LINES: GLPrimitive.Lines,
    LINE_LOOP: GLPrimitive.LineLoop,
    LINE_STRIP: GLPrimitive.LineStrip,
    TRIANGLES: GLPrimitive.Triangles,
    TRIANGLE_STRIP: GLPrimitive.TriangleStrip,
    TRIANGLE_FAN: GLPrimitive.TriangleFan,

    // Textures
    TEXTURE_2D: GLTextureTarget.Texture2D,
    TEXTURE_CUBE_MAP: GLTextureTarget.CubeMap,
    TEXTURE_3D: GLTextureTarget.Texture3D,
    TEXTURE_2D_ARRAY: GLTextureTarget.Texture2DArray,

    // Cubemap Faces
    TEXTURE_CUBE_MAP_POSITIVE_X: GLCubeFace.PositiveX,
    TEXTURE_CUBE_MAP_NEGATIVE_X: GLCubeFace.NegativeX,
    TEXTURE_CUBE_MAP_POSITIVE_Y: GLCubeFace.PositiveY,
    TEXTURE_CUBE_MAP_NEGATIVE_Y: GLCubeFace.NegativeY,
    TEXTURE_CUBE_MAP_POSITIVE_Z: GLCubeFace.PositiveZ,
    TEXTURE_CUBE_MAP_NEGATIVE_Z: GLCubeFace.NegativeZ,

    // Texture Filters
    NEAREST: GLTextureFilter.Nearest,
    LINEAR: GLTextureFilter.Linear,
    NEAREST_MIPMAP_NEAREST: GLTextureFilter.NearestMipmapNearest,
    LINEAR_MIPMAP_NEAREST: GLTextureFilter.LinearMipmapNearest,
    NEAREST_MIPMAP_LINEAR: GLTextureFilter.NearestMipmapLinear,
    LINEAR_MIPMAP_LINEAR: GLTextureFilter.LinearMipmapLinear,

    // Texture Wrapping
    CLAMP_TO_EDGE: GLTextureWrap.ClampToEdge,
    REPEAT: GLTextureWrap.Repeat,
    MIRRORED_REPEAT: GLTextureWrap.MirroredRepeat,

    // Pixel Formats
    DEPTH_COMPONENT: GLPixelFormat.DepthComponent,
    ALPHA: GLPixelFormat.Alpha,
    RGB: GLPixelFormat.Rgb,
    RGBA: GLPixelFormat.Rgba,
    LUMINANCE: GLPixelFormat.Luminance,
    LUMINANCE_ALPHA: GLPixelFormat.LuminanceAlpha,
    RED: GLPixelFormat.Red,
    RG: GLPixelFormat.Rg,
    RGB8: GLPixelFormat.Rgb8,
    RGBA8: GLPixelFormat.Rgba8,

    // Capabilities & Tests
    DEPTH_TEST: GLCapability.DepthTest,
    BLEND: GLCapability.Blend,
    CULL_FACE: GLCapability.CullFace,
    SCISSOR_TEST: GLCapability.ScissorTest,
    STENCIL_TEST: GLCapability.StencilTest,
    DITHER: GLCapability.Dither,
    RASTERIZER_DISCARD: GLCapability.RasterizerDiscard,

    // Depth Functions
    NEVER: GLDepthFunction.Never,
    LESS: GLDepthFunction.Less,
    EQUAL: GLDepthFunction.Equal,
    LEQUAL: GLDepthFunction.Lequal,
    GREATER: GLDepthFunction.Greater,
    NOTEQUAL: GLDepthFunction.NotEqual,
    GEQUAL: GLDepthFunction.Gequal,
    ALWAYS: GLDepthFunction.Always,

    // Culling & FrontFace
    FRONT: GLCullFace.Front,
    BACK: GLCullFace.Back,
    FRONT_AND_BACK: GLCullFace.FrontAndBack,
    CW: GLFrontFace.Cw,
    CCW: GLFrontFace.Ccw,

    // Blending Factors
    ZERO: GLBlendFactor.Zero,
    ONE: GLBlendFactor.One,
    SRC_COLOR: GLBlendFactor.SrcColor,
    ONE_MINUS_SRC_COLOR: GLBlendFactor.OneMinusSrcColor,
    SRC_ALPHA: GLBlendFactor.SrcAlpha,
    ONE_MINUS_SRC_ALPHA: GLBlendFactor.OneMinusSrcAlpha,
    DST_ALPHA: GLBlendFactor.DstAlpha,
    ONE_MINUS_DST_ALPHA: GLBlendFactor.OneMinusDstAlpha,
    DST_COLOR: GLBlendFactor.DstColor,
    ONE_MINUS_DST_COLOR: GLBlendFactor.OneMinusDstColor,
    SRC_ALPHA_SATURATE: GLBlendFactor.SrcAlphaSaturate,

    // Blending Equations
    FUNC_ADD: GLBlendEquation.FuncAdd,
    FUNC_SUBTRACT: GLBlendEquation.FuncSubtract,
    FUNC_REVERSE_SUBTRACT: GLBlendEquation.FuncReverseSubtract,
    MIN: GLBlendEquation.Min,
    MAX: GLBlendEquation.Max,

    // Shader Types & Parameters
    VERTEX_SHADER: GLShaderType.VertexShader,
    FRAGMENT_SHADER: GLShaderType.FragmentShader,
    DELETE_STATUS: GLShaderParameter.DeleteStatus,
    COMPILE_STATUS: GLShaderParameter.CompileStatus,
    LINK_STATUS: GLShaderParameter.LinkStatus,
    VALIDATE_STATUS: GLShaderParameter.ValidateStatus,

    // Clear Masks
    DEPTH_BUFFER_BIT: GLClearMask.DepthBufferBit,
    STENCIL_BUFFER_BIT: GLClearMask.StencilBufferBit,
    COLOR_BUFFER_BIT: GLClearMask.ColorBufferBit,

    // Capacity Limits
    MAX_TEXTURE_SIZE: GLParameterLimit.MaxTextureSize,
    MAX_TEXTURE_IMAGE_UNITS: GLParameterLimit.MaxTextureImageUnits,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: GLParameterLimit.MaxCombinedTextureImageUnits,
    MAX_CUBE_MAP_TEXTURE_SIZE: GLParameterLimit.MaxCubeMapTextureSize,
    MAX_VERTEX_ATTRIBS: GLParameterLimit.MaxVertexAttribs,
    MAX_RENDERBUFFER_SIZE: GLParameterLimit.MaxRenderbufferSize,
} as const;
