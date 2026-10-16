import { createContext } from "@lit/context";
import type { IScene, SceneFrameCallback } from "../core/scene_types";
import type { ISceneNode } from "../core/scene_node_types";
import type { ICamera } from "../camera/camera_types";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type { CanvasDimensions } from "../../webgl/canvas/canvas_types";
import type { WebGLSubscriber } from "../../webgl/canvas/subscriber_types";
import type { SceneElement } from "./scene_element";

/**
 * Readonly 3-element tuple representing a 3D coordinate or vector [x, y, z].
 */
export type Vector3Tuple = readonly [number, number, number];

/**
 * Public declarative property inputs for the root SceneElement (<rj-scene>).
 */
export interface SceneElementProps {
    priority?: number;
    clearDepth?: boolean;
}

/**
 * Common declarative property inputs for structural scene graph node elements.
 */
export interface SceneNodeElementProps {
    name?: string;
    position?: Vector3Tuple;
    rotation?: Vector3Tuple;
    scale?: Vector3Tuple;
    visible?: boolean;
}

/**
 * Declarative property inputs for perspective camera elements (<rj-perspective-camera>).
 */
export interface PerspectiveCameraElementProps extends SceneNodeElementProps {
    fov?: number;
    near?: number;
    far?: number;
    aspect?: number;
    makeDefault?: boolean;
}


/**
 * Context provided by an enclosing WebGL canvas host element.
 */
export interface IWebGLCanvasContext {
    readonly gl: WebGL2RenderingContext | null;
    readonly contextManager: IWebGLContextManager;
    readonly dimensions: CanvasDimensions;
    readonly isContextLost: boolean;
    subscribe(subscriber: WebGLSubscriber): () => void;
    requestRender(): void;
}

/**
 * Hierarchical scene context provided by the root <rj-scene> element to descendants.
 */
export interface ISceneContext {
    /** Underlying programmatic root scene instance */
    readonly scene: IScene;
    /** Current active camera appointed to the scene */
    readonly activeCamera: ICamera | null;
    /** Registers a camera with the scene and optionally appoints it as activeCamera */
    registerCamera(camera: ICamera, makeDefault?: boolean): () => void;
    /** Explicitly appoints the active camera or clears it */
    setActiveCamera(camera: ICamera | null): void;
    /** Subscribes a simulation frame callback to the scene loop */
    subscribeFrame(callback: SceneFrameCallback, priority?: number): () => void;
}

/**
 * Context token providing access to the WebGL2 rendering surface and context.
 */
export const webglCanvasContext = createContext<IWebGLCanvasContext>(
    Symbol("rj-webgl-canvas-context")
);

/**
 * Context token providing access to the root IScene instance and camera registry.
 */
export const sceneContext = createContext<ISceneContext>(
    Symbol("rj-scene-context")
);

/**
 * Context token providing access to the immediate parent ISceneNode in the hierarchy.
 */
export const parentNodeContext = createContext<ISceneNode>(
    Symbol("rj-parent-node-context")
);

declare global {
    interface HTMLElementTagNameMap {
        "rj-scene": SceneElement;
    }
}

