export interface VisibilityControllerOptions {
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
