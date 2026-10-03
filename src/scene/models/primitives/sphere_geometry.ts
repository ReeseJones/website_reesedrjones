import { MeshGeometry } from "../mesh_geometry";
import type { GeometryBufferData } from "../mesh_geometry_types";
import { STANDARD_VERTEX_LAYOUT } from "./standard_layout";
import type { SphereGeometryOptions } from "./primitive_types";

/**
 * Pure generator constructing interleaved vertex attributes and indices
 * for a parametric UV sphere centered at (0, 0, 0).
 */
export function buildSphereBufferData(
    radius: number = 1.0,
    widthSegments: number = 32,
    heightSegments: number = 16
): GeometryBufferData {
    const latBands = Math.max(3, Math.floor(heightSegments));
    const lonBands = Math.max(3, Math.floor(widthSegments));

    const vertexCount = (latBands + 1) * (lonBands + 1);
    // 8 floats per vertex: pos(3), normal(3), uv(2)
    const attributes = new Float32Array(vertexCount * 8);

    let vOffset = 0;

    for (let lat = 0; lat <= latBands; lat++) {
        const v = lat / latBands;
        const phi = v * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let lon = 0; lon <= lonBands; lon++) {
            const u = lon / lonBands;
            const theta = u * (Math.PI * 2.0);
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            const nx = -sinPhi * cosTheta;
            const ny = cosPhi;
            const nz = sinPhi * sinTheta;

            // a_position (vec3)
            attributes[vOffset++] = radius * nx;
            attributes[vOffset++] = radius * ny;
            attributes[vOffset++] = radius * nz;

            // a_normal (vec3)
            attributes[vOffset++] = nx;
            attributes[vOffset++] = ny;
            attributes[vOffset++] = nz;

            // a_uv (vec2)
            attributes[vOffset++] = u;
            attributes[vOffset++] = 1.0 - v;
        }
    }

    const indexList: number[] = [];

    for (let lat = 0; lat < latBands; lat++) {
        for (let lon = 0; lon < lonBands; lon++) {
            const a = lat * (lonBands + 1) + lon;
            const b = (lat + 1) * (lonBands + 1) + lon;
            const c = (lat + 1) * (lonBands + 1) + (lon + 1);
            const d = lat * (lonBands + 1) + (lon + 1);

            if (lat !== 0) {
                indexList.push(a, b, d);
            }
            if (lat !== latBands - 1) {
                indexList.push(b, c, d);
            }
        }
    }

    const indices =
        vertexCount > 65535 ? new Uint32Array(indexList) : new Uint16Array(indexList);

    return {
        attributes,
        layout: STANDARD_VERTEX_LAYOUT,
        vertexCount,
        indices,
    };
}

/**
 * Standard parametric latitude/longitude unit or dimensioned 3D sphere.
 */
export class SphereGeometry extends MeshGeometry {
    public readonly radius: number;
    public readonly widthSegments: number;
    public readonly heightSegments: number;

    constructor(options?: SphereGeometryOptions, id?: string) {
        const radius = options?.radius ?? 1.0;
        const widthSegments = options?.widthSegments ?? (options?.segments ? options.segments * 2 : 32);
        const heightSegments = options?.heightSegments ?? (options?.segments ?? 16);

        super(
            buildSphereBufferData(radius, widthSegments, heightSegments),
            WebGL2RenderingContext.TRIANGLES,
            id
        );

        this.radius = radius;
        this.widthSegments = widthSegments;
        this.heightSegments = heightSegments;
    }
}
