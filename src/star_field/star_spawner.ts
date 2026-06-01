import { Particle } from "./particle";
import { clamp, lerp, randomNumber } from "../lib/helpers";
import { length, subtract } from "../lib/point_math";
import { PointData } from "pixi.js";

export interface IPoint {
    x: number;
    y: number;
}

export interface IBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function createStar(
    position: IPoint,
    depth: number,
    minScale: number,
    maxScale: number
): Particle {
    return {
        particle: null,
        position,
        direction: randomNumber(0, 2 * Math.PI),
        directionSpeed: randomNumber(-Math.PI / 8, Math.PI / 8),
        depth,
        scale: randomNumber(minScale, maxScale),
        neighbors: [],
        arcAngle: (Math.random() > 0.5 ? 1 : -1) * randomNumber(0.4, 1),
        arcLength: randomNumber(60, 100),
        parent: null,
        driftDirection: randomNumber(0, Math.PI * 2),
        driftMagnitude: randomNumber(20, 60)
    };
}

export function createStarHelper(
    depth: number,
    maxDepth: number,
    bounds: IBounds,
    minScale: number,
    maxScale: number
) {
    const depthProgress = depth / maxDepth;
    const newPos = {
        x: randomNumber(bounds.x, bounds.width),
        y: randomNumber(bounds.y, bounds.height)
    };
    const starMaxScale = lerp(maxScale, minScale, depthProgress);
    const starMinScale = clamp(starMaxScale - 0.2, minScale, maxScale);
    return createStar(newPos, depth, starMinScale, starMaxScale);
}

export function spawnStars(
    bounds: IBounds,
    count: number,
    minScale: number,
    maxScale: number,
    minEdges: number,
    maxEdges: number,
    maxDepth: number
) {
    const rootStars: Particle[] = [];
    const starQueue: Particle[] = [];
    const stars: Particle[] = [];
    const rootStarCount = count;
    let currentStarCount = 0;

    //spawn root stars
    for (let i = 0; i < rootStarCount; i += 1) {
        const newStar = createStarHelper(
            0,
            maxDepth,
            bounds,
            minScale,
            maxScale
        );
        rootStars.push(newStar);
        stars.push(newStar);
        starQueue.push(newStar);
        currentStarCount += 1;
    }

    while (currentStarCount < 10000 && starQueue.length) {
        const currentStar = starQueue.pop();
        if (!currentStar || currentStar.depth === maxDepth) continue;
        const depthProgress = currentStar.depth / maxDepth;
        const childrenCount = Math.round(
            lerp(minEdges, maxEdges, depthProgress * depthProgress)
        );

        for (let i = 0; i < childrenCount; i += 1) {
            const childStar = createStarHelper(
                currentStar.depth + 1,
                maxDepth,
                bounds,
                minScale,
                maxScale
            );
            setStarPosition(currentStar, childStar, i, {
                x: 1920 / 2,
                y: 1080 / 2
            });
            currentStar.neighbors.push(childStar);
            starQueue.push(childStar);
            stars.push(childStar);
            currentStarCount += 1;
        }
    }

    return { rootStars, stars };
}

export function setStarPosition(
    parent: Particle,
    child: Particle,
    childIndex: number,
    worldCenter: PointData
) {
    child.parent = parent;
    child.arcAngle = parent.arcAngle;
    child.arcLength = parent.arcLength;
    child.driftDirection = parent.driftDirection;
    child.driftMagnitude = parent.driftMagnitude;

    const angle = parent.arcAngle * (childIndex + 1) * child.depth;
    const dist = parent.arcLength;
    const diff = subtract(worldCenter, parent.position);
    const driftLength = length(diff);
    const xDrift = (diff.x / driftLength) * parent.driftMagnitude;
    const yDrift = (diff.y / driftLength) * parent.driftMagnitude;

    child.position.x = parent.position.x + Math.cos(angle) * dist + xDrift;
    child.position.y = parent.position.y + Math.sin(angle) * dist + yDrift;
}
