import type { GLDataType } from "../core/webgl_constants_types";

/**
 * Standard WebGL2 attribute location slot indices (layout(location = N)).
 */
export const VertexAttributeLocation = {
    Position: 0,
    Normal: 1,
    Uv: 2,
    Color: 3,
    Tangent: 4,
} as const;

export type VertexAttributeLocation =
    (typeof VertexAttributeLocation)[keyof typeof VertexAttributeLocation];

/**
 * Common step rates for WebGL2 vertex attribute advancement (gl.vertexAttribDivisor).
 */
export const VertexStepRate = {
    /** Attribute advances once per vertex (divisor = 0, default for standard geometry) */
    PerVertex: 0,
    /** Attribute advances once per instance (divisor = 1, standard for instanced data) */
    PerInstance: 1,
} as const;

export type VertexStepRate = (typeof VertexStepRate)[keyof typeof VertexStepRate] | number;

/**
 * Attribute specification for a single vertex attribute within a WebGL buffer layout.
 */
export interface AttributeSpec {
    /** Location index (for layout(location = N)) or shader attribute symbol name (e.g. "a_position") */
    nameOrLocation: number | string;

    /** Human-readable description explaining what this attribute represents */
    description: string;

    /** Number of components per vertex attribute (1, 2, 3, or 4) */
    size: number;

    /** WebGL data type enum (e.g. GLDataType.Float, GLDataType.UnsignedByte). Defaults to GLDataType.Float */
    type?: GLDataType | number;

    /** Byte size per component (e.g. 4 for Float32Array). Defaults to Float32Array.BYTES_PER_ELEMENT */
    componentBytes?: number;

    /** Whether fixed-point data values should be normalized. Defaults to false */
    normalized?: boolean;

    /**
     * Optional attribute instancing divisor override (WebGL2).
     * Use VertexStepRate.PerVertex (0), VertexStepRate.PerInstance (1), or a custom instance step rate (N).
     */
    divisor?: VertexStepRate;
}

/**
 * Specification for an entire interleaved vertex buffer layout.
 */
export interface VertexLayoutSpec {
    /** Ordered array of attribute specifications comprising the interleaved vertex buffer */
    attributes: AttributeSpec[];

    /** Optional explicit total stride override in bytes. Computed automatically if omitted */
    stride?: number;
}

/**
 * Specification for binding a specific WebGLBuffer within a single or multi-buffer VAO.
 */
export interface VertexBufferBinding {
    /** Target WebGLBuffer to bind to gl.ARRAY_BUFFER */
    vbo: WebGLBuffer;

    /** Layout specification for attributes packed in this buffer (single attribute or interleaved) */
    layout: VertexLayoutSpec;

    /**
     * Optional instancing divisor for all attributes in this buffer (WebGL2).
     * Use VertexStepRate.PerVertex (0), VertexStepRate.PerInstance (1), or a custom instance step rate (N).
     * Can be overridden per attribute via AttributeSpec.divisor.
     */
    divisor?: VertexStepRate;
}

