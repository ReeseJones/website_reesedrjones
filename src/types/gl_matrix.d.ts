/**
 * Ambient type augmentation for gl-matrix.
 *
 * Problem:
 * gl-matrix natively defines vector and matrix types (mat4, mat3, vec3, quat, etc.) as
 * union types involving an abstract `IndexedCollection` (e.g. `[number, ...] | IndexedCollection`)
 * to accommodate its `setMatrixArrayType` setting. Because TypeScript's structural type system
 * considers `IndexedCollection` looser than `Float32Array` (lacking `buffer`, `byteOffset`,
 * and TypedArray method signatures), gl-matrix return types cannot be assigned to typed
 * properties (e.g., `ICamera.viewMatrix: Float32Array`, `ShaderProgram.setMat4`) without
 * explicit `as Float32Array` type casts throughout the codebase.
 *
 * Solution:
 * By augmenting `IndexedCollection` to extend `Float32Array`, TypeScript recognizes all
 * gl-matrix vectors, matrices, and quaternions as concrete `Float32Array` instances project-wide.
 * This matches the default runtime behavior of gl-matrix in modern browsers and eliminates
 * cast boilerplate across the WebGL pipeline.
 */
declare module "gl-matrix" {
    interface IndexedCollection extends Float32Array {
        [Symbol.iterator](): ArrayIterator<number>;
    }
}
