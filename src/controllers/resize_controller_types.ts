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

export interface ResizeControllerOptions {
    readonly target?: HTMLElement;
    readonly dprCap?: number;
    readonly debounceMs?: number;
    readonly onResize?: (dimensions: ViewportDimensions) => void;
}

export interface IResizeController {
    readonly dimensions: ViewportDimensions;
    measureImmediate(): ViewportDimensions;
}
