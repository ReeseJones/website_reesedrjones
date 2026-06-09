export function classNameMap(classNames: Record<string, boolean>): string {
    return Object.keys(classNames)
        .filter((key) => classNames[key])
        .join(" ");
}