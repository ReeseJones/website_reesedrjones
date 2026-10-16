import type { ReactiveControllerHost } from "lit";

export type ElementControllerHost = ReactiveControllerHost & HTMLElement;

export interface IIntersectionObserverLike {
    observe(target: Element): void;
    unobserve(target: Element): void;
    disconnect(): void;
}

export interface IIntersectionObserverEntryLike {
    readonly isIntersecting: boolean;
    readonly intersectionRatio: number;
}

export type IntersectionObserverCallbackLike = (
    entries: readonly IIntersectionObserverEntryLike[],
    observer?: IIntersectionObserverLike
) => void;

export interface IIntersectionObserverFactory {
    create(callback: IntersectionObserverCallbackLike): IIntersectionObserverLike;
}

export interface VisibilityControllerOptions {
    readonly observerFactory: IIntersectionObserverFactory;
    readonly target?: HTMLElement;
    readonly pauseWhenOffscreen?: boolean;
    readonly pauseWhenHidden?: boolean;
    readonly onChange?: (isVisible: boolean) => void;
}

export interface IVisibilityController {
    readonly isVisible: boolean;
    readonly isOffscreen: boolean;
    readonly isHidden: boolean;
}
