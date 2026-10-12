export interface Vector2Like {
    x: number;
    y: number;
}

export type ReadonlyVector2Like = Readonly<Vector2Like>;

/**
 * Backward compatibility alias for Vector2Like
 */
export type Vector2 = Vector2Like;

export interface Vector3Like {
    x: number;
    y: number;
    z: number;
}

export type ReadonlyVector3Like = Readonly<Vector3Like>;
