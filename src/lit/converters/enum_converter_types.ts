import type { ComplexAttributeConverter } from "lit";

/**
 * Options for configuring enum attribute conversion.
 */
export interface EnumConverterOptions<T extends number | string> {
    /**
     * Default fallback enum value when attribute parsing fails or attribute is missing.
     */
    defaultValue: T;
}

/**
 * Lit ComplexAttributeConverter specialized for enum values.
 */
export interface EnumConverter<T extends number | string> extends ComplexAttributeConverter<T> {
    fromAttribute(value: string | null): T;
    toAttribute(value: T): string | null;
}
