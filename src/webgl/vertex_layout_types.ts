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

    /** WebGL data type enum (e.g. gl.FLOAT, gl.UNSIGNED_BYTE). Defaults to gl.FLOAT */
    type?: number;

    /** Byte size per component (e.g. 4 for Float32Array). Defaults to Float32Array.BYTES_PER_ELEMENT */
    componentBytes?: number;

    /** Whether fixed-point data values should be normalized. Defaults to false */
    normalized?: boolean;
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
