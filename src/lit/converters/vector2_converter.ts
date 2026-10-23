import type { ComplexAttributeConverter } from "lit";
import type { Vector2Like } from "../../maths/vector_types";
import type { Vector2Tuple } from "./vector2_converter_types";

const COMPONENT_FALLBACK = 0;
const VECTOR2_DIMENSION = 2;
const INDEX_X = 0;
const INDEX_Y = 1;
const DEFAULT_FALLBACK_VECTOR2: Vector2Like = { x: 0, y: 0 };
const DELIMITER_PATTERN = /[\s,]+/;

function parseComponent(part: string | undefined): number {
    if (part === undefined) {
        return COMPONENT_FALLBACK;
    }
    const parsed = Number.parseFloat(part);
    if (!Number.isFinite(parsed)) {
        return COMPONENT_FALLBACK;
    }
    return parsed;
}

/**
 * Lit ComplexAttributeConverter translating between space- or comma-delimited
 * string coordinates (e.g. "0.5 0.0" or "36, 48") and Vector2Like ({ x, y }).
 */
export const vector2Converter = {
    fromAttribute(value: string | null): Vector2Like {
        if (!value || typeof value !== "string") {
            return { ...DEFAULT_FALLBACK_VECTOR2 };
        }

        const trimmed = value.trim();
        if (!trimmed) {
            return { ...DEFAULT_FALLBACK_VECTOR2 };
        }

        const parts = trimmed.split(DELIMITER_PATTERN);
        const x = parseComponent(parts[INDEX_X]);
        const y = parseComponent(parts[INDEX_Y]);

        return { x, y };
    },

    toAttribute(value: Vector2Like | Vector2Tuple): string | null {
        if (!value) {
            return null;
        }

        if (Array.isArray(value)) {
            const tuple = value as Vector2Tuple;
            if (tuple.length < VECTOR2_DIMENSION) {
                return null;
            }

            if (!tuple.every((component) => typeof component === "number" && Number.isFinite(component))) {
                return null;
            }

            return `${tuple[INDEX_X]} ${tuple[INDEX_Y]}`;
        }

        if (typeof value === "object" && "x" in value && "y" in value) {
            const { x, y } = value;
            if (
                typeof x !== "number" || !Number.isFinite(x) ||
                typeof y !== "number" || !Number.isFinite(y)
            ) {
                return null;
            }

            return `${x} ${y}`;
        }

        return null;
    },
} satisfies ComplexAttributeConverter<Vector2Like | Vector2Tuple>;
