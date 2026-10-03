import type { Vector2Like, Vector3Like, Vector2 } from "./vector_types";

export type { Vector2Like, Vector3Like, Vector2 };

export function isVector3Like(v: unknown): v is Vector3Like {
    return typeof v === "object" && v !== null && "x" in v && "y" in v && "z" in v;
}

/**
 * Creates a new 3D vector with the given coordinates.
 */
export function create(x: number = 0, y: number = 0, z: number = 0): Vector3Like {
    return { x, y, z };
}

/**
 * Explicit helper for creating a 3D vector.
 */
export function createVector3(x: number = 0, y: number = 0, z: number = 0): Vector3Like {
    return { x, y, z };
}

/**
 * Explicit helper for creating a 2D vector.
 */
export function createVector2(x: number = 0, y: number = 0): Vector2Like {
    return { x, y };
}

/**
 * Packs a Vector3Like into a Float32Array.
 */
export function vector3ToFloat32Array(v: Vector3Like, out: Float32Array = new Float32Array(3), offset: number = 0): Float32Array {
    out[offset] = v.x;
    out[offset + 1] = v.y;
    out[offset + 2] = v.z;
    return out;
}

/**
 * Reads a Vector3Like from a Float32Array or array-like number buffer.
 */
export function vector3FromFloat32Array(
    arr: ArrayLike<number>,
    offset: number = 0,
    out?: Vector3Like
): Vector3Like {
    if (out) {
        out.x = arr[offset] ?? 0;
        out.y = arr[offset + 1] ?? 0;
        out.z = arr[offset + 2] ?? 0;
        return out;
    }
    return {
        x: arr[offset] ?? 0,
        y: arr[offset + 1] ?? 0,
        z: arr[offset + 2] ?? 0
    };
}

export function lerp<InVec extends Vector2Like>(a: InVec, b: InVec, t: number): InVec;
export function lerp<OutVec extends Vector2Like>(a: Vector2Like, b: Vector2Like, t: number, out: OutVec): OutVec;
export function lerp(a: Vector3Like, b: Vector3Like, t: number): Vector3Like;
export function lerp<OutVec extends Vector3Like>(a: Vector3Like, b: Vector3Like, t: number, out: OutVec): OutVec;
export function lerp(
    a: Vector2Like | Vector3Like,
    b: Vector2Like | Vector3Like,
    t: number,
    out?: Vector2Like | Vector3Like
): Vector2Like | Vector3Like {
    const is3D = isVector3Like(a) && isVector3Like(b);
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;

    if (is3D) {
        const az = a.z;
        const bz = b.z;
        const z = az + (bz - az) * t;
        if (out) {
            out.x = x;
            out.y = y;
            (out as Vector3Like).z = z;
            return out;
        }
        return { x, y, z };
    }

    if (out) {
        out.x = x;
        out.y = y;
        return out;
    }
    return { x, y };
}

export function add(a: Vector2Like, b: Vector2Like): Vector2Like;
export function add<OutVec extends Vector2Like>(a: Vector2Like, b: Vector2Like, out: OutVec): OutVec;
export function add(a: Vector3Like, b: Vector3Like): Vector3Like;
export function add<OutVec extends Vector3Like>(a: Vector3Like, b: Vector3Like, out: OutVec): OutVec;
export function add(
    a: Vector2Like | Vector3Like,
    b: Vector2Like | Vector3Like,
    out?: Vector2Like | Vector3Like
): Vector2Like | Vector3Like {
    const is3D = isVector3Like(a) && isVector3Like(b);
    const x = a.x + b.x;
    const y = a.y + b.y;

    if (is3D) {
        const z = a.z + b.z;
        if (out) {
            out.x = x;
            out.y = y;
            (out as Vector3Like).z = z;
            return out;
        }
        return { x, y, z };
    }

    if (out) {
        out.x = x;
        out.y = y;
        return out;
    }
    return { x, y };
}

export function subtract(a: Vector2Like, b: Vector2Like): Vector2Like;
export function subtract<OutVec extends Vector2Like>(a: Vector2Like, b: Vector2Like, out: OutVec): OutVec;
export function subtract(a: Vector3Like, b: Vector3Like): Vector3Like;
export function subtract<OutVec extends Vector3Like>(a: Vector3Like, b: Vector3Like, out: OutVec): OutVec;
export function subtract(
    a: Vector2Like | Vector3Like,
    b: Vector2Like | Vector3Like,
    out?: Vector2Like | Vector3Like
): Vector2Like | Vector3Like {
    const is3D = isVector3Like(a) && isVector3Like(b);
    const x = a.x - b.x;
    const y = a.y - b.y;

    if (is3D) {
        const z = a.z - b.z;
        if (out) {
            out.x = x;
            out.y = y;
            (out as Vector3Like).z = z;
            return out;
        }
        return { x, y, z };
    }

    if (out) {
        out.x = x;
        out.y = y;
        return out;
    }
    return { x, y };
}

export function scale(a: Vector2Like, b: Vector2Like | number): Vector2Like;
export function scale<OutVec extends Vector2Like>(a: Vector2Like, b: Vector2Like | number, out: OutVec): OutVec;
export function scale(a: Vector3Like, b: Vector3Like | number): Vector3Like;
export function scale<OutVec extends Vector3Like>(a: Vector3Like, b: Vector3Like | number, out: OutVec): OutVec;
export function scale(
    a: Vector2Like | Vector3Like,
    b: Vector2Like | Vector3Like | number,
    out?: Vector2Like | Vector3Like
): Vector2Like | Vector3Like {
    const is3D = isVector3Like(a);
    const bx = typeof b === "number" ? b : b.x;
    const by = typeof b === "number" ? b : b.y;
    const bz = typeof b === "number" ? b : (isVector3Like(b) ? b.z : 1);

    const x = a.x * bx;
    const y = a.y * by;

    if (is3D) {
        const z = a.z * bz;
        if (out) {
            out.x = x;
            out.y = y;
            (out as Vector3Like).z = z;
            return out;
        }
        return { x, y, z };
    }

    if (out) {
        out.x = x;
        out.y = y;
        return out;
    }
    return { x, y };
}

export function length(vec: Vector2Like | Vector3Like): number {
    if (isVector3Like(vec)) {
        return Math.hypot(vec.x, vec.y, vec.z);
    }
    return Math.hypot(vec.x, vec.y);
}

export function distance(a: Vector3Like, b: Vector3Like): number;
export function distance(a: Vector2Like, b: Vector2Like): number;
export function distance(a: Vector2Like | Vector3Like, b: Vector2Like | Vector3Like): number {
    if (isVector3Like(a) && isVector3Like(b)) {
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dot(a: Vector3Like, b: Vector3Like): number;
export function dot(a: Vector2Like, b: Vector2Like): number;
export function dot(a: Vector2Like | Vector3Like, b: Vector2Like | Vector3Like): number {
    if (isVector3Like(a) && isVector3Like(b)) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
    return a.x * b.x + a.y * b.y;
}

export function cross(a: Vector3Like, b: Vector3Like, out?: Vector3Like): Vector3Like {
    const x = a.y * b.z - a.z * b.y;
    const y = a.z * b.x - a.x * b.z;
    const z = a.x * b.y - a.y * b.x;

    if (out) {
        out.x = x;
        out.y = y;
        out.z = z;
        return out;
    }

    return { x, y, z };
}

export function normalize(a: Vector2Like): Vector2Like;
export function normalize<OutVec extends Vector2Like>(a: Vector2Like, out: OutVec): OutVec;
export function normalize(a: Vector3Like): Vector3Like;
export function normalize<OutVec extends Vector3Like>(a: Vector3Like, out: OutVec): OutVec;
export function normalize(
    vec: Vector2Like | Vector3Like,
    out?: Vector2Like | Vector3Like
): Vector2Like | Vector3Like {
    const is3D = isVector3Like(vec);
    const len = length(vec);

    if (is3D) {
        if (len === 0) {
            if (out) {
                out.x = 0;
                out.y = 0;
                (out as Vector3Like).z = 0;
                return out;
            }
            return { x: 0, y: 0, z: 0 };
        }
        const invLen = 1 / len;
        const x = vec.x * invLen;
        const y = vec.y * invLen;
        const z = vec.z * invLen;

        if (out) {
            out.x = x;
            out.y = y;
            (out as Vector3Like).z = z;
            return out;
        }
        return { x, y, z };
    }

    if (len === 0) {
        if (out) {
            out.x = 0;
            out.y = 0;
            return out;
        }
        return { x: 0, y: 0 };
    }

    const invLen = 1 / len;
    const x = vec.x * invLen;
    const y = vec.y * invLen;

    if (out) {
        out.x = x;
        out.y = y;
        return out;
    }
    return { x, y };
}