# Working with Vectors and Colors Guidelines

## Purpose & Philosophy

This guideline defines how spatial vectors and color data are structured, stored, and exposed across the engine, graphics pipelines, Lit elements, and React components.

The core design principle is:
- **Internal Native Contiguity:** Classes, render passes, and math subsystems store vectors and colors internally as contiguous typed arrays (`Float32Array`) for zero-allocation performance, cache locality, and direct upload to WebGL buffers and uniform calls.
- **Public Explicit Semantic Interfaces:** Public APIs, getters, configuration interfaces, and component properties expose explicit semantic objects (`{ x, y, z }`, `{ r, g, b, a }`) rather than anonymous index tuples or raw internal typed array references.

### Why This Design?

- **Component Disambiguation:** Anonymous tuples like `[number, number, number]` easily lead to silent transposition bugs (e.g. swapping X and Y, confusing RGB with BGR, or accidentally passing a color triplet into a 3D position argument). Explicit interfaces enforce compile-time safety.
- **Encapsulation & Buffer Safety:** Exposing internal `Float32Array` buffers leaks implementation details and allows external callers to mutate memory directly, bypassing dirty-flag cascading (`isDirty`), cached bounding boxes, and matrix recomputations.
- **Self-Documenting Ergonomics:** Object literals like `{ x: 0, y: 5, z: -10 }` or `{ r: 0.2, g: 0.8, b: 1.0, a: 1.0 }` are clear and readable in scene declarations, Lit element markup, and React prop trees.
- **Zero-Allocation in Hot Loops:** While getters return safe copied semantic objects by default, high-frequency render loops can pass an optional target-out object to eliminate garbage collection (GC) allocation entirely.

---

## Standard Type Definitions

All vector and color types must adhere to the project rule of separating types from implementation. They reside in dedicated `*_types.ts` files and contain zero runtime code.

### Spatial Vector Types

Defined in [`src/maths/vector_types.ts`](../maths/vector_types.ts):

- **`Vector2Like`**:
  ```ts
  export interface Vector2Like {
      x: number;
      y: number;
  }
  export type ReadonlyVector2Like = Readonly<Vector2Like>;
  ```
- **`Vector3Like`**:
  ```ts
  export interface Vector3Like {
      x: number;
      y: number;
      z: number;
  }
  export type ReadonlyVector3Like = Readonly<Vector3Like>;
  ```
- **`Vector4Like`**:
  ```ts
  export interface Vector4Like {
      x: number;
      y: number;
      z: number;
      w: number;
  }
  export type ReadonlyVector4Like = Readonly<Vector4Like>;
  ```

*Rule:* Never retain backwards-compatibility aliases (such as `export type Vector2 = Vector2Like;`). Use the canonical interface name throughout the codebase.

### Color Types

Defined in [`src/helpers/colors_types.ts`](../helpers/colors_types.ts):

- **`RgbLike`**: Normalized color channels in range `[0.0, 1.0]`.
  ```ts
  export interface RgbLike {
      r: number;
      g: number;
      b: number;
  }
  export type ReadonlyRgbLike = Readonly<RgbLike>;
  ```
- **`RgbaLike`**: Normalized color channels with alpha in range `[0.0, 1.0]`.
  ```ts
  export interface RgbaLike {
      r: number;
      g: number;
      b: number;
      a: number;
  }
  export type ReadonlyRgbaLike = Readonly<RgbaLike>;
  ```
- **Internal Tuples:** `NormalizedRgbTuple` (`readonly [number, number, number]`) and `NormalizedRgbaTuple` (`readonly [number, number, number, number]`) remain available strictly for internal uniform serialization and low-level WebGL buffer layouts.

---

## Memory Architecture & Class Implementation

### Internal Storage Patterns

Classes managing spatial or color properties (e.g., [`Transform`](../scene/core/transform.ts), `Camera`, `Material`) must store data in private contiguous typed arrays:

```ts
export class Transform implements ITransform {
    private readonly _position: Float32Array = new Float32Array(3);
    private readonly _rotation: Float32Array = new Float32Array([0, 0, 0, 1]);
    private readonly _scale: Float32Array = new Float32Array([1, 1, 1]);
    private readonly _localMatrix: Float32Array = new Float32Array(16);
    private _isLocalDirty: boolean = true;
    // ...
}
```

This guarantees:
- Compatibility with `gl-matrix` math operations (`vec3.transformMat4`, `mat4.multiply`, `quat.slerp`).
- Direct handoff to WebGL functions (`gl.uniform3fv`, `gl.bufferSubData`).
- Zero heap allocations during transformation and render passes.

### Public Getter Conventions

To prevent mutating the internal array, getters must copy components into an explicit semantic structure:

```ts
// Standard ergonomic getter (creates safe copy)
public getPosition(): Vector3Like {
    return {
        x: this._position[0],
        y: this._position[1],
        z: this._position[2]
    };
}

// Zero-allocation getter for hot render loops
public getPosition(out?: Vector3Like): Vector3Like {
    if (out) {
        out.x = this._position[0];
        out.y = this._position[1];
        out.z = this._position[2];
        return out;
    }
    return {
        x: this._position[0],
        y: this._position[1],
        z: this._position[2]
    };
}
```

### Public Setter Conventions

Public setters should offer flexibility while ensuring dirty flags are strictly managed:

- **Object Setter:** Accepts `Vector3Like` or `RgbaLike`.
- **Scalar Overload:** Accepts individual numbers `(x, y, z)` or `(r, g, b, a)` so callers already holding scalars do not have to allocate a temporary wrapper object.
- **Dirty Checking:** Compares incoming values against current buffer contents before marking the node or material dirty.

```ts
public setPosition(pos: Vector3Like): this;
public setPosition(x: number, y: number, z: number): this;
public setPosition(xOrPos: number | Vector3Like, y?: number, z?: number): this {
    let px: number;
    let py: number;
    let pz: number;

    if (typeof xOrPos === "number") {
        px = xOrPos;
        py = y ?? 0;
        pz = z ?? 0;
    } else {
        px = xOrPos.x;
        py = xOrPos.y;
        pz = xOrPos.z;
    }

    if (this._position[0] !== px || this._position[1] !== py || this._position[2] !== pz) {
        this._position[0] = px;
        this._position[1] = py;
        this._position[2] = pz;
        this.markDirty();
    }
    return this;
}
```

---

## Interoperability Across Subsystems

### 1. WebGL Shaders & Uniforms

- [`ShaderProgram`](../webgl/shaders/shader_program.ts) uniform setters support both semantic objects and packed typed arrays:
  - `setVec3(name: string, value: Vector3Like | Float32Array | readonly [number, number, number])`
  - `setColor(name: string, value: RgbLike | RgbaLike | Float32Array)`
- Internal uniform caches map directly to `gl.uniform3f`, `gl.uniform3fv`, `gl.uniform4f`, or `gl.uniform4fv`.

### 2. Lit Web Components & Attribute Converters

- Attribute converters convert serialized HTML attribute strings to/from semantic object representations:
  - **`vector3Converter`**: Delimited string `"1.0 2.5 -0.5"` $\leftrightarrow$ `{ x: 1.0, y: 2.5, z: -0.5 }`.
  - **`rgbaColorConverter`**: Hex `#336699` or `"0.2, 0.4, 0.6, 1.0"` $\leftrightarrow$ `{ r: 0.2, g: 0.4, b: 0.6, a: 1.0 }`.
- Web component properties declare semantic types:
  ```ts
  @property({ converter: vector3Converter })
  public position: Vector3Like = { x: 0, y: 0, z: 0 };
  ```

### 3. React Components & UI Dialogs

- UI components (such as color pickers and transform inspector fields) bind strictly to `RgbLike`, `RgbaLike`, or `Vector3Like`:
  ```tsx
  export interface ColorItemProps {
      label: string;
      color: RgbLike;
      onChange: (color: RgbLike) => void;
  }
  ```
- Conversions to hex strings or CSS `rgba(...)` styles are encapsulated inside [`src/helpers/colors.ts`](../helpers/colors.ts).

---

## Anti-Patterns to Avoid

- **No Public Native Buffer Exposure:** Never return a direct reference to internal `Float32Array` members from public methods. External code could mutate values without tripping `isDirty` callbacks.
- **No Anonymous Tuples on Public Interfaces:** Avoid signatures like `setColor(color: [number, number, number])` or `lookAt(target: [number, number, number])`. Always use `RgbLike` or `Vector3Like`.
- **No Transient Object Churn in Per-Frame Loops:** When reading transforms or colors repeatedly within render ticks or physics updates, pass a pre-allocated target object (`getPosition(scratchVec)`).
- **No Domain Blurring:** Do not use `Vector3Like` to represent RGB colors or `Vector4Like` to represent RGBA colors. While mathematically isomorphic, maintaining separate types prevents semantic errors at compile time.
