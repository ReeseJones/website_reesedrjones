import type { CanvasDimensions } from "../../webgl/canvas/canvas_types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";

/**
 * Event dispatched when the WebGL2 rendering context and context manager are initialized.
 */
export class WebGLContextCreatedEvent extends Event {
    public static readonly TYPE = "webgl-context-created";

    public readonly gl: WebGL2RenderingContext;
    public readonly contextManager: IWebGLContextManager;

    public constructor(
        gl: WebGL2RenderingContext,
        contextManager: IWebGLContextManager
    ) {
        super(WebGLContextCreatedEvent.TYPE, { bubbles: true, composed: true });
        this.gl = gl;
        this.contextManager = contextManager;
    }
}

/**
 * Event dispatched when the browser signals that the WebGL context has been lost.
 */
export class WebGLContextLostEvent extends Event {
    public static readonly TYPE = "webgl-context-lost";

    public constructor() {
        super(WebGLContextLostEvent.TYPE, { bubbles: true, composed: true });
    }
}

/**
 * Event dispatched when the WebGL context is successfully restored.
 */
export class WebGLContextRestoredEvent extends Event {
    public static readonly TYPE = "webgl-context-restored";

    public readonly gl: WebGL2RenderingContext;

    public constructor(gl: WebGL2RenderingContext) {
        super(WebGLContextRestoredEvent.TYPE, { bubbles: true, composed: true });
        this.gl = gl;
    }
}

/**
 * Event dispatched when the canvas backing store or CSS layout dimensions change.
 */
export class WebGLResizeEvent extends Event {
    public static readonly TYPE = "webgl-resize";

    public readonly dimensions: CanvasDimensions;

    public constructor(dimensions: CanvasDimensions) {
        super(WebGLResizeEvent.TYPE, { bubbles: true, composed: true });
        this.dimensions = dimensions;
    }
}

declare global {
    interface HTMLElementEventMap {
        [WebGLContextCreatedEvent.TYPE]: WebGLContextCreatedEvent;
        [WebGLContextLostEvent.TYPE]: WebGLContextLostEvent;
        [WebGLContextRestoredEvent.TYPE]: WebGLContextRestoredEvent;
        [WebGLResizeEvent.TYPE]: WebGLResizeEvent;
    }
}
