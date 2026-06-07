export interface Vector2 {
    x: number;
    y: number;
}

export function lerp<InVec extends Vector2>(
    a: InVec, 
    b: InVec, 
    t: number
): Vector2;
export function lerp<OutVec extends Vector2>(
    a: Vector2, 
    b: Vector2, 
    t: number, 
    out: OutVec
): OutVec;
export function lerp(
    a: Vector2, 
    b: Vector2, 
    t: number, 
    out?: Vector2
): Vector2 {
    if (out) {
        out.x = a.x + (b.x - a.x) * t;
        out.y = a.y + (b.y - a.y) * t;
        return out;
    }
    
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
    };
}
export function add(
    a: Vector2, 
    b: Vector2, 
): Vector2;
export function add<OutVec extends Vector2>(
    a: Vector2, 
    b: Vector2, 
    out: OutVec
): OutVec;
export function add(
    a: Vector2, 
    b: Vector2, 
    out?: Vector2
): Vector2 {
    if (out) {
        out.x = a.x + b.x;
        out.y = a.y + b.y;
        return out;
    }
    return {
        x: a.x + b.x,
        y: a.y + b.y
    };
}

export function subtract(
    a: Vector2, 
    b: Vector2, 
): Vector2;
export function subtract<OutVec extends Vector2>(
    a: Vector2, 
    b: Vector2, 
    out: OutVec
): OutVec;
export function subtract(
    a: Vector2, 
    b: Vector2, 
    out?: Vector2
): Vector2 {
    if (out) {
        out.x = a.x - b.x;
        out.y = a.y - b.y;
        return out;
    }
    return {
        x: a.x - b.x,
        y: a.y - b.y
    };
}

export function scale(
    a: Vector2,
    b: Vector2,
): Vector2;
export function scale<OutVec extends Vector2>(
    a: Vector2, 
    b: Vector2, 
    out: OutVec
): OutVec;
export function scale(
    a: Vector2, 
    b: Vector2, 
    out?: Vector2
): Vector2 {
    if (out) {
        out.x = a.x * b.x;
        out.y = a.y * b.y;
        return out;
    }
    return {
        x: a.x * b.x,
        y: a.y * b.y
    };
}

export function length(vec: Vector2): number {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

export function normalize(
    a: Vector2,
): Vector2;
export function normalize<OutVec extends Vector2>(
    a: Vector2,
    out: OutVec
): OutVec;
export function normalize(vec: Vector2, out?: Vector2): Vector2 {
    const len = length(vec);
    
    if (out) {
        if (len === 0) {
            out.x = 0;
            out.y = 0;
            return out;
        }
        out.x = vec.x / len;
        out.y = vec.y / len;
        return out;
    }

    if (len === 0) {
        return {
            x: 0,
            y: 0
        };
    }

    return {
        x: vec.x / len,
        y: vec.y / len
    };
}