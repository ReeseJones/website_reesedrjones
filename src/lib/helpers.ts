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
