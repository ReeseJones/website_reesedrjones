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

/**
 * Computes the total vertex stride in bytes for a given layout specification.
 */
export function computeLayoutStride(layout: VertexLayoutSpec): number {
    if (layout.stride !== undefined) {
        return layout.stride;
    }
    return layout.attributes.reduce((sum, attr) => {
        const bytesPerComp = attr.componentBytes ?? Float32Array.BYTES_PER_ELEMENT;
        return sum + attr.size * bytesPerComp;
    }, 0);
}

/**
 * Configures a WebGL Vertex Array Object (VAO) using a declarative layout specification.
 * Binds the VAO and VBO, computes stride and cumulative byte offsets, enables attribute locations,
 * and sets up vertex attribute pointers.
 *
 * @param gl WebGL2 rendering context
 * @param vao Target WebGLVertexArrayObject
 * @param vbo Target WebGLBuffer containing vertex data
 * @param layout Declarative layout specification
 * @param program Optional WebGLProgram required if attributes use string names instead of numeric location indices
 */
export function configureVAO(
    gl: WebGL2RenderingContext,
    vao: WebGLVertexArrayObject,
    vbo: WebGLBuffer,
    layout: VertexLayoutSpec,
    program?: WebGLProgram
): void {
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    const stride = computeLayoutStride(layout);
    let currentOffset = 0;

    for (const attr of layout.attributes) {
        const bytesPerComp = attr.componentBytes ?? Float32Array.BYTES_PER_ELEMENT;
        const attrType = attr.type ?? gl.FLOAT;
        const normalized = attr.normalized ?? false;

        let loc: number;
        if (typeof attr.nameOrLocation === "number") {
            loc = attr.nameOrLocation;
        } else if (program) {
            loc = gl.getAttribLocation(program, attr.nameOrLocation);
        } else {
            console.warn(
                `configureVAO: Shader program required to resolve attribute name '${attr.nameOrLocation}'`
            );
            currentOffset += attr.size * bytesPerComp;
            continue;
        }

        if (loc !== -1) {
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(
                loc,
                attr.size,
                attrType,
                normalized,
                stride,
                currentOffset
            );
        } else {
            console.warn(
                `configureVAO: Attribute '${attr.nameOrLocation}' not active in shader program`
            );
        }

        currentOffset += attr.size * bytesPerComp;
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}
