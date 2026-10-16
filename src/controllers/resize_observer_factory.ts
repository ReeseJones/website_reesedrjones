import type { IResizeObserverFactory, ResizeObserverCallbackLike } from "./resize_controller_types";

export const defaultResizeObserverFactory: IResizeObserverFactory = {
    create(callback: ResizeObserverCallbackLike) {
        return new ResizeObserver(callback);
    },
};
