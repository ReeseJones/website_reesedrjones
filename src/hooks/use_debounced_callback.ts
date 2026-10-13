import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
    DebouncedFunction,
    UseDebouncedCallbackOptions,
} from "./use_debounced_callback_types";

/**
 * Hook providing a stable debounced callback wrapper that defers invocation
 * until delayMs milliseconds have elapsed since the last call.
 *
 * Provides .cancel(), .flush(), and .isPending() controls, and guarantees
 * deterministic cleanup or optional flushing on component unmount.
 *
 * @param callback Handler to invoke when debounced timer elapses.
 * @param delayMs Delay in milliseconds to wait before invoking the callback.
 * @param options Optional configuration (e.g. flushOnUnmount).
 * @returns A callable debounced function decorated with cancel, flush, and isPending.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delayMs: number,
    options: UseDebouncedCallbackOptions = {}
): DebouncedFunction<TArgs> {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    const optionsRef = useRef(options);
    optionsRef.current = options;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const argsRef = useRef<TArgs | null>(null);

    const cancel = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        argsRef.current = null;
    }, []);

    const flush = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (argsRef.current !== null) {
            const latestArgs = argsRef.current;
            argsRef.current = null;
            callbackRef.current(...latestArgs);
        }
    }, []);

    const isPending = useCallback(() => {
        return timerRef.current !== null;
    }, []);

    const debounced = useCallback(
        (...args: TArgs) => {
            argsRef.current = args;
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                if (argsRef.current !== null) {
                    const latestArgs = argsRef.current;
                    argsRef.current = null;
                    callbackRef.current(...latestArgs);
                }
            }, delayMs);
        },
        [delayMs]
    );

    useEffect(() => {
        return () => {
            if (optionsRef.current.flushOnUnmount) {
                flush();
            } else {
                cancel();
            }
        };
    }, [flush, cancel]);

    return useMemo(() => {
        const fn = (...args: TArgs) => {
            debounced(...args);
        };
        fn.cancel = cancel;
        fn.flush = flush;
        fn.isPending = isPending;
        return fn as DebouncedFunction<TArgs>;
    }, [debounced, cancel, flush, isPending]);
}
