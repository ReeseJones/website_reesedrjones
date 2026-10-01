import { GalaxyParameters } from "./parameters/types";
import { randomGaussian } from "../maths/random";

/**
 * Populates a single contiguous Float32Array with 6 attributes per star:
 * [radius, baseAngle, zOffset, size, spectralType, driftPhase]
 */
export function generateStarBuffer(params: GalaxyParameters): Float32Array {
    const {
        starCount,
        armCount,
        armWinding,
        armDispersion,
        spurFrequency,
        coreRadius,
        diskRadius,
        diskThickness,
        coreDensityRatio,
    } = params;

    const buffer = new Float32Array(starCount * 6);
    const coreStarCount = Math.floor(starCount * coreDensityRatio);
    const diskStarCount = starCount - coreStarCount;

    let offset = 0;

    // 1. Blazing Nuclear Core & Bulge
    for (let i = 0; i < coreStarCount; i++) {
        // High density exponential falloff concentrated at r = 0
        const u = Math.random();
        const r = -coreRadius * 0.45 * Math.log(1.0 - u * 0.995);
        const theta = Math.random() * Math.PI * 2.0;

        // Spherical-ellipsoidal core distribution
        const z = randomGaussian(0, diskThickness * 0.45 * Math.max(0.2, 1.0 - r / coreRadius));

        // Core star size: delicate pin-pricks in the core to avoid clumping
        const sizeRand = Math.random();
        const size = sizeRand > 0.96 ? 1.5 : sizeRand > 0.75 ? 1.1 : 0.8;

        // Spectral Type: 0.0 - 0.2 represents golden-amber to blazing white
        const spectralType = (r / (coreRadius * 1.5)) * 0.25 + Math.random() * 0.1;
        const driftPhase = Math.random() * Math.PI * 2.0;

        buffer[offset++] = r;
        buffer[offset++] = theta;
        buffer[offset++] = z;
        buffer[offset++] = size;
        buffer[offset++] = spectralType;
        buffer[offset++] = driftPhase;
    }

    // 2. Spiral Arms & Interstellar Clouds
    for (let i = 0; i < diskStarCount; i++) {
        // Power-curve radial distribution: stars span from core boundary to outer disk
        const u = Math.random();
        const rNorm = Math.pow(u, 0.72); // Slightly higher density towards the interior
        const r = coreRadius * 0.5 + rNorm * (diskRadius - coreRadius * 0.5);

        // Milky Way arm selection with spurs
        const isSpur = Math.random() < spurFrequency;
        const armIndex = Math.floor(Math.random() * armCount);
        const armBaseAngle = (armIndex * (Math.PI * 2.0)) / armCount;

        // Logarithmic spiral angle theta(r) = theta_0 + (1 / b) * ln(r / r_0)
        let spiralAngle = armBaseAngle + (1.0 / armWinding) * Math.log(Math.max(0.1, r / coreRadius));

        if (isSpur) {
            // Spurs branch off at intermediate angles like the Orion or Carina-Sagittarius arms
            spiralAngle += (Math.random() - 0.5) * 1.2;
        }

        // Gaussian dispersion perpendicular to the arm spine
        const dispersion = armDispersion * (0.6 + 0.4 * (r / diskRadius));
        const thetaOffset = randomGaussian(0, dispersion);
        const theta = spiralAngle + thetaOffset;

        // Flared disc thickness: outer edge has larger vertical spread
        const zSpread = diskThickness * (0.35 + 0.65 * (r / diskRadius));
        const z = randomGaussian(0, zSpread);

        // Intrinsic star size
        const sizeRand = Math.random();
        const size = sizeRand > 0.985 ? 3.0 : sizeRand > 0.88 ? 1.8 : 0.9;

        // Spectral population mapping:
        // 0.3 - 0.55: Electric cyan
        // 0.55 - 0.80: Cobalt blue
        // 0.80 - 1.0: Deep interstellar violet accents
        let spectralType: number;
        const radialRatio = r / diskRadius;
        const accentRand = Math.random();

        if (accentRand > 0.82) {
            // Violet dust cloud accent
            spectralType = 0.82 + Math.random() * 0.18;
        } else if (radialRatio < 0.45) {
            // Inner arms: bright cyan
            spectralType = 0.32 + Math.random() * 0.22;
        } else {
            // Outer arms: cobalt blue
            spectralType = 0.55 + Math.random() * 0.27;
        }

        const driftPhase = Math.random() * Math.PI * 2.0;

        buffer[offset++] = r;
        buffer[offset++] = theta;
        buffer[offset++] = z;
        buffer[offset++] = size;
        buffer[offset++] = spectralType;
        buffer[offset++] = driftPhase;
    }

    return buffer;
}
