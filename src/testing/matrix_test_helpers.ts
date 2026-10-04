import { expect } from "vitest";

export interface MatcherResult {
    pass: boolean;
    message: () => string;
    actual?: unknown;
    expected?: unknown;
}

/**
 * Custom Vitest matcher to assert that two matrix (or vector) buffers match in length
 * and each element matches within `numDigits` decimal places.
 *
 * @param received The actual ArrayLike matrix or vector buffer under test.
 * @param expected The expected ArrayLike matrix or vector buffer.
 * @param numDigits Number of fractional digits of precision (defaults to 4).
 */
export function toBeMatrixCloseTo(
    this: { isNot?: boolean } | void,
    received: ArrayLike<number>,
    expected: ArrayLike<number>,
    numDigits: number = 4
): MatcherResult {
    if (!received || typeof (received as { length?: unknown }).length !== "number") {
        return {
            pass: false,
            message: () => `expected received value to be an ArrayLike collection, got ${typeof received}`,
            actual: received,
            expected,
        };
    }
    if (!expected || typeof (expected as { length?: unknown }).length !== "number") {
        return {
            pass: false,
            message: () => `expected target value to be an ArrayLike collection, got ${typeof expected}`,
            actual: received,
            expected,
        };
    }
    if (received.length !== expected.length) {
        return {
            pass: false,
            message: () =>
                `expected matrix length ${expected.length}, but received length ${received.length}`,
            actual: received.length,
            expected: expected.length,
        };
    }

    const tolerance = Math.pow(10, -numDigits) / 2;
    let failureIndex = -1;
    let failureDiff = 0;

    for (let i = 0; i < received.length; i++) {
        const diff = Math.abs(received[i] - expected[i]);
        if (Number.isNaN(received[i]) || Number.isNaN(expected[i]) || diff >= tolerance) {
            failureIndex = i;
            failureDiff = diff;
            break;
        }
    }

    const pass = failureIndex === -1;

    return {
        pass,
        message: () => {
            if (pass) {
                return `expected matrix not to match expected matrix within ${numDigits} decimal places`;
            }
            const is4x4 = received.length === 16;
            const posDesc = is4x4
                ? `index ${failureIndex} (col ${Math.floor(failureIndex / 4)}, row ${failureIndex % 4})`
                : `index ${failureIndex}`;

            return (
                `expected matrix element at ${posDesc} to be close to ${expected[failureIndex]} ` +
                `within ${numDigits} decimal places (tolerance: ${tolerance}), ` +
                `but received ${received[failureIndex]} (diff: ${failureDiff})`
            );
        },
        actual: received,
        expected,
    };
}

/**
 * Functional helper wrapper for suites that prefer function call syntax.
 */
export function expectMatricesToBeClose(
    actual: ArrayLike<number>,
    expected: ArrayLike<number>,
    numDigits: number = 4
): void {
    expect(actual).toBeMatrixCloseTo(expected, numDigits);
}
