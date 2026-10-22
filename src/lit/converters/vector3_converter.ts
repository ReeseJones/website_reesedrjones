import type { ComplexAttributeConverter } from "lit";
import type { Vector3Like } from "../../maths/vector_types";
import type { Vector3Tuple } from "./vector3_converter_types";

const COMPONENT_FALLBACK = 0;
const VECTOR3_DIMENSION = 3;
const INDEX_X = 0;
const INDEX_Y = 1;
const INDEX_Z = 2;
const DEFAULT_FALLBACK_VECTOR3: Vector3Like = { x: 0, y: 0, z: 0 };

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
 * string coordinates (e.g. "0 5 20" or "0, 5, 20") and Vector3Like ({ x, y, z }).
 */
export const vector3Converter = {
    fromAttribute(value: string | null): Vector3Like {
        if (!value || typeof value !== "string") {
            return { ...DEFAULT_FALLBACK_VECTOR3 };
        }

        const trimmed = value.trim();
        if (!trimmed) {
            return { ...DEFAULT_FALLBACK_VECTOR3 };
        }

        const parts = trimmed.split(/[\s,]+/);
        const x = parseComponent(parts[INDEX_X]);
        const y = parseComponent(parts[INDEX_Y]);
        const z = parseComponent(parts[INDEX_Z]);

        return { x, y, z };
    },

    toAttribute(value: Vector3Like | Vector3Tuple): string | null {
        if (!value) {
            return null;
        }

        if (Array.isArray(value)) {
            const tuple = value as Vector3Tuple;
            if (tuple.length < VECTOR3_DIMENSION) {
                return null;
            }

            if (!tuple.every((component) => typeof component === "number" && Number.isFinite(component))) {
                return null;
            }

            return `${tuple[INDEX_X]} ${tuple[INDEX_Y]} ${tuple[INDEX_Z]}`;
        }

        if (typeof value === "object" && "x" in value && "y" in value && "z" in value) {
            const { x, y, z } = value;
            if (
                typeof x !== "number" || !Number.isFinite(x) ||
                typeof y !== "number" || !Number.isFinite(y) ||
                typeof z !== "number" || !Number.isFinite(z)
            ) {
                return null;
            }

            return `${x} ${y} ${z}`;
        }

        return null;
    },
} satisfies ComplexAttributeConverter<Vector3Like | Vector3Tuple>;
