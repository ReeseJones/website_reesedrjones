/**
 * Semantic RGB color object with normalized channel values in range [0, 1].
 */
export interface RgbLike {
    r: number;
    g: number;
    b: number;
}

export type ReadonlyRgbLike = Readonly<RgbLike>;

/**
 * Semantic RGBA color object with normalized channel values in range [0, 1].
 */
export interface RgbaLike {
    r: number;
    g: number;
    b: number;
    a: number;
}

export type ReadonlyRgbaLike = Readonly<RgbaLike>;

/**
 * Normalized 3-element RGB tuple with values in range [0, 1].
 */
export type NormalizedRgbTuple = readonly [number, number, number];

/**
 * Normalized 4-element RGBA tuple with values in range [0, 1].
 */
export type NormalizedRgbaTuple = readonly [number, number, number, number];
