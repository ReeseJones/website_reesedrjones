import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    computeLayoutStride,
    configureMultiBufferVAO,
    configureVAO,
    parseVertexLayoutFromGLSL,
} from "./vertex_layout";
import {
    VertexStepRate,
    type VertexBufferBinding,
    type VertexLayoutSpec,
} from "./vertex_layout_types";
import { createMockWebGL2Context } from "../../testing/mocks/mock_gl_context";

describe("vertex_layout", () => {
    describe("computeLayoutStride", () => {
        it("returns explicit layout.stride when provided", () => {
            const layoutWithExplicitStride: VertexLayoutSpec = {
                stride: 48,
                attributes: [
                    { nameOrLocation: 0, description: "position", size: 3 },
                    { nameOrLocation: 1, description: "normal", size: 3 },
                ],
            };

            const stride = computeLayoutStride(layoutWithExplicitStride);

            expect(stride).toBe(48);

            const emptyLayoutWithExplicitStride: VertexLayoutSpec = {
                stride: 64,
                attributes: [],
            };
            expect(computeLayoutStride(emptyLayoutWithExplicitStride)).toBe(64);
        });

        it("computes stride dynamically when layout.stride is undefined (sum of size * 4 for float attributes)", () => {
            const floatLayout: VertexLayoutSpec = {
                attributes: [
                    { nameOrLocation: 0, description: "position", size: 3 },
                    { nameOrLocation: 1, description: "normal", size: 3 },
                    { nameOrLocation: 2, description: "uv", size: 2 },
                ],
            };

            // (3 + 3 + 2) * 4 bytes per float = 32 bytes
            const stride = computeLayoutStride(floatLayout);

            expect(stride).toBe(32);
        });

        it("handles custom componentBytes (e.g. 1 for UNSIGNED_BYTE, 2 for UNSIGNED_SHORT)", () => {
            const mixedLayout: VertexLayoutSpec = {
                attributes: [
                    {
                        nameOrLocation: 0,
                        description: "position",
                        size: 3,
                        componentBytes: 4,
                    },
                    {
                        nameOrLocation: 1,
                        description: "color",
                        size: 4,
                        componentBytes: 1,
                    },
                    {
                        nameOrLocation: 2,
                        description: "joints",
                        size: 4,
                        componentBytes: 2,
                    },
                ],
            };

            // 3 * 4 + 4 * 1 + 4 * 2 = 12 + 4 + 8 = 24 bytes
            const stride = computeLayoutStride(mixedLayout);

            expect(stride).toBe(24);
        });

        it("returns 0 for empty attributes array when no stride provided", () => {
            const emptyLayout: VertexLayoutSpec = {
                attributes: [],
            };

            const stride = computeLayoutStride(emptyLayout);

            expect(stride).toBe(0);
        });
    });

    describe("configureMultiBufferVAO", () => {
        let gl: WebGL2RenderingContext;
        let vao: WebGLVertexArrayObject;
        let vbo1: WebGLBuffer;
        let vbo2: WebGLBuffer;
        let program: WebGLProgram;

        beforeEach(() => {
            gl = createMockWebGL2Context();
            vao = gl.createVertexArray()!;
            vbo1 = gl.createBuffer()!;
            vbo2 = gl.createBuffer()!;
            program = gl.createProgram()!;
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("binds target VAO, then binds each buffer to gl.ARRAY_BUFFER", () => {
            const callOrder: string[] = [];
            vi.mocked(gl.bindVertexArray).mockImplementation((v) => {
                callOrder.push(`bindVertexArray:${v === vao ? "vao" : "null"}`);
            });
            vi.mocked(gl.bindBuffer).mockImplementation((target, buf) => {
                const bufName = buf === vbo1 ? "vbo1" : buf === vbo2 ? "vbo2" : "null";
                callOrder.push(`bindBuffer:${bufName}`);
            });

            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [{ nameOrLocation: 0, description: "pos", size: 3 }],
                    },
                },
                {
                    vbo: vbo2,
                    layout: {
                        attributes: [{ nameOrLocation: 1, description: "uv", size: 2 }],
                    },
                },
            ];

            configureMultiBufferVAO(gl, vao, bindings);

            expect(callOrder[0]).toBe("bindVertexArray:vao");
            expect(callOrder).toContain("bindBuffer:vbo1");
            expect(callOrder).toContain("bindBuffer:vbo2");
            expect(callOrder.indexOf("bindVertexArray:vao")).toBeLessThan(
                callOrder.indexOf("bindBuffer:vbo1")
            );
            expect(callOrder.indexOf("bindBuffer:vbo1")).toBeLessThan(
                callOrder.indexOf("bindBuffer:vbo2")
            );
        });

        it("configures attribute pointers with calculated stride and cumulative offsets", () => {
            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [
                            { nameOrLocation: 0, description: "position", size: 3 },
                            { nameOrLocation: 1, description: "normal", size: 3 },
                            { nameOrLocation: 2, description: "uv", size: 2 },
                        ],
                    },
                },
            ];

            // Stride = (3 + 3 + 2) * 4 = 32 bytes
            // Offsets: pos @ 0, normal @ 12, uv @ 24
            configureMultiBufferVAO(gl, vao, bindings);

            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(0);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(1);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(2);

            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                0,
                3,
                gl.FLOAT,
                false,
                32,
                0
            );
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                1,
                3,
                gl.FLOAT,
                false,
                32,
                12
            );
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                2,
                2,
                gl.FLOAT,
                false,
                32,
                24
            );
        });

        it("supports numeric attribute locations directly (no program required)", () => {
            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [
                            { nameOrLocation: 0, description: "position", size: 3 },
                            { nameOrLocation: 4, description: "color", size: 4 },
                        ],
                    },
                },
            ];

            configureMultiBufferVAO(gl, vao, bindings);

            expect(gl.getAttribLocation).not.toHaveBeenCalled();
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(0);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(4);
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                0,
                3,
                gl.FLOAT,
                false,
                28,
                0
            );
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                4,
                4,
                gl.FLOAT,
                false,
                28,
                12
            );
        });

        it("resolves named attributes using gl.getAttribLocation when program is supplied", () => {
            vi.mocked(gl.getAttribLocation).mockImplementation((_prog, name) => {
                if (name === "a_position") return 0;
                if (name === "a_texCoord") return 2;
                return -1;
            });

            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [
                            { nameOrLocation: "a_position", description: "pos", size: 3 },
                            { nameOrLocation: "a_texCoord", description: "uv", size: 2 },
                        ],
                    },
                },
            ];

            configureMultiBufferVAO(gl, vao, bindings, program);

            expect(gl.getAttribLocation).toHaveBeenCalledWith(program, "a_position");
            expect(gl.getAttribLocation).toHaveBeenCalledWith(program, "a_texCoord");

            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(0);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(2);

            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                0,
                3,
                gl.FLOAT,
                false,
                20,
                0
            );
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                2,
                2,
                gl.FLOAT,
                false,
                20,
                12
            );
        });

        it("warns via console.warn and skips attribute when named attribute used without a program", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [
                            { nameOrLocation: "a_position", description: "pos", size: 3 },
                            { nameOrLocation: 1, description: "uv", size: 2 },
                        ],
                    },
                },
            ];

            // No program supplied
            configureMultiBufferVAO(gl, vao, bindings);

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "configureMultiBufferVAO: Shader program required to resolve attribute name 'a_position'"
                )
            );

            // Attribute 1 should still be configured and offset must correctly reflect skipped 3 floats (12 bytes)
            expect(gl.enableVertexAttribArray).toHaveBeenCalledTimes(1);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(1);
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                1,
                2,
                gl.FLOAT,
                false,
                20,
                12
            );
        });

        it("warns via console.warn and skips attribute when gl.getAttribLocation returns -1 (inactive attribute)", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            vi.mocked(gl.getAttribLocation).mockImplementation((_prog, name) => {
                if (name === "a_inactive") return -1;
                if (name === "a_active") return 0;
                return -1;
            });

            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [
                            { nameOrLocation: "a_inactive", description: "dead", size: 3 },
                            { nameOrLocation: "a_active", description: "alive", size: 2 },
                        ],
                    },
                },
            ];

            configureMultiBufferVAO(gl, vao, bindings, program);

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "configureMultiBufferVAO: Attribute 'a_inactive' not active in shader program"
                )
            );

            // -1 should NOT be enabled or pointed
            expect(gl.enableVertexAttribArray).not.toHaveBeenCalledWith(-1);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledTimes(1);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(0);

            // Offset correctly advanced by skipped attribute (3 * 4 = 12 bytes)
            expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(1);
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                0,
                2,
                gl.FLOAT,
                false,
                20,
                12
            );
        });

        it("applies default type gl.FLOAT and default normalized false when omitted", () => {
            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [
                            { nameOrLocation: 0, description: "position", size: 3 },
                        ],
                    },
                },
            ];

            configureMultiBufferVAO(gl, vao, bindings);

            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                0,
                3,
                gl.FLOAT,
                false,
                12,
                0
            );
        });

        it("respects explicit type, componentBytes, and normalized flags", () => {
            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [
                            {
                                nameOrLocation: 0,
                                description: "color",
                                size: 4,
                                type: gl.UNSIGNED_BYTE,
                                componentBytes: 1,
                                normalized: true,
                            },
                        ],
                    },
                },
            ];

            configureMultiBufferVAO(gl, vao, bindings);

            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                0,
                4,
                gl.UNSIGNED_BYTE,
                true,
                4,
                0
            );
        });

        it("configures instancing divisor: calls gl.vertexAttribDivisor when divisor is set on binding", () => {
            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    divisor: VertexStepRate.PerInstance,
                    layout: {
                        attributes: [
                            { nameOrLocation: 0, description: "instancePos", size: 3 },
                            { nameOrLocation: 1, description: "instanceScale", size: 1 },
                        ],
                    },
                },
            ];

            configureMultiBufferVAO(gl, vao, bindings);

            expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(0, 1);
            expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(1, 1);
        });

        it("per-attribute divisor overrides binding-level divisor", () => {
            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    divisor: VertexStepRate.PerInstance, // 1
                    layout: {
                        attributes: [
                            {
                                nameOrLocation: 0,
                                description: "standardAttr",
                                size: 3,
                                divisor: VertexStepRate.PerVertex, // 0 (overrides binding divisor)
                            },
                            {
                                nameOrLocation: 1,
                                description: "defaultInheritedAttr",
                                size: 1,
                                // divisor omitted -> inherits binding divisor 1
                            },
                            {
                                nameOrLocation: 2,
                                description: "customStepRateAttr",
                                size: 2,
                                divisor: 4, // custom step rate overrides binding divisor
                            },
                        ],
                    },
                },
            ];

            configureMultiBufferVAO(gl, vao, bindings);

            expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(0, 0);
            expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(1, 1);
            expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(2, 4);
        });

        it("unbinds VAO and ARRAY_BUFFER at the end of configuration", () => {
            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [{ nameOrLocation: 0, description: "pos", size: 3 }],
                    },
                },
            ];

            configureMultiBufferVAO(gl, vao, bindings);

            const vaoCalls = vi.mocked(gl.bindVertexArray).mock.calls;
            const bufferCalls = vi.mocked(gl.bindBuffer).mock.calls;

            expect(vaoCalls[vaoCalls.length - 1]).toEqual([null]);
            expect(bufferCalls[bufferCalls.length - 1]).toEqual([gl.ARRAY_BUFFER, null]);
        });
    });

    describe("configureVAO", () => {
        let gl: WebGL2RenderingContext;
        let vao: WebGLVertexArrayObject;
        let vbo1: WebGLBuffer;
        let vbo2: WebGLBuffer;
        let program: WebGLProgram;

        beforeEach(() => {
            gl = createMockWebGL2Context();
            vao = gl.createVertexArray()!;
            vbo1 = gl.createBuffer()!;
            vbo2 = gl.createBuffer()!;
            program = gl.createProgram()!;
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("single VBO overload: correctly delegates to configureMultiBufferVAO with single binding", () => {
            const layout: VertexLayoutSpec = {
                attributes: [
                    { nameOrLocation: 0, description: "position", size: 3 },
                    { nameOrLocation: 1, description: "normal", size: 3 },
                ],
            };

            configureVAO(gl, vao, vbo1, layout);

            expect(gl.bindVertexArray).toHaveBeenCalledWith(vao);
            expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, vbo1);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(0);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(1);
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                0,
                3,
                gl.FLOAT,
                false,
                24,
                0
            );
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                1,
                3,
                gl.FLOAT,
                false,
                24,
                12
            );
            expect(gl.bindVertexArray).toHaveBeenLastCalledWith(null);
            expect(gl.bindBuffer).toHaveBeenLastCalledWith(gl.ARRAY_BUFFER, null);
        });

        it("multi-buffer bindings array overload: correctly delegates to configureMultiBufferVAO", () => {
            const bindings: VertexBufferBinding[] = [
                {
                    vbo: vbo1,
                    layout: {
                        attributes: [{ nameOrLocation: 0, description: "pos", size: 3 }],
                    },
                },
                {
                    vbo: vbo2,
                    layout: {
                        attributes: [{ nameOrLocation: 1, description: "uv", size: 2 }],
                    },
                },
            ];

            configureVAO(gl, vao, bindings);

            expect(gl.bindVertexArray).toHaveBeenCalledWith(vao);
            expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, vbo1);
            expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, vbo2);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(0);
            expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(1);
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                0,
                3,
                gl.FLOAT,
                false,
                12,
                0
            );
            expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
                1,
                2,
                gl.FLOAT,
                false,
                8,
                0
            );
            expect(gl.bindVertexArray).toHaveBeenLastCalledWith(null);
            expect(gl.bindBuffer).toHaveBeenLastCalledWith(gl.ARRAY_BUFFER, null);
        });
    });

    describe("parseVertexLayoutFromGLSL", () => {
        it("extracts location indices, symbol names, and component sizes from GLSL source (vec4 -> 4, vec3 -> 3, vec2 -> 2, float -> 1)", () => {
            const vertSource = `
                #version 300 es
                layout(location = 0) in vec3 a_position;
                layout(location = 1) in vec2 a_texCoord;
                layout(location = 2) in vec4 a_color;
                layout(location = 3) in float a_intensity;

                void main() {
                    gl_Position = vec4(a_position, 1.0);
                }
            `;

            const layout = parseVertexLayoutFromGLSL(vertSource);

            expect(layout.attributes).toEqual([
                {
                    nameOrLocation: 0,
                    description: "a_position (vec3)",
                    size: 3,
                },
                {
                    nameOrLocation: 1,
                    description: "a_texCoord (vec2)",
                    size: 2,
                },
                {
                    nameOrLocation: 2,
                    description: "a_color (vec4)",
                    size: 4,
                },
                {
                    nameOrLocation: 3,
                    description: "a_intensity (float)",
                    size: 1,
                },
            ]);
        });

        it("handles varied whitespace and formatting", () => {
            const messySource = `
                layout ( location = 5 ) in vec3 a_normal ;
                layout(location=0)in vec2 a_uv;
                layout(
                    location = 10
                ) in
                    vec4   a_tangent;
            `;

            const layout = parseVertexLayoutFromGLSL(messySource);

            expect(layout.attributes).toEqual([
                {
                    nameOrLocation: 5,
                    description: "a_normal (vec3)",
                    size: 3,
                },
                {
                    nameOrLocation: 0,
                    description: "a_uv (vec2)",
                    size: 2,
                },
                {
                    nameOrLocation: 10,
                    description: "a_tangent (vec4)",
                    size: 4,
                },
            ]);
        });

        it("returns empty attributes array when no layout(location = N) declarations found", () => {
            const sourceWithoutLayout = `
                #version 300 es
                in vec3 a_position;
                uniform mat4 u_mvp;
                void main() {
                    gl_Position = vec4(a_position, 1.0);
                }
            `;

            const layout1 = parseVertexLayoutFromGLSL(sourceWithoutLayout);
            expect(layout1.attributes).toEqual([]);

            const layout2 = parseVertexLayoutFromGLSL("");
            expect(layout2.attributes).toEqual([]);
        });
    });
});
