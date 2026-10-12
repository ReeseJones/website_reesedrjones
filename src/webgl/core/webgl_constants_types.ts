/**
 * Strongly-typed WebGL2 numeric enum groups.
 * Mapped directly to native WebGL2 / OpenGL ES 3.0 specification constant values.
 * Allows zero-overhead compilation and type-safe parameter definitions project-wide.
 */

/**
 * Buffer binding targets for gl.bindBuffer.
 */
export enum GLBufferTarget {
    ArrayBuffer = 0x8892,
    ElementArrayBuffer = 0x8893,
    UniformBuffer = 0x8a11,
    CopyReadBuffer = 0x8f36,
    CopyWriteBuffer = 0x8f37,
    PixelPackBuffer = 0x88eb,
    PixelUnpackBuffer = 0x88ec,
    TransformFeedbackBuffer = 0x8c8e,
}

/**
 * Buffer memory usage hints for gl.bufferData.
 */
export enum GLBufferUsage {
    StaticDraw = 0x88e4,
    DynamicDraw = 0x88e8,
    StreamDraw = 0x88e0,
    StaticRead = 0x88e5,
    DynamicRead = 0x88e9,
    StreamRead = 0x88e1,
    StaticCopy = 0x88e6,
    DynamicCopy = 0x88ea,
    StreamCopy = 0x88e2,
}

/**
 * Attribute and uniform data scalar types.
 */
export enum GLDataType {
    Byte = 0x1400,
    UnsignedByte = 0x1401,
    Short = 0x1402,
    UnsignedShort = 0x1403,
    Int = 0x1404,
    UnsignedInt = 0x1405,
    Float = 0x1406,
    HalfFloat = 0x140b,
}

/**
 * Geometric draw primitive topologies for gl.drawArrays and gl.drawElements.
 */
export enum GLPrimitive {
    Points = 0x0000,
    Lines = 0x0001,
    LineLoop = 0x0002,
    LineStrip = 0x0003,
    Triangles = 0x0004,
    TriangleStrip = 0x0005,
    TriangleFan = 0x0006,
}

/**
 * Texture binding targets for gl.bindTexture.
 */
export enum GLTextureTarget {
    Texture2D = 0x0de1,
    CubeMap = 0x8513,
    Texture3D = 0x806f,
    Texture2DArray = 0x8c1a,
}

/**
 * Cubemap face targets for gl.texImage2D and framebuffer attachments.
 */
export enum GLCubeFace {
    PositiveX = 0x8515,
    NegativeX = 0x8516,
    PositiveY = 0x8517,
    NegativeY = 0x8518,
    PositiveZ = 0x8519,
    NegativeZ = 0x851a,
}

/**
 * Minification and magnification filter constants.
 */
export enum GLTextureFilter {
    Nearest = 0x2600,
    Linear = 0x2601,
    NearestMipmapNearest = 0x2700,
    LinearMipmapNearest = 0x2701,
    NearestMipmapLinear = 0x2702,
    LinearMipmapLinear = 0x2703,
}

/**
 * Texture coordinate wrapping modes.
 */
export enum GLTextureWrap {
    ClampToEdge = 0x812f,
    Repeat = 0x2901,
    MirroredRepeat = 0x8370,
}

/**
 * Pixel data formats and sized internal formats.
 */
export enum GLPixelFormat {
    DepthComponent = 0x1902,
    Alpha = 0x1906,
    Rgb = 0x1907,
    Rgba = 0x1908,
    Luminance = 0x1909,
    LuminanceAlpha = 0x190a,
    Red = 0x1903,
    Rg = 0x8227,
    Rgb8 = 0x8051,
    Rgba8 = 0x8058,
}

/**
 * WebGL server-side capabilities toggled via gl.enable and gl.disable.
 */
export enum GLCapability {
    DepthTest = 0x0b71,
    Blend = 0x0be2,
    CullFace = 0x0b44,
    ScissorTest = 0x0c11,
    StencilTest = 0x0b90,
    Dither = 0x0bd0,
    RasterizerDiscard = 0x8c89,
}

/**
 * Depth comparison test functions for gl.depthFunc.
 */
export enum GLDepthFunction {
    Never = 0x0200,
    Less = 0x0201,
    Equal = 0x0202,
    Lequal = 0x0203,
    Greater = 0x0204,
    NotEqual = 0x0205,
    Gequal = 0x0206,
    Always = 0x0207,
}

/**
 * Polygon facet culling modes for gl.cullFace.
 */
export enum GLCullFace {
    Front = 0x0404,
    Back = 0x0405,
    FrontAndBack = 0x0408,
}

/**
 * Front-facing polygon winding orientation for gl.frontFace.
 */
export enum GLFrontFace {
    Cw = 0x0900,
    Ccw = 0x0901,
}

/**
 * Blending source and destination factor weights for gl.blendFunc.
 */
export enum GLBlendFactor {
    Zero = 0,
    One = 1,
    SrcColor = 0x0300,
    OneMinusSrcColor = 0x0301,
    SrcAlpha = 0x0302,
    OneMinusSrcAlpha = 0x0303,
    DstAlpha = 0x0304,
    OneMinusDstAlpha = 0x0305,
    DstColor = 0x0306,
    OneMinusDstColor = 0x0307,
    SrcAlphaSaturate = 0x0308,
}

/**
 * Blending equations for gl.blendEquation.
 */
export enum GLBlendEquation {
    FuncAdd = 0x8006,
    FuncSubtract = 0x800a,
    FuncReverseSubtract = 0x800b,
    Min = 0x8007,
    Max = 0x8008,
}

/**
 * Shader stage types for gl.createShader.
 */
export enum GLShaderType {
    VertexShader = 0x8b31,
    FragmentShader = 0x8b30,
}

/**
 * Shader and program status query parameters.
 */
export enum GLShaderParameter {
    DeleteStatus = 0x8b80,
    CompileStatus = 0x8b81,
    LinkStatus = 0x8b82,
    ValidateStatus = 0x8b83,
}

/**
 * Framebuffer clear bit masks for gl.clear.
 */
export enum GLClearMask {
    DepthBufferBit = 0x00000100,
    StencilBufferBit = 0x00000400,
    ColorBufferBit = 0x00004000,
}

/**
 * WebGL implementation driver parameters and capacity limits.
 */
export enum GLParameterLimit {
    MaxTextureSize = 0x0d33,
    MaxTextureImageUnits = 0x8872,
    MaxCombinedTextureImageUnits = 0x8b4d,
    MaxCubeMapTextureSize = 0x851c,
    MaxVertexAttribs = 0x8869,
    MaxRenderbufferSize = 0x84e8,
}
