/**
 * Random distribution utilities and sampling algorithms.
 */

/**
 * Generates a normally distributed pseudo-random number using the Box-Muller transform.
 *
 * @param mean The central expectation (mean) of the distribution (defaults to 0).
 * @param stdDev The standard deviation of the distribution (defaults to 1).
 * @returns A pseudo-random number following N(mean, stdDev^2).
 */
export function randomGaussian(mean = 0, stdDev = 1): number {
    let u1 = Math.random();
    let u2 = Math.random();
    // Guard against u1 being zero to prevent Math.log(0) resulting in -Infinity
    while (u1 <= 1e-12) {
        u1 = Math.random();
    }
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
}

/**
 * Generates a pseudo-random floating-point number within a specified range [min, max).
 *
 * @param min The lower bound (inclusive).
 * @param max The upper bound (exclusive).
 * @returns A pseudo-random floating-point number between min and max.
 */
export function randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}
