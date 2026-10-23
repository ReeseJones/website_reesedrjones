import type { IMeshGeometry } from "../models/mesh_geometry_types";
import type { Vector3Like } from "../../maths/vector_types";

/**
 * Public interface for polyline ribbon geometry managing screen-space extruded path vertices.
 */
export interface IPolylineGeometry extends IMeshGeometry {
    /** Total number of 3D path waypoints defining the route */
    readonly pointsCount: number;

    /** Total accumulated 3D arc-length distance along the route */
    readonly totalLength: number;

    /**
     * Updates path waypoints, rebuilding vertex and index buffers.
     */
    setPoints(points: readonly Vector3Like[] | Float32Array): this;

    /**
     * Returns a safe semantic copy of the current 3D path waypoints.
     */
    getPoints(): readonly Vector3Like[];
}

/**
 * Initialization options for creating polyline geometry.
 */
export interface PolylineGeometryOptions {
    /** Initial sequence of 3D spatial points */
    points?: readonly Vector3Like[] | Float32Array;
}
