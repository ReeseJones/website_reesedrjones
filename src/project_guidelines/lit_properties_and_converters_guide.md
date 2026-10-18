# Lit Reactive Properties, State & Custom Converters Guide

A comprehensive architectural and practical guide to defining public properties with `static properties`, managing internal component state, understanding mutation caveats, and building high-performance Custom Attribute Converters for 3D and WebGL applications.

---

## 1. Overview & Reactivity Architecture

Lit's reactive update pipeline relies on observation of properties and internal state. When a reactive property or state field changes, Lit marks the component as dirty and schedules an asynchronous, batched microtask update cycle.

In this architecture:
- **`public static override properties = { ... }`** defines the public, declarative API of the element, automatically bridging HTML attributes to JavaScript properties without requiring decorators.
- **Internal State Fields** manage private or protected internal state that drives re-rendering via `this.requestUpdate()` without polluting the DOM with attributes.
- **Attribute Converters** translate string-based HTML attributes into rich JavaScript types (numbers, vectors, color tuples, parsed configs) and vice versa.

---

## 2. Public Reactive Properties (`static properties`)

In this project, reactive properties are declared using Lit's standard static properties class field paired with TypeScript's `declare` keyword. This avoids experimental compiler decorators and guarantees 100% standard ECMAScript compatibility across Parcel, SWC, and Vitest.

```ts
import { LitElement, html } from "lit";

export class PerspectiveCameraElement extends LitElement {
    public static override properties = {
        fov: { type: Number, reflect: true },
        near: { type: Number, attribute: "near-plane" },
        active: { type: Boolean, reflect: true },
    };

    public declare fov: number;
    public declare near: number;
    public declare active: boolean;

    public constructor() {
        super();
        this.fov = 60;
        this.near = 0.1;
        this.active = false;
    }
}
```

### Property Options Reference

Each entry in the `properties` map accepts a `PropertyDeclaration` configuration object:

- **`attribute` (`boolean | string`):**
  - **Default:** `true` (synchronizes with a kebab-cased HTML attribute, e.g., property `farPlane` maps to attribute `far-plane`).
  - **Custom String:** Specifies an explicit attribute name (e.g., `attribute: "near-clip"`).
  - **`attribute: false`:** Disables attribute synchronization completely. The property remains reactive as a JavaScript property (accessible via DOM property assignment or Lit's `.prop=${val}` template binding), but does not observe or react to HTML attribute changes. Ideal for complex objects, callbacks, or performance-sensitive references.

- **`type` (`TypeHint`):**
  - Specifies the built-in type hint used for default attribute conversion: `String`, `Number`, `Boolean`, `Array`, or `Object`.
  - Used by Lit's default converter to deserialize string attributes into JavaScript primitives.

- **`reflect` (`boolean`):**
  - **Default:** `false`.
  - When set to `true`, changes to the JavaScript property are automatically serialized and written back to the corresponding HTML attribute in the DOM via `setAttribute()`.
  - See [Section 6: Reflection Best Practices](#6-reflection-best-practices) for performance and styling considerations.

- **`converter` (`AttributeConverter` | `ComplexAttributeConverter`):**
  - Custom deserialization function or complex converter object providing custom `fromAttribute` and `toAttribute` logic.
  - Used when parsing domain-specific data types such as 3D vectors, matrices, or color spaces.

- **`hasChanged` (`(newVal: T, oldVal: T) => boolean`):**
  - Custom equality predicate function that dictates whether a property reassignment should schedule an update.
  - By default, Lit uses strict inequality (`newVal !== oldVal`), with an exception that `NaN !== NaN` evaluates to false so `NaN` reassignments do not loop.

- **`state` (`boolean`):**
  - Setting `state: true` declares an internal reactive property that triggers update cycles but has no HTML attribute footprint.

---

## 3. Internal Component State (Decoratorless)

Internal, private, or protected component state is represented as regular TypeScript class fields. To trigger an update cycle when internal state changes, call `this.requestUpdate()`:

```ts
import { LitElement, html } from "lit";

export class SceneViewportElement extends LitElement {
    private _isInteracting: boolean = false;
    private _currentFps: number = 60;
    private _lastPointerPosition: { x: number; y: number } = { x: 0, y: 0 };

    public setInteracting(interacting: boolean): void {
        this._isInteracting = interacting;
        this.requestUpdate();
    }
}
```

### Key Differences: Public Properties vs. Internal State

- **DOM Visibility:**
  - Public properties in `static properties` map to HTML attributes (unless `attribute: false`). External consumers can configure them in markup (`<rj-camera fov="75">`).
  - Internal state fields never create or observe HTML attributes. They exist exclusively on the class instance.
- **Component Boundary:**
  - Public properties represent inputs passed into the component from the outside world.
  - Internal state fields represent state managed privately by the component (e.g., hover flags, active pointer IDs, calculated camera matrices, animation timers).
- **TypeScript Visibility:**
  - Public properties should be marked `public declare`.
  - Internal state fields should be marked `private` or `protected`.

---

## 4. Mutation Caveats: Arrays, Objects & Change Detection

A frequent source of bugs in reactive components is in-place mutation of arrays and objects.

### The Problem: Reference Identity

Lit's default change detection evaluates whether an update should occur using strict inequality:

```ts
hasChanged(newVal, oldVal) {
    return newVal !== oldVal;
}
```

When you mutate an array or object in place:

```ts
// BUG: Reference does not change! No update is scheduled.
this.sceneNodes.push(newNode);
this.transform.x = 10;
```

Because `this.sceneNodes === this.sceneNodes` remains `true`, Lit assumes nothing changed and skips the update cycle.

### Solution Pattern A: Immutable Reassignment (Recommended)

Create a shallow copy with a new reference whenever modifying collections or objects:

```ts
// Arrays: Spread into a new array reference
this.sceneNodes = [...this.sceneNodes, newNode];

// Filtering arrays
this.sceneNodes = this.sceneNodes.filter(node => node.id !== targetId);

// Objects: Spread into a new object reference
this.transform = {
    ...this.transform,
    x: 10,
};
```

### Solution Pattern B: In-Place Mutation with `requestUpdate()`

In high-performance 3D code where allocating new objects or arrays on every frame triggers unwanted Garbage Collection pressure, mutate the buffer in place and explicitly notify Lit:

```ts
// Mutate in place to avoid GC allocation
this.vertexPositions[0] = newX;
this.vertexPositions[1] = newY;
this.vertexPositions[2] = newZ;

// Explicitly schedule an update for the specific property
this.requestUpdate("vertexPositions");
```

### Solution Pattern C: Custom `hasChanged` Predicates

You can supply a custom predicate to property options in `static properties` for deep or component-wise equality checks:

```ts
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

function hasVector3Changed(newVal?: Vector3, oldVal?: Vector3): boolean {
    if (newVal === oldVal) {
        return false;
    }
    if (!newVal || !oldVal) {
        return true;
    }
    return newVal.x !== oldVal.x || newVal.y !== oldVal.y || newVal.z !== oldVal.z;
}

export class TransformElement extends LitElement {
    public static override properties = {
        position: { hasChanged: hasVector3Changed },
    };

    public declare position: Vector3;
}
```

---

## 5. Custom Attribute Converters

While Lit provides default converters for primitives, complex WebGL and 3D applications require converting compact, human-readable attribute strings into mathematical structures and typed arrays.

### The `ComplexAttributeConverter` Interface

A custom converter is an object implementing the `ComplexAttributeConverter` interface:

```ts
export interface ComplexAttributeConverter<Type = unknown, AttributeType = unknown> {
    fromAttribute?(value: string | null, type?: unknown): Type;
    toAttribute?(value: Type, type?: unknown): AttributeType;
}
```

- **`fromAttribute(value, type)`:** Invoked when the HTML attribute changes in the DOM. Parses the attribute string into the JavaScript property type.
- **`toAttribute(value, type)`:** Invoked when `reflect: true` is enabled and the JavaScript property changes. Serializes the value back into an attribute string (or returns `null` to remove the attribute).

---

### Practical Converter Implementations for 3D & Graphics

#### 5.1 3D Vector Tuple Converter (`Vector3TupleConverter`)

Parses space- or comma-delimited strings into a 3D tuple `[number, number, number]` (e.g., `"1.0 2.5 -0.5"` or `"1, 2.5, -0.5"`), with NaN safety and zero fallback.

```ts
// vector3_converter_types.ts
export type Vector3Tuple = readonly [number, number, number];
```

```ts
// vector3_converter.ts
import type { ComplexAttributeConverter } from "lit";
import type { Vector3Tuple } from "./vector3_converter_types";

export const vector3Converter: ComplexAttributeConverter<Vector3Tuple> = {
    fromAttribute(value: string | null): Vector3Tuple {
        if (!value || typeof value !== "string") {
            return [0, 0, 0];
        }

        // Split on whitespace or commas: "1.0 2.0 3.0" or "1.0, 2.0, 3.0"
        const parts = value.trim().split(/[\s,]+/);
        const x = Number.parseFloat(parts[0] ?? "0");
        const y = Number.parseFloat(parts[1] ?? "0");
        const z = Number.parseFloat(parts[2] ?? "0");

        return [
            Number.isFinite(x) ? x : 0,
            Number.isFinite(y) ? y : 0,
            Number.isFinite(z) ? z : 0,
        ];
    },

    toAttribute(value: Vector3Tuple): string | null {
        if (!value || !Array.isArray(value) || value.length < 3) {
            return null;
        }
        return `${value[0]} ${value[1]} ${value[2]}`;
    },
};
```

**Usage in an Element:**
```ts
export class SceneNodeElement extends LitElement {
    public static override properties = {
        position: { converter: vector3Converter, reflect: true },
        scale: { converter: vector3Converter, reflect: true },
    };

    public declare position: Vector3Tuple;
    public declare scale: Vector3Tuple;
}
```
**Markup Support:**
```html
<rj-scene-node position="0 1.5 -5" scale="2 2 2"></rj-scene-node>
```

---

#### 5.2 Delimited Number Array Converter (`DelimitedNumbersConverter`)

Parses variable-length comma- or space-separated lists of numbers (e.g., texture coordinates, mesh vertex indices, or padding values).

```ts
import type { ComplexAttributeConverter } from "lit";

export const delimitedNumbersConverter: ComplexAttributeConverter<readonly number[]> = {
    fromAttribute(value: string | null): readonly number[] {
        if (!value || typeof value !== "string") {
            return [];
        }

        const parts = value.trim().split(/[\s,]+/);
        const result: number[] = [];

        for (const part of parts) {
            if (part.length > 0) {
                const parsed = Number.parseFloat(part);
                if (Number.isFinite(parsed)) {
                    result.push(parsed);
                }
            }
        }

        return Object.freeze(result);
    },

    toAttribute(value: readonly number[]): string | null {
        if (!value || !Array.isArray(value) || value.length === 0) {
            return null;
        }
        return value.join(" ");
    },
};
```

---

#### 5.3 Normalized Hex & RGBA Color Converter (`RgbaColorConverter`)

Parses multiple color formats (hex `#ff0000`, `#ff000080`, or CSS `rgba(255, 0, 0, 1)`) into a normalized WebGL float array `[r, g, b, a]` where each component is bounded in `[0.0, 1.0]`.

```ts
// rgba_color_types.ts
export type NormalizedRgbaTuple = readonly [number, number, number, number];
```

```ts
// rgba_color_converter.ts
import type { ComplexAttributeConverter } from "lit";
import type { NormalizedRgbaTuple } from "./rgba_color_types";

export const rgbaColorConverter: ComplexAttributeConverter<NormalizedRgbaTuple> = {
    fromAttribute(value: string | null): NormalizedRgbaTuple {
        if (!value || typeof value !== "string") {
            return [0, 0, 0, 1];
        }

        const trimmed = value.trim().toLowerCase();

        // Hex formatting: #rgb, #rgba, #rrggbb, #rrggbbaa
        if (trimmed.startsWith("#")) {
            const hex = trimmed.slice(1);
            if (hex.length === 3 || hex.length === 4) {
                const r = Number.parseInt(hex[0] + hex[0], 16) / 255;
                const g = Number.parseInt(hex[1] + hex[1], 16) / 255;
                const b = Number.parseInt(hex[2] + hex[2], 16) / 255;
                const a = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1.0;
                return [r, g, b, a];
            }
            if (hex.length === 6 || hex.length === 8) {
                const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
                const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
                const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
                const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1.0;
                return [r, g, b, a];
            }
        }

        // Space-delimited normalized floats: "1.0 0.5 0.2 1.0"
        const parts = trimmed.split(/[\s,]+/);
        if (parts.length >= 3) {
            const r = Math.min(1, Math.max(0, Number.parseFloat(parts[0]) || 0));
            const g = Math.min(1, Math.max(0, Number.parseFloat(parts[1]) || 0));
            const b = Math.min(1, Math.max(0, Number.parseFloat(parts[2]) || 0));
            const a = parts.length >= 4 ? Math.min(1, Math.max(0, Number.parseFloat(parts[3]) || 0)) : 1.0;
            return [r, g, b, a];
        }

        return [0, 0, 0, 1];
    },

    toAttribute(value: NormalizedRgbaTuple): string | null {
        if (!value || value.length < 4) {
            return null;
        }
        const toHexByte = (val: number) => {
            const clamped = Math.min(255, Math.max(0, Math.round(val * 255)));
            return clamped.toString(16).padStart(2, "0");
        };

        const hex = `#${toHexByte(value[0])}${toHexByte(value[1])}${toHexByte(value[2])}`;
        return value[3] < 1.0 ? `${hex}${toHexByte(value[3])}` : hex;
    },
};
```

---

#### 5.4 Resilient JSON Config Converter (`JsonConfigConverter`)

Provides safe JSON parsing with a schema/fallback default, preventing broken attribute strings from throwing uncaught runtime exceptions.

```ts
import type { ComplexAttributeConverter } from "lit";

export function createJsonConfigConverter<T>(fallback: T): ComplexAttributeConverter<T> {
    return {
        fromAttribute(value: string | null): T {
            if (!value || typeof value !== "string") {
                return fallback;
            }
            try {
                return JSON.parse(value) as T;
            } catch (error) {
                console.warn("[JsonConfigConverter] Failed to parse JSON attribute:", value, error);
                return fallback;
            }
        },

        toAttribute(value: T): string | null {
            if (value === undefined || value === null) {
                return null;
            }
            try {
                return JSON.stringify(value);
            } catch {
                return null;
            }
        },
    };
}
```

---

## 6. Reflection Best Practices

Enabling `reflect: true` configures Lit to write property changes back to the HTML attribute via `setAttribute()`. While convenient, careless reflection can severely degrade application performance.

### When to Enable Reflection (`reflect: true`)
- **CSS Styling Hooks:**
  - When child or host styles depend on attribute selectors:
  ```css
  :host([active]) { opacity: 1; }
  :host([variant="wireframe"]) canvas { filter: contrast(1.5); }
  ```
- **State Inspection & Debugging:**
  - For coarse element state flags (e.g., `loaded`, `selected`, `disabled`) that developers inspect via DevTools.
- **Accessibility & ARIA Coordination:**
  - When reflecting state to standard ARIA attributes (e.g., `aria-expanded`).

### When to Avoid Reflection (`reflect: false` or `attribute: false`)
- **High-Frequency Animated Values:**
  - Never reflect camera coordinates, tick counters, matrices, or pointer positions. Writing attributes 60–120 times per second triggers DOM mutation observers, attribute change callbacks, and style recalculations.
- **Large Collections or Objects:**
  - Avoid reflecting geometry arrays, meshes, or large JSON configurations. Serializing kilobytes of JSON to an HTML string on every modification introduces severe CPU overhead.
- **Unidirectional Property Flows:**
  - If a property is passed downward from React 19 or TypeScript code and never queried from CSS, reflection adds zero value and creates unnecessary DOM writes.

---

## 7. React 19 Interoperability & Property Binding

React 19 natively recognizes Web Components and passes JavaScript values directly to element properties when the property name exists on the custom element instance:

```tsx
// React 19 Component
import React, { useEffect, useRef } from "react";
import type { Vector3Tuple } from "./vector3_converter_types";

export function CameraControls() {
    const cameraRef = useRef<HTMLElement>(null);
    const cameraPosition: Vector3Tuple = [0, 5, -10];

    return (
        <rj-perspective-camera
            ref={cameraRef}
            fov={75}
            near={0.1}
            far={1000}
            position={cameraPosition}
            active
        />
    );
}
```

- **Primitive Properties (`fov`, `near`, `far`):** Passed directly as numbers to the element instance.
- **Tuple & Object Properties (`position`):** Passed as a direct JavaScript array reference, completely bypassing string attribute serialization.
- **Boolean Properties (`active`):** Set directly as a boolean property.

---

## 8. Summary of Guidelines

- **Use `static properties` for external API, class fields for internal state:** Public declarative configuration belongs in `static override properties = { ... }`; private rendering triggers belong in class fields invoking `this.requestUpdate()`.
- **Never mutate arrays or objects in place without notifying Lit:** Either assign a new shallow copy (`[...items]`, `{ ...config }`) or invoke `this.requestUpdate("propName")`.
- **Use dedicated converter modules:** Implement converters using `ComplexAttributeConverter` and define companion types in `*_types.ts` files according to [typescript_guidelines.md](typescript_guidelines.md).
- **Guard against NaN and unparseable input:** Custom converters must always validate numbers with `Number.isFinite()` and return safe fallbacks instead of crashing.
- **Reflect conservatively:** Reserve `reflect: true` strictly for CSS selectors and accessibility hooks; never reflect high-frequency WebGL transform properties.
- **Review related guidelines:** For controller composition, refer to [lit_controllers_guide.md](lit_controllers_guide.md); for foundational architecture, refer to [lit_guidelines.md](lit_guidelines.md) and [lit_cheat_sheet.md](lit_cheat_sheet.md).
