export function lerp(a: number, b: number, t: number) {
    return (1 - t) * a + t * b;
}

export function clamp(val: number, min: number, max: number) {
    return Math.min(Math.max(val, min), max);
}

export function randomNumber(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomColor() {
    const colorIndex = [0, 1, 2];
    const fullIndex = randomInt(0, 2);
    const secondIndex = Math.round(Math.random());

    const fullSaturationIndex = colorIndex[fullIndex];
    colorIndex.splice(fullIndex, 1);
    const midSaturationIndex = (
        secondIndex ? colorIndex.pop() : colorIndex.shift()
    ) as number;

    let finalColor = 0;
    finalColor = finalColor | (0xff << (fullSaturationIndex * 8));
    finalColor =
        finalColor | (randomInt(0x40, 0xff) << (midSaturationIndex * 8));

    return finalColor;
}

export function makeColor(r: number, g: number, b: number) {
    return ((r * 0xff) << 16) | ((g * 0xff) << 8) | (b * 0xff);
}

export function getRandomIndices(start: number, end: number, count: number) {
    const set = new Set<number>();

    count = Math.min(end - start, count);

    const chosenIndices: number[] = [];

    for (let i = 0; i < count; i += 1) {
        let index = 0;

        do {
            index = randomInt(start, end);
        } while (set.has(index));

        chosenIndices.push(index);
        set.add(index);
    }

    return chosenIndices;
}

/**
 * Validates that an index is an integer within bounds for a given collection or length.
 * Throws a RangeError if the index is out of bounds or not an integer.
 *
 * @param index - The candidate index to validate.
 * @param lengthOrCollection - The collection length as a number, or any object with a length property.
 * @param name - Optional identifier/context for the error message (defaults to "Index").
 * @returns The validated index.
 * @throws {RangeError} If index is not an integer or is outside [0, count - 1] (or non-zero when count is 0).
 */
export function validateIndex(
    index: number,
    lengthOrCollection: number | { length: number },
    name: string = "Index"
): number {
    const count =
        typeof lengthOrCollection === "number"
            ? lengthOrCollection
            : (lengthOrCollection?.length ?? 0);

    if (count < 0) {
        throw new RangeError(
            `validateIndex: count must be non-negative, received ${count}.`
        );
    }

    if (count === 0) {
        if (index !== 0) {
            throw new RangeError(
                `${name} (${index}) is invalid for empty collection of count 0. Expected 0.`
            );
        }
        return 0;
    }

    if (!Number.isInteger(index) || index < 0 || index >= count) {
        throw new RangeError(
            `${name} (${index}) is out of bounds for count ${count}. Expected an integer in range [0, ${count - 1}].`
        );
    }

    return index;
}
