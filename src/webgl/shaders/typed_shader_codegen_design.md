# Transparent Strongly Typed GLSL Shader Architecture Design

This document details the architectural design, build integration strategy, GLSL parsing algorithms, and TypeScript API contracts for the transparent, strongly typed GLSL shader pipeline in `website_reesedrjones`.

---

## 1. Design Goals & Core Principles

- **Single Source of Truth:** GLSL `.vert` and `.frag` source files are the sole authoritative declaration for attributes, locations, uniforms, and data types.
- **100% Transparent Version Control:** Generated companion `.d.ts` type files are excluded from Git via `.gitignore`. No generated code files clutter repository commits or pull requests.
- **Direct Asset Imports:** Developers import directly from GLSL shader files (`import frag from "./galactic_cloud.frag"`).
- **Compile-Time Safety & Intellisense:** Auto-generated companion declaration files (`.frag.d.ts`) provide full VSCode autocomplete, parameter hover documentation, and compile-time type errors for `shaderProgram.setUniforms()`.
- **Dynamic Runtime Layout Inference:** Vertex attribute layouts (`VertexLayout`) are constructed automatically from GLSL `layout(location = N) in <type> <name>;` declarations at program compilation time.

---

## 2. Transparent File Strategy (`.d.ts` + `.gitignore`)

### Companion Declaration Files

For any `.vert` or `.frag` GLSL file, the generator produces a companion ambient declaration file directly alongside it:

- **Shader Source:** `src/galaxy_backdrop/shaders/galactic_cloud.frag`
- **Companion Declaration:** `src/galaxy_backdrop/shaders/galactic_cloud.frag.d.ts`

TypeScript's module resolution automatically pairs asset files with their corresponding `.d.ts` declaration files.

### Git Exclusion (`.gitignore`)

The companion `.d.ts` files are excluded from version control:

```gitignore
*.vert.d.ts
*.frag.d.ts
```

Running `npm run build` or `npm run start` triggers `scripts/generate_shader_types.js`, which refreshes these `.d.ts` files in the local workspace transparently.

---

## 3. Build & Intellisense Integration Architecture

### Build Script Integration (`package.json`)

The code generator script lives in `scripts/generate_shader_types.js` and is hooked into package lifecycle commands:

- `"generate:shaders": "node scripts/generate_shader_types.js"`
- `"build": "npm run generate:shaders && parcel build src/index.html --public-url /"`
- `"start": "npm run generate:shaders && rimraf dist && parcel"`

### Developer Workflow

```ts
import galacticCloudFrag, { GalacticCloudFragUniforms } from "./shaders/galactic_cloud.frag";

// In renderer code:
this.shaderProgram.setUniforms<GalacticCloudFragUniforms>({
    uHorizonIntensity: 1.0,
    uHorizonThickness: 0.25,
    uHorizonColorCenter: [1.0, 0.84, 0.66],
});
```

---

## 4. Dynamic Runtime `VertexLayout` Parsing

Instead of generating hardcoded JS layout files on disk, `VertexLayout` is constructed at runtime from the vertex shader GLSL source string.

```ts
export function parseVertexLayoutFromGLSL(vertSource: string): VertexLayout {
    const attributeRegex = /layout\s*\(\s*location\s*=\s*(\d+)\s*\)\s*in\s+(\w+)\s+(\w+)\s*;/g;
    const attributes = [];
    let currentOffset = 0;
    let match;

    while ((match = attributeRegex.exec(vertSource)) !== null) {
        const location = parseInt(match[1], 10);
        const glslType = match[2];
        const name = match[3];

        const size = getGLSLComponentCount(glslType);
        const bytes = size * 4; // float = 4 bytes

        attributes.push({
            name,
            location,
            size,
            type: 0x1406, // gl.FLOAT
            normalized: false,
            offset: currentOffset,
        });

        currentOffset += bytes;
    }

    return {
        stride: currentOffset,
        attributes,
    };
}
```

---

## 5. GLSL to TypeScript Type Mapping

- `float` $\rightarrow$ `number`
- `int` / `uint` $\rightarrow$ `number`
- `bool` $\rightarrow$ `boolean`
- `vec2` $\rightarrow$ `[number, number]`
- `vec3` $\rightarrow$ `[number, number, number]`
- `vec4` $\rightarrow$ `[number, number, number, number]`
- `mat3` $\rightarrow$ `Float32Array | number[]` (9 elements)
- `mat4` $\rightarrow$ `Float32Array | number[]` (16 elements)
- `sampler2D` $\rightarrow$ `number` (Texture unit index)

---

## 6. Implementation Checklist

- **Step 1:** Add `parseVertexLayoutFromGLSL()` helper to [vertex_layout.ts](vertex_layout.ts).
- **Step 2:** Update `ShaderProgram<TUniforms>` in [shader_program.ts](shader_program.ts) to accept `<TUniforms>` and provide `setUniforms()`.
- **Step 3:** Implement `scripts/generate_shader_types.js` to scan GLSL files and emit `.vert.d.ts` / `.frag.d.ts` files.
- **Step 4:** Add `.vert.d.ts` and `.frag.d.ts` to `.gitignore`.
- **Step 5:** Add `generate:shaders` script hook to `package.json`.
- **Step 6:** Run generator and refactor `GalacticCloudRenderer` and `GalaxyRenderer` to use strongly typed uniforms.
- **Step 7:** Run `npm run build` to verify clean build.
