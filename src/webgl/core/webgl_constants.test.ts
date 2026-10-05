import { describe, it, expect } from "vitest";
import {
    GL,
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
} from "./webgl_constants";

describe("WebGL Constants & Enums", () => {
    describe("GLBufferTarget", () => {
        it("matches WebGL2 buffer targets", () => {
            expect(GLBufferTarget.ArrayBuffer).toBe(WebGL2RenderingContext.ARRAY_BUFFER);
            expect(GLBufferTarget.ElementArrayBuffer).toBe(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER);
            expect(GLBufferTarget.UniformBuffer).toBe(0x8a11);
        });
    });

    describe("GLBufferUsage", () => {
        it("matches WebGL2 buffer usages", () => {
            expect(GLBufferUsage.StaticDraw).toBe(WebGL2RenderingContext.STATIC_DRAW);
            expect(GLBufferUsage.DynamicDraw).toBe(WebGL2RenderingContext.DYNAMIC_DRAW);
            expect(GLBufferUsage.StreamDraw).toBe(WebGL2RenderingContext.STREAM_DRAW);
        });
    });

    describe("GLDataType", () => {
        it("matches WebGL2 data scalar types", () => {
            expect(GLDataType.Byte).toBe(WebGL2RenderingContext.BYTE);
            expect(GLDataType.UnsignedByte).toBe(WebGL2RenderingContext.UNSIGNED_BYTE);
            expect(GLDataType.Short).toBe(WebGL2RenderingContext.SHORT);
            expect(GLDataType.UnsignedShort).toBe(WebGL2RenderingContext.UNSIGNED_SHORT);
            expect(GLDataType.Int).toBe(WebGL2RenderingContext.INT);
            expect(GLDataType.UnsignedInt).toBe(WebGL2RenderingContext.UNSIGNED_INT);
            expect(GLDataType.Float).toBe(WebGL2RenderingContext.FLOAT);
            expect(GLDataType.HalfFloat).toBe(WebGL2RenderingContext.HALF_FLOAT);
        });
    });

    describe("GLPrimitive", () => {
        it("matches WebGL2 primitive modes", () => {
            expect(GLPrimitive.Points).toBe(WebGL2RenderingContext.POINTS);
            expect(GLPrimitive.Lines).toBe(WebGL2RenderingContext.LINES);
            expect(GLPrimitive.LineLoop).toBe(WebGL2RenderingContext.LINE_LOOP);
            expect(GLPrimitive.LineStrip).toBe(WebGL2RenderingContext.LINE_STRIP);
            expect(GLPrimitive.Triangles).toBe(WebGL2RenderingContext.TRIANGLES);
            expect(GLPrimitive.TriangleStrip).toBe(WebGL2RenderingContext.TRIANGLE_STRIP);
            expect(GLPrimitive.TriangleFan).toBe(WebGL2RenderingContext.TRIANGLE_FAN);
        });
    });

    describe("GLTextureTarget", () => {
        it("matches WebGL2 texture binding targets", () => {
            expect(GLTextureTarget.Texture2D).toBe(WebGL2RenderingContext.TEXTURE_2D);
            expect(GLTextureTarget.CubeMap).toBe(WebGL2RenderingContext.TEXTURE_CUBE_MAP);
            expect(GLTextureTarget.Texture3D).toBe(WebGL2RenderingContext.TEXTURE_3D);
            expect(GLTextureTarget.Texture2DArray).toBe(WebGL2RenderingContext.TEXTURE_2D_ARRAY);
        });
    });

    describe("GLCubeFace", () => {
        it("matches WebGL2 cubemap faces in order", () => {
            expect(GLCubeFace.PositiveX).toBe(WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X);
            expect(GLCubeFace.NegativeX).toBe(WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X);
            expect(GLCubeFace.PositiveY).toBe(WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y);
            expect(GLCubeFace.NegativeY).toBe(WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y);
            expect(GLCubeFace.PositiveZ).toBe(WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z);
            expect(GLCubeFace.NegativeZ).toBe(WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z);
        });
    });

    describe("GLTextureFilter", () => {
        it("matches WebGL2 filter modes", () => {
            expect(GLTextureFilter.Nearest).toBe(WebGL2RenderingContext.NEAREST);
            expect(GLTextureFilter.Linear).toBe(WebGL2RenderingContext.LINEAR);
            expect(GLTextureFilter.NearestMipmapNearest).toBe(WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST);
            expect(GLTextureFilter.LinearMipmapNearest).toBe(WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST);
            expect(GLTextureFilter.NearestMipmapLinear).toBe(WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR);
            expect(GLTextureFilter.LinearMipmapLinear).toBe(WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR);
        });
    });

    describe("GLTextureWrap", () => {
        it("matches WebGL2 wrap modes", () => {
            expect(GLTextureWrap.ClampToEdge).toBe(WebGL2RenderingContext.CLAMP_TO_EDGE);
            expect(GLTextureWrap.Repeat).toBe(WebGL2RenderingContext.REPEAT);
            expect(GLTextureWrap.MirroredRepeat).toBe(WebGL2RenderingContext.MIRRORED_REPEAT);
        });
    });

    describe("GLPixelFormat", () => {
        it("matches WebGL2 pixel formats", () => {
            expect(GLPixelFormat.Rgba).toBe(WebGL2RenderingContext.RGBA);
            expect(GLPixelFormat.Rgb).toBe(WebGL2RenderingContext.RGB);
            expect(GLPixelFormat.Rgba8).toBe(WebGL2RenderingContext.RGBA8);
            expect(GLPixelFormat.Rgb8).toBe(WebGL2RenderingContext.RGB8);
        });
    });

    describe("GLCapability", () => {
        it("matches WebGL2 capability flags", () => {
            expect(GLCapability.DepthTest).toBe(WebGL2RenderingContext.DEPTH_TEST);
            expect(GLCapability.Blend).toBe(WebGL2RenderingContext.BLEND);
            expect(GLCapability.CullFace).toBe(WebGL2RenderingContext.CULL_FACE);
            expect(GLCapability.ScissorTest).toBe(WebGL2RenderingContext.SCISSOR_TEST);
            expect(GLCapability.StencilTest).toBe(WebGL2RenderingContext.STENCIL_TEST);
            expect(GLCapability.Dither).toBe(WebGL2RenderingContext.DITHER);
        });
    });

    describe("GLDepthFunction", () => {
        it("matches WebGL2 depth functions", () => {
            expect(GLDepthFunction.Never).toBe(WebGL2RenderingContext.NEVER);
            expect(GLDepthFunction.Less).toBe(WebGL2RenderingContext.LESS);
            expect(GLDepthFunction.Equal).toBe(WebGL2RenderingContext.EQUAL);
            expect(GLDepthFunction.Lequal).toBe(WebGL2RenderingContext.LEQUAL);
            expect(GLDepthFunction.Greater).toBe(WebGL2RenderingContext.GREATER);
            expect(GLDepthFunction.NotEqual).toBe(WebGL2RenderingContext.NOTEQUAL);
            expect(GLDepthFunction.Gequal).toBe(WebGL2RenderingContext.GEQUAL);
            expect(GLDepthFunction.Always).toBe(WebGL2RenderingContext.ALWAYS);
        });
    });

    describe("GLCullFace and GLFrontFace", () => {
        it("matches WebGL2 culling modes", () => {
            expect(GLCullFace.Front).toBe(WebGL2RenderingContext.FRONT);
            expect(GLCullFace.Back).toBe(WebGL2RenderingContext.BACK);
            expect(GLCullFace.FrontAndBack).toBe(WebGL2RenderingContext.FRONT_AND_BACK);
            expect(GLFrontFace.Cw).toBe(WebGL2RenderingContext.CW);
            expect(GLFrontFace.Ccw).toBe(WebGL2RenderingContext.CCW);
        });
    });

    describe("GLBlendFactor and GLBlendEquation", () => {
        it("matches WebGL2 blend factors and equations", () => {
            expect(GLBlendFactor.Zero).toBe(WebGL2RenderingContext.ZERO);
            expect(GLBlendFactor.One).toBe(WebGL2RenderingContext.ONE);
            expect(GLBlendFactor.SrcAlpha).toBe(WebGL2RenderingContext.SRC_ALPHA);
            expect(GLBlendFactor.OneMinusSrcAlpha).toBe(WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA);
            expect(GLBlendEquation.FuncAdd).toBe(WebGL2RenderingContext.FUNC_ADD);
            expect(GLBlendEquation.FuncSubtract).toBe(WebGL2RenderingContext.FUNC_SUBTRACT);
            expect(GLBlendEquation.Min).toBe(WebGL2RenderingContext.MIN);
            expect(GLBlendEquation.Max).toBe(WebGL2RenderingContext.MAX);
        });
    });

    describe("GLShaderType and GLShaderParameter", () => {
        it("matches WebGL2 shader constants", () => {
            expect(GLShaderType.VertexShader).toBe(WebGL2RenderingContext.VERTEX_SHADER);
            expect(GLShaderType.FragmentShader).toBe(WebGL2RenderingContext.FRAGMENT_SHADER);
            expect(GLShaderParameter.CompileStatus).toBe(WebGL2RenderingContext.COMPILE_STATUS);
            expect(GLShaderParameter.LinkStatus).toBe(WebGL2RenderingContext.LINK_STATUS);
        });
    });

    describe("GLClearMask", () => {
        it("matches WebGL2 buffer clear bits", () => {
            expect(GLClearMask.ColorBufferBit).toBe(WebGL2RenderingContext.COLOR_BUFFER_BIT);
            expect(GLClearMask.DepthBufferBit).toBe(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
            expect(GLClearMask.StencilBufferBit).toBe(WebGL2RenderingContext.STENCIL_BUFFER_BIT);
        });
    });

    describe("GL unified dictionary", () => {
        it("provides direct constant access mirroring WebGL2RenderingContext", () => {
            expect(GL.TRIANGLES).toBe(WebGL2RenderingContext.TRIANGLES);
            expect(GL.STATIC_DRAW).toBe(WebGL2RenderingContext.STATIC_DRAW);
            expect(GL.FLOAT).toBe(WebGL2RenderingContext.FLOAT);
            expect(GL.ARRAY_BUFFER).toBe(WebGL2RenderingContext.ARRAY_BUFFER);
            expect(GL.TEXTURE_2D).toBe(WebGL2RenderingContext.TEXTURE_2D);
            expect(GL.TEXTURE_CUBE_MAP).toBe(WebGL2RenderingContext.TEXTURE_CUBE_MAP);
            expect(GL.COLOR_BUFFER_BIT).toBe(WebGL2RenderingContext.COLOR_BUFFER_BIT);
            expect(GL.DEPTH_BUFFER_BIT).toBe(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
            expect(GL.BLEND).toBe(WebGL2RenderingContext.BLEND);
            expect(GL.DEPTH_TEST).toBe(WebGL2RenderingContext.DEPTH_TEST);
        });
    });
});
