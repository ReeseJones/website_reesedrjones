import { MeshGeometry } from "../models/mesh_geometry";
import type { GeometryBufferData } from "../models/mesh_geometry_types";
import type { VertexLayoutSpec } from "../../webgl/geometry/vertex_layout_types";
import { GLDataType, GLPrimitive } from "../../webgl/core/webgl_constants_types";
import type { Vector3Like } from "../../maths/vector_types";
import type { IPolylineGeometry, PolylineGeometryOptions } from "./polyline_geometry_types";
import {
    POLYLINE_STRIDE_BYTES,
    POLYLINE_FLOATS_PER_VERTEX,
    POLYLINE_POSITION_COMPONENTS,
    POLYLINE_SIDE_PROGRESS_COMPONENTS,
    POLYLINE_INDICES_PER_SEGMENT,
    POLYLINE_VERTICES_PER_POINT,
    POLYLINE_SIDE_POSITIVE,
    POLYLINE_SIDE_NEGATIVE,
    MIN_POLYLINE_POINTS,
} from "./polyline_constants";

export const POLYLINE_VERTEX_LAYOUT: VertexLayoutSpec = {
    attributes: [
        {
            nameOrLocation: 0,
            description: "a_current (vec3 float)",
            size: POLYLINE_POSITION_COMPONENTS,
            type: GLDataType.Float,
        },
        {
            nameOrLocation: 1,
            description: "a_previous (vec3 float)",
            size: POLYLINE_POSITION_COMPONENTS,
            type: GLDataType.Float,
        },
        {
            nameOrLocation: 2,
            description: "a_next (vec3 float)",
            size: POLYLINE_POSITION_COMPONENTS,
            type: GLDataType.Float,
        },
        {
            nameOrLocation: 3,
            description: "a_sideAndProgress (vec2 float)",
            size: POLYLINE_SIDE_PROGRESS_COMPONENTS,
            type: GLDataType.Float,
        },
    ],
    stride: POLYLINE_STRIDE_BYTES,
};

const UINT16_MAX_VERTICES = 65535;
const COORD_COMPONENTS = 3;

interface ExtractedPoints {
    px: Float32Array;
    py: Float32Array;
    pz: Float32Array;
    count: number;
}

function extractCoordinates(points: readonly Vector3Like[] | Float32Array): ExtractedPoints {
    if (points instanceof Float32Array) {
        const count = Math.floor(points.length / COORD_COMPONENTS);
        const px = new Float32Array(count);
        const py = new Float32Array(count);
        const pz = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const base = i * COORD_COMPONENTS;
            px[i] = points[base];
            py[i] = points[base + 1];
            pz[i] = points[base + 2];
        }

        return { px, py, pz, count };
    }

    const count = points.length;
    const px = new Float32Array(count);
    const py = new Float32Array(count);
    const pz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const pt = points[i];
        px[i] = pt.x;
        py[i] = pt.y;
        pz[i] = pt.z;
    }

    return { px, py, pz, count };
}

/**
 * Builds interleaved CPU buffer data for screen-space extruded polyline ribbons.
 */
export function buildPolylineRibbonBufferData(
    points: readonly Vector3Like[] | Float32Array
): { bufferData: GeometryBufferData; totalLength: number } {
    const { px, py, pz, count: n } = extractCoordinates(points);

    if (n < MIN_POLYLINE_POINTS) {
        return {
            bufferData: {
                attributes: new Float32Array(0),
                layout: POLYLINE_VERTEX_LAYOUT,
                vertexCount: 0,
                indices: new Uint16Array(0),
            },
            totalLength: 0,
        };
    }

    // 1. Calculate cumulative arc-length distances
    const cumulativeDistances = new Float32Array(n);
    cumulativeDistances[0] = 0.0;
    for (let i = 1; i < n; i++) {
        const dx = px[i] - px[i - 1];
        const dy = py[i] - py[i - 1];
        const dz = pz[i] - pz[i - 1];
        cumulativeDistances[i] = cumulativeDistances[i - 1] + Math.hypot(dx, dy, dz);
    }
    const totalLength = cumulativeDistances[n - 1];

    // 2. Extrapolate phantom endpoints P_{-1} and P_N
    const pPrev0X = 2.0 * px[0] - px[1];
    const pPrev0Y = 2.0 * py[0] - py[1];
    const pPrev0Z = 2.0 * pz[0] - pz[1];

    const pNextLastX = 2.0 * px[n - 1] - px[n - 2];
    const pNextLastY = 2.0 * py[n - 1] - py[n - 2];
    const pNextLastZ = 2.0 * pz[n - 1] - pz[n - 2];

    // 3. Allocate interleaved vertex attributes
    const vertexCount = n * POLYLINE_VERTICES_PER_POINT;
    const attributes = new Float32Array(vertexCount * POLYLINE_FLOATS_PER_VERTEX);

    for (let i = 0; i < n; i++) {
        const currX = px[i];
        const currY = py[i];
        const currZ = pz[i];

        const prevX = i === 0 ? pPrev0X : px[i - 1];
        const prevY = i === 0 ? pPrev0Y : py[i - 1];
        const prevZ = i === 0 ? pPrev0Z : pz[i - 1];

        const nextX = i === n - 1 ? pNextLastX : px[i + 1];
        const nextY = i === n - 1 ? pNextLastY : py[i + 1];
        const nextZ = i === n - 1 ? pNextLastZ : pz[i + 1];

        const progress = cumulativeDistances[i];

        // Vertex 2i: positive extrusion (+1.0)
        const offsetTop = (i * POLYLINE_VERTICES_PER_POINT) * POLYLINE_FLOATS_PER_VERTEX;
        attributes[offsetTop + 0] = currX;
        attributes[offsetTop + 1] = currY;
        attributes[offsetTop + 2] = currZ;
        attributes[offsetTop + 3] = prevX;
        attributes[offsetTop + 4] = prevY;
        attributes[offsetTop + 5] = prevZ;
        attributes[offsetTop + 6] = nextX;
        attributes[offsetTop + 7] = nextY;
        attributes[offsetTop + 8] = nextZ;
        attributes[offsetTop + 9] = POLYLINE_SIDE_POSITIVE;
        attributes[offsetTop + 10] = progress;

        // Vertex 2i + 1: negative extrusion (-1.0)
        const offsetBottom = (i * POLYLINE_VERTICES_PER_POINT + 1) * POLYLINE_FLOATS_PER_VERTEX;
        attributes[offsetBottom + 0] = currX;
        attributes[offsetBottom + 1] = currY;
        attributes[offsetBottom + 2] = currZ;
        attributes[offsetBottom + 3] = prevX;
        attributes[offsetBottom + 4] = prevY;
        attributes[offsetBottom + 5] = prevZ;
        attributes[offsetBottom + 6] = nextX;
        attributes[offsetBottom + 7] = nextY;
        attributes[offsetBottom + 8] = nextZ;
        attributes[offsetBottom + 9] = POLYLINE_SIDE_NEGATIVE;
        attributes[offsetBottom + 10] = progress;
    }

    // 4. Generate indexed quad segment indices
    const segmentCount = n - 1;
    const indexCount = segmentCount * POLYLINE_INDICES_PER_SEGMENT;
    const indices =
        vertexCount > UINT16_MAX_VERTICES
            ? new Uint32Array(indexCount)
            : new Uint16Array(indexCount);

    for (let i = 0; i < segmentCount; i++) {
        const v0 = i * POLYLINE_VERTICES_PER_POINT;
        const v1 = v0 + 1;
        const v2 = v0 + 2;
        const v3 = v0 + 3;

        const idxOffset = i * POLYLINE_INDICES_PER_SEGMENT;
        // Triangle 1
        indices[idxOffset + 0] = v0;
        indices[idxOffset + 1] = v1;
        indices[idxOffset + 2] = v2;
        // Triangle 2
        indices[idxOffset + 3] = v2;
        indices[idxOffset + 4] = v1;
        indices[idxOffset + 5] = v3;
    }

    return {
        bufferData: {
            attributes,
            layout: POLYLINE_VERTEX_LAYOUT,
            vertexCount,
            indices,
        },
        totalLength,
    };
}

/**
 * Concrete geometry class for polyline ribbons, handling dynamic waypoint updates
 * and GPU buffer invalidation.
 */
export class PolylineGeometry extends MeshGeometry implements IPolylineGeometry {
    private _pointsCount: number = 0;
    private _totalLength: number = 0;
    private _rawPoints: Float32Array = new Float32Array(0);

    constructor(options?: PolylineGeometryOptions, id?: string) {
        const initialPoints = options?.points ?? new Float32Array(0);
        const { bufferData, totalLength } = buildPolylineRibbonBufferData(initialPoints);

        super(bufferData, GLPrimitive.Triangles, id);

        this._storePoints(initialPoints);
        this._totalLength = totalLength;
    }

    public get pointsCount(): number {
        return this._pointsCount;
    }

    public get totalLength(): number {
        return this._totalLength;
    }

    /**
     * Stores incoming points in contiguous Float32Array storage.
     */
    private _storePoints(points: readonly Vector3Like[] | Float32Array): void {
        const { px, py, pz, count } = extractCoordinates(points);
        this._pointsCount = count;
        this._rawPoints = new Float32Array(count * COORD_COMPONENTS);

        for (let i = 0; i < count; i++) {
            const base = i * COORD_COMPONENTS;
            this._rawPoints[base] = px[i];
            this._rawPoints[base + 1] = py[i];
            this._rawPoints[base + 2] = pz[i];
        }
    }

    /**
     * Updates path waypoints, rebuilding vertex and index buffers and incrementing the geometry version.
     */
    public setPoints(points: readonly Vector3Like[] | Float32Array): this {
        this._storePoints(points);
        const { bufferData, totalLength } = buildPolylineRibbonBufferData(points);
        this._totalLength = totalLength;

        this.setAttributes(bufferData.attributes, bufferData.vertexCount);
        this.setIndices(bufferData.indices);

        return this;
    }

    /**
     * Returns a safe semantic copy of the current 3D path waypoints.
     */
    public getPoints(): readonly Vector3Like[] {
        const result: Vector3Like[] = new Array(this._pointsCount);
        for (let i = 0; i < this._pointsCount; i++) {
            const base = i * COORD_COMPONENTS;
            result[i] = {
                x: this._rawPoints[base],
                y: this._rawPoints[base + 1],
                z: this._rawPoints[base + 2],
            };
        }
        return result;
    }
}
