import type { IIntersectionObserverFactory, IntersectionObserverCallbackLike } from "./visibility_controller_types";

export const defaultIntersectionObserverFactory: IIntersectionObserverFactory = {
    create(callback: IntersectionObserverCallbackLike) {
        return new IntersectionObserver(callback);
    },
};
