/**
 * Configuration options for useDebouncedCallback.
 */
export interface UseDebouncedCallbackOptions {
    /**
     * Whether to immediately flush the latest pending callback execution when the enclosing component unmounts.
     * Defaults to false.
     */
    flushOnUnmount?: boolean;
}

/**
 * Controller interface returned by useDebouncedCallback.
 */
export interface DebouncedFunction<TArgs extends unknown[]> {
    /**
     * Queues invocation of the callback after delayMs has elapsed since the last call.
     */
    (...args: TArgs): void;

    /**
     * Cancels any pending debounced execution and clears queued arguments.
     */
    cancel: () => void;

    /**
     * Immediately executes any pending debounced execution with latest arguments and clears the timer.
     */
    flush: () => void;

    /**
     * Returns true if a debounced execution is currently scheduled.
     */
    isPending: () => boolean;
}
