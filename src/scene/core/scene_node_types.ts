import type { ITransform } from "./transform_types";

export type NodeTraverseCallback = (node: ISceneNode) => void;

export interface ISceneNode {
    /** Unique identifier */
    readonly id: string;

    /** Human-readable label for debugging */
    name: string;

    /** Spatial transform relative to parent */
    readonly transform: ITransform;

    /** Cached column-major 4x4 world transformation matrix */
    readonly worldMatrix: Float32Array;

    /** Parent node (null if root or detached) */
    readonly parent: ISceneNode | null;

    /** List of direct child nodes */
    readonly children: readonly ISceneNode[];

    /** Local visibility flag */
    visible: boolean;

    /** Effective visibility inheriting parent state */
    readonly computedVisible: boolean;

    /** Adds a child node to this hierarchy */
    addChild(child: ISceneNode): this;

    /** Removes a child node from this hierarchy */
    removeChild(child: ISceneNode): boolean;

    /** Removes this node from its parent */
    removeFromParent(): void;

    /** Marks world transform dirty on this node and all descendants */
    markWorldDirty(): void;

    /** Traverses this node and all descendants in depth-first order */
    traverse(callback: NodeTraverseCallback): void;

    /** Recursively updates local and world transformation matrices */
    updateWorldTransform(forceWorldDirty?: boolean): void;

    /** Registers a callback to be invoked when destroy() is called. Returns an unsubscribe function. */
    onDestroy(callback: () => void): () => void;

    /** Frees node resources and detaches from graph */
    destroy(): void;
}
