import type { AttributeSpec, VertexLayoutSpec } from "./vertex_layout_types";

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

/**
 * Dynamically parses GLSL vertex shader source code to generate a VertexLayoutSpec.
 * Scans for `layout(location = N) in <type> <name>;` declarations.
 */
export function parseVertexLayoutFromGLSL(vertSource: string): VertexLayoutSpec {
    const attributeRegex = /layout\s*\(\s*location\s*=\s*(\d+)\s*\)\s*in\s+(\w+)\s+(\w+)\s*;/g;
    const attributes: AttributeSpec[] = [];
    let match: RegExpExecArray | null;

    while ((match = attributeRegex.exec(vertSource)) !== null) {
        const location = parseInt(match[1], 10);
        const glslType = match[2];
        const name = match[3];

        let size = 1;
        if (glslType === "vec2") size = 2;
        else if (glslType === "vec3") size = 3;
        else if (glslType === "vec4") size = 4;

        attributes.push({
            nameOrLocation: location,
            description: `${name} (${glslType})`,
            size,
        });
    }

    return { attributes };
}

