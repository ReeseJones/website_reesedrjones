import type { IDisposable } from "./subsystem_types";

/**
 * Universal contract for managed GPU hardware resource wrappers in WebGL2.
 */
export interface IWebGLResource extends IDisposable {
    /** Human-readable label for debugging and diagnostics */
    readonly label: string;

    /** Returns true if underlying GPU handles are allocated and valid */
    readonly isValid: boolean;

    /**
     * WebGL context lost lifecycle hook invoked by owning manager.
     * Clears internal GPU handle references without calling gl.delete*.
     */
    onContextLost(): void;

    /**
     * WebGL context restored lifecycle hook invoked by owning manager.
     * Recreates GPU handles and re-uploads data to the new WebGL context.
     */
    onContextRestored(gl: WebGL2RenderingContext): void;

    /**
     * Deterministic disposal:
     * Synchronously frees GPU handles from the driver, unbinds from context,
     * marks isDisposed = true, and fires onDispose subscribers.
     */
    dispose(): void;
}
