import type { ReactiveControllerHost } from "lit";

export type ElementControllerHost = ReactiveControllerHost & HTMLElement;

export interface ViewportDimensions {
    readonly width: number;
    readonly height: number;
    readonly cssWidth: number;
    readonly cssHeight: number;
    readonly devicePixelRatio: number;
    readonly aspect: number;
}

export interface IResizeObserverLike {
    observe(target: Element, options?: ResizeObserverOptions): void;
    unobserve(target: Element): void;
    disconnect(): void;
}

export type ResizeObserverCallbackLike = (
    entries?: readonly unknown[],
    observer?: IResizeObserverLike
) => void;

export interface IResizeObserverFactory {
    create(callback: ResizeObserverCallbackLike): IResizeObserverLike;
}

export interface ResizeControllerOptions {
    readonly observerFactory: IResizeObserverFactory;
    readonly target?: HTMLElement;
    readonly debounceMs?: number;
    readonly onResize?: (dimensions: ViewportDimensions) => void;
}

export interface IResizeController {
    readonly dimensions: ViewportDimensions;
    measureImmediate(): ViewportDimensions;
}
