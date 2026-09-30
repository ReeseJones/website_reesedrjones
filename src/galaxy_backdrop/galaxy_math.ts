import { GalaxyParameters } from "./galaxy_parameters";

export function createMat4(): Float32Array {
    const out = new Float32Array(16);
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
}

export function mat4Identity(out: Float32Array): Float32Array {
    for (let i = 0; i < 16; i++) {
        out[i] = i % 5 === 0 ? 1 : 0;
    }
    return out;
}

export function mat4Perspective(
    out: Float32Array,
    fovDegrees: number,
    aspect: number,
    near: number,
    far: number
): Float32Array {
    const fovRad = (fovDegrees * Math.PI) / 180;
    const f = 1.0 / Math.tan(fovRad / 2);
    const nf = 1 / (near - far);

    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;

    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;

    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;

    out[12] = 0;
    out[13] = 0;
    out[14] = 2 * far * near * nf;
    out[15] = 0;

    return out;
}

export function mat4Multiply(
    out: Float32Array,
    a: Float32Array,
    b: Float32Array
): Float32Array {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    return out;
}

export function mat4RotateX(out: Float32Array, a: Float32Array, rad: number): Float32Array {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];

    if (a !== out) {
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
    }

    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
}

export function mat4RotateY(out: Float32Array, a: Float32Array, rad: number): Float32Array {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];

    if (a !== out) {
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
    }

    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
}

export function mat4RotateZ(out: Float32Array, a: Float32Array, rad: number): Float32Array {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];

    if (a !== out) {
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
    }

    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
}

export function mat4Translate(
    out: Float32Array,
    a: Float32Array,
    x: number,
    y: number,
    z: number
): Float32Array {
    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    }
    return out;
}

/**
 * Standard Box-Muller transformation for normal distribution.
 */
export function randomGaussian(mean = 0, stdDev = 1): number {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 <= 1e-12) u1 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
}

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
