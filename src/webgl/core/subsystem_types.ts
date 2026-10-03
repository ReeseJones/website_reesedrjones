/**
 * Restoration priority constants for context restoration sequencing.
 * Lower numbers execute earlier during webglcontextrestored.
 */
export const SubsystemRestorationPriority = {
    Shader: 10,
    Texture: 20,
    Geometry: 30,
} as const;

export type SubsystemRestorationPriority =
    (typeof SubsystemRestorationPriority)[keyof typeof SubsystemRestorationPriority];

/**
 * Diagnostic report emitted by a subsystem for engine telemetry and debugging.
 */
export interface SubsystemDiagnostics {
    readonly name: string;
    readonly resourceCount: number;
    readonly activeBindings: number;
    readonly details?: Record<string, unknown>;
}

/**
 * Contract implemented by all WebGL GPU resource manager subsystems.
 * Governed by the WebGLContextManager microkernel coordinator.
 */
export interface IContextSubsystem {
    /** Unique human-readable subsystem identifier */
    readonly name: string;

    /**
     * Restoration execution priority during webglcontextrestored.
     * Lower numbers run earlier.
     */
    readonly restorationPriority: number;

    /** Hook invoked upon canvas webglcontextlost */
    onContextLost(): void;

    /** Hook invoked upon canvas webglcontextrestored with the fresh context */
    onContextRestored(gl: WebGL2RenderingContext): void;

    /** Permanent disposal of all GPU handles and caches managed by this subsystem */
    destroy(): void;

    /** Telemetry query returning active resource counts and binding states */
    getDiagnostics(): SubsystemDiagnostics;
}

/**
 * Universal contract for deterministically disposable CPU-side or GPU-side resources.
 */
export interface IDisposable {
    /** Triggers deterministic cleanup of underlying resources */
    dispose(): void;

    /** True if this resource has already been permanently disposed */
    readonly isDisposed: boolean;

    /** Registers a callback to be invoked exactly once when dispose() is called */
    onDispose(callback: () => void): void;
}
