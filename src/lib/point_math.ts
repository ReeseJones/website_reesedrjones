import { PointData, PI_2 } from "pixi.js";

export function subtract<T extends PointData>(p1: T, p2: T): PointData {
    return {
        x: p1.x - p2.x,
        y: p1.y - p2.y
    };
}

export function add<T extends PointData>(p1: T, p2: T): PointData {
    return {
        x: p1.x + p2.x,
        y: p1.y + p2.y
    };
}

export function length<T extends PointData>(p1: T): number {
    return Math.sqrt(p1.x * p1.x + p1.y * p1.y);
}

export function direction<T extends PointData>(p1: T): number {
    return Math.acos(p1.x / length(p1));
}

export function normalized<T extends PointData>(p1: T): PointData {
    const p1Length = length(p1);
    return {
        x: p1.x / p1Length,
        y: p1.y / p1Length
    };
}

export function average<T extends PointData>(p1: T, p2: T): PointData {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
    };
}
