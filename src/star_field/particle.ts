import {PointData, Sprite, Particle as PixiParticle} from "pixi.js";

export interface Particle {
    particle: PixiParticle | null;
    position: PointData;
    direction: number;
    directionSpeed: number;
    depth: number;
    scale: number;
    neighbors: Particle[];
    arcAngle: number;
    arcLength: number;
    driftDirection: number;
    driftMagnitude: number;
    parent: Particle | null;
}
