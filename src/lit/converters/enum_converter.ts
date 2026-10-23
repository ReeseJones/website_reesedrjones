import type { EnumConverter } from "./enum_converter_types";

const CAMEL_TO_KEBAB_PATTERN = /([a-z0-9])([A-Z])/g;
const UNDERSCORE_PATTERN = /_/g;
const NUMERIC_ONLY_PATTERN = /^\d+$/;

function toKebabCase(key: string): string {
    return key
        .replace(CAMEL_TO_KEBAB_PATTERN, "$1-$2")
        .replace(UNDERSCORE_PATTERN, "-")
        .toLowerCase();
}

/**
 * Lit ComplexAttributeConverter factory translating between kebab-case string
 * attribute values (e.g. "screen-space", "clamped-screen-space", "spherical") and TypeScript enum values.
 *
 * Enforces case-agnostic kebab-case normalization and rejects raw numeric strings.
 */
export function createEnumConverter<T extends number | string>(
    enumObject: Record<string, T | string>,
    defaultValue: T
): EnumConverter<T> {
    const keyToValue = new Map<string, T>();
    const valueToKebab = new Map<T, string>();

    for (const key of Object.keys(enumObject)) {
        // Skip TypeScript numeric reverse-mapping keys (e.g. "0", "1", "2")
        if (NUMERIC_ONLY_PATTERN.test(key)) {
            continue;
        }

        const value = enumObject[key] as T;
        const kebabKey = toKebabCase(key);

        keyToValue.set(kebabKey, value);
        if (typeof value === "string") {
            keyToValue.set(toKebabCase(value), value);
        }
        if (!valueToKebab.has(value)) {
            valueToKebab.set(value, kebabKey);
        }
    }

    return {
        fromAttribute(value: string | null): T {
            if (value === null || typeof value !== "string") {
                return defaultValue;
            }

            const trimmed = value.trim();
            if (!trimmed || NUMERIC_ONLY_PATTERN.test(trimmed)) {
                return defaultValue;
            }

            const normalized = toKebabCase(trimmed);
            const match = keyToValue.get(normalized);
            if (match === undefined) {
                return defaultValue;
            }

            return match;
        },

        toAttribute(value: T): string | null {
            if (value === null || value === undefined) {
                return null;
            }

            const kebab = valueToKebab.get(value);
            if (kebab !== undefined) {
                return kebab;
            }

            if (typeof value === "string") {
                const normalized = toKebabCase(value.trim());
                if (keyToValue.has(normalized)) {
                    return normalized;
                }
            }

            return null;
        },
    } satisfies EnumConverter<T>;
}
