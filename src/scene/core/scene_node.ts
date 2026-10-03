import { mat4 } from "gl-matrix";
import { Transform } from "./transform";
import type { ISceneNode, NodeTraverseCallback } from "./scene_node_types";

let nextNodeId = 0;
function generateNodeId(name: string): string {
    return `${name}_${++nextNodeId}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Spatial base class representing an entity in the 3D scene hierarchy.
 * Manages local transform, cached world transformation matrix, parent-child relations,
 * two-tier dirty flagging, and hierarchical visibility cascading.
 */
export class SceneNode implements ISceneNode {
    public readonly id: string;
    public name: string;

    private readonly _transform: Transform;
    private readonly _worldMatrix: Float32Array = new Float32Array(16);
    private _parent: ISceneNode | null = null;
    private readonly _children: ISceneNode[] = [];

    private _visible: boolean = true;
    private _computedVisible: boolean = true;
    private _isWorldDirty: boolean = true;

    constructor(name: string = "SceneNode", id?: string) {
        this.name = name;
        this.id = id ?? generateNodeId(name);
        this._transform = new Transform(() => this.markWorldDirty());
        mat4.identity(this._worldMatrix as unknown as mat4);
    }

    public get transform(): Transform {
        return this._transform;
    }

    public get worldMatrix(): Float32Array {
        return this._worldMatrix;
    }

    public get parent(): ISceneNode | null {
        return this._parent;
    }

    public get children(): readonly ISceneNode[] {
        return this._children;
    }

    public get visible(): boolean {
        return this._visible;
    }

    public set visible(val: boolean) {
        if (this._visible !== val) {
            this._visible = val;
            this.markWorldDirty();
        }
    }

    public get computedVisible(): boolean {
        return this._computedVisible;
    }

    public get isWorldDirty(): boolean {
        return this._isWorldDirty;
    }

    public markWorldDirty(): void {
        this._isWorldDirty = true;
        for (let i = 0; i < this._children.length; i++) {
            this._children[i].markWorldDirty();
        }
    }

    public addChild(child: ISceneNode): this {
        if (child === this) {
            return this;
        }

        if (child.parent === this) {
            return this;
        }

        if (child.parent) {
            child.removeFromParent();
        }

        if (child instanceof SceneNode) {
            child._parent = this;
        }

        this._children.push(child);
        child.markWorldDirty();
        return this;
    }

    public removeChild(child: ISceneNode): boolean {
        const index = this._children.indexOf(child);
        if (index === -1) {
            return false;
        }

        this._children.splice(index, 1);

        if (child instanceof SceneNode) {
            child._parent = null;
        }

        child.markWorldDirty();
        return true;
    }

    public removeFromParent(): void {
        if (this._parent) {
            this._parent.removeChild(this);
        }
    }

    public traverse(callback: NodeTraverseCallback): void {
        callback(this);
        for (let i = 0; i < this._children.length; i++) {
            this._children[i].traverse(callback);
        }
    }

    public updateWorldTransform(forceWorldDirty: boolean = false): void {
        // Step 1: Update local TRS matrix if dirty
        const localDirty = this._transform.updateLocalMatrix();

        // Step 2: Determine if world matrix needs re-evaluation
        const needsWorldUpdate = this._isWorldDirty || forceWorldDirty || localDirty;

        if (needsWorldUpdate) {
            if (!this._parent) {
                mat4.copy(
                    this._worldMatrix as unknown as mat4,
                    this._transform.localMatrix as unknown as mat4
                );
            } else {
                mat4.multiply(
                    this._worldMatrix as unknown as mat4,
                    this._parent.worldMatrix as unknown as mat4,
                    this._transform.localMatrix as unknown as mat4
                );
            }
            this._isWorldDirty = false;
        }

        // Step 3: Cascading computed visibility
        if (!this._parent) {
            this._computedVisible = this._visible;
        }

        // Step 4: Recursively update children
        for (let i = 0; i < this._children.length; i++) {
            const child = this._children[i];
            const childComputedVisible = this._computedVisible && child.visible;
            if (child instanceof SceneNode) {
                child._computedVisible = childComputedVisible;
            }
            child.updateWorldTransform(needsWorldUpdate);
        }
    }

    public destroy(): void {
        this.removeFromParent();
        const childrenCopy = [...this._children];
        for (let i = 0; i < childrenCopy.length; i++) {
            childrenCopy[i].destroy();
        }
        this._children.length = 0;
    }
}
