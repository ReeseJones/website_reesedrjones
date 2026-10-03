/**
 * Configuration options for generating unit or scaled CubeGeometry.
 */
export interface CubeGeometryOptions {
    /** Dimension along the X-axis (defaults to 1.0) */
    width?: number;
    /** Dimension along the Y-axis (defaults to 1.0) */
    height?: number;
    /** Dimension along the Z-axis (defaults to 1.0) */
    depth?: number;
}

/**
 * Configuration options for generating parametric SphereGeometry.
 */
export interface SphereGeometryOptions {
    /** Radius of the sphere (defaults to 1.0) */
    radius?: number;
    /** Number of horizontal segments / slices along longitude (defaults to 32) */
    widthSegments?: number;
    /** Number of vertical segments / stacks along latitude (defaults to 16) */
    heightSegments?: number;
    /** Shorthand to set both widthSegments (segments * 2) and heightSegments (segments) */
    segments?: number;
}

/**
 * Configuration options for generating QuadGeometry in the XY plane.
 */
export interface QuadGeometryOptions {
    /** Dimension along the X-axis (defaults to 1.0) */
    width?: number;
    /** Dimension along the Y-axis (defaults to 1.0) */
    height?: number;
}
