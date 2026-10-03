/**
 * Vitest environment setup: Shims static WebGL2 constants on globalThis when
 * running in headless Node.js, ensuring WebGL2RenderingContext.<CONSTANT> references
 * do not throw ReferenceErrors during unit testing.
 */

const WEBGL2_STATIC_CONSTANTS: Record<string, number> = {
    // Buffers & Draw Modes
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88e4,
    DYNAMIC_DRAW: 0x88e8,
    STREAM_DRAW: 0x88e0,

    // Data Types
    FLOAT: 0x1406,
    UNSIGNED_SHORT: 0x1403,
    UNSIGNED_INT: 0x1405,
    UNSIGNED_BYTE: 0x1401,
    BYTE: 0x1400,
    SHORT: 0x1402,
    INT: 0x1404,
    HALF_FLOAT: 0x140b,

    // Primitives
    POINTS: 0x0000,
    LINES: 0x0001,
    LINE_LOOP: 0x0002,
    LINE_STRIP: 0x0003,
    TRIANGLES: 0x0004,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLE_FAN: 0x0006,

    // Textures
    TEXTURE_2D: 0x0de1,
    TEXTURE_CUBE_MAP: 0x8513,
    TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515,
    TEXTURE_CUBE_MAP_NEGATIVE_X: 0x8516,
    TEXTURE_CUBE_MAP_POSITIVE_Y: 0x8517,
    TEXTURE_CUBE_MAP_NEGATIVE_Y: 0x8518,
    TEXTURE_CUBE_MAP_POSITIVE_Z: 0x8519,
    TEXTURE_CUBE_MAP_NEGATIVE_Z: 0x851a,
    TEXTURE0: 0x84c0,
    RGBA: 0x1908,
    RGB: 0x1907,
    RGBA8: 0x8058,
    RGB8: 0x8051,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    TEXTURE_WRAP_R: 0x8072,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    NEAREST_MIPMAP_NEAREST: 0x2700,
    LINEAR_MIPMAP_NEAREST: 0x2701,
    NEAREST_MIPMAP_LINEAR: 0x2702,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    REPEAT: 0x2901,
    CLAMP_TO_EDGE: 0x812f,
    MIRRORED_REPEAT: 0x8370,

    // Capabilities & Tests
    DEPTH_TEST: 0x0b71,
    BLEND: 0x0be2,
    CULL_FACE: 0x0b44,
    SCISSOR_TEST: 0x0c11,
    STENCIL_TEST: 0x0b90,
    DITHER: 0x0bd0,

    // Depth Functions
    NEVER: 0x0200,
    LESS: 0x0201,
    EQUAL: 0x0202,
    LEQUAL: 0x0203,
    GREATER: 0x0204,
    NOTEQUAL: 0x0205,
    GEQUAL: 0x0206,
    ALWAYS: 0x0207,

    // Culling
    FRONT: 0x0404,
    BACK: 0x0405,
    FRONT_AND_BACK: 0x0408,
    CW: 0x0900,
    CCW: 0x0901,

    // Blending Factors & Equations
    ZERO: 0,
    ONE: 1,
    SRC_COLOR: 0x0300,
    ONE_MINUS_SRC_COLOR: 0x0301,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    DST_ALPHA: 0x0304,
    ONE_MINUS_DST_ALPHA: 0x0305,
    DST_COLOR: 0x0306,
    ONE_MINUS_DST_COLOR: 0x0307,
    SRC_ALPHA_SATURATE: 0x0308,
    FUNC_ADD: 0x8006,
    FUNC_SUBTRACT: 0x800a,
    FUNC_REVERSE_SUBTRACT: 0x800b,
    MIN: 0x8007,
    MAX: 0x8008,

    // Shader Types
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,

    // Parameters & Limits
    MAX_TEXTURE_IMAGE_UNITS: 0x8872,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
    MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c,
    MAX_VERTEX_ATTRIBS: 0x8869,
    COLOR_BUFFER_BIT: 0x00004000,
    DEPTH_BUFFER_BIT: 0x00000100,
    STENCIL_BUFFER_BIT: 0x00000400,
};

function shimWebGLConstants() {
    if (typeof globalThis.WebGL2RenderingContext === "undefined") {
        const MockContextConstructor = function WebGL2RenderingContext() {};
        Object.assign(MockContextConstructor, WEBGL2_STATIC_CONSTANTS);
        (globalThis as unknown as { WebGL2RenderingContext: unknown }).WebGL2RenderingContext = MockContextConstructor;
    }

    if (typeof globalThis.WebGLRenderingContext === "undefined") {
        const MockContextConstructor = function WebGLRenderingContext() {};
        Object.assign(MockContextConstructor, WEBGL2_STATIC_CONSTANTS);
        (globalThis as unknown as { WebGLRenderingContext: unknown }).WebGLRenderingContext = MockContextConstructor;
    }
}

shimWebGLConstants();
