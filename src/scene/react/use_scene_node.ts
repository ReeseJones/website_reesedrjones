import { useEffect, useImperativeHandle, useRef } from "react";
import type React from "react";
import { useParentNode } from "./scene_context";
import { DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_UNIT_SCALE } from "./scene_react_constants";
import type { ISceneNode } from "../core/scene_node_types";
import type { EulerTuple, SceneNodeProps, Vector3Tuple } from "./scene_react_types";

export interface UseSceneNodeProps<TNode extends ISceneNode = ISceneNode> extends Omit<SceneNodeProps, "ref"> {
    ref?: React.Ref<TNode>;
}

/**
 * Internal lifecycle hook managing scene node attachment to parent,
 * deterministic unmount cleanup, React 19 ref assignment, and non-allocating
 * transform reconciliation.
 */
export function useSceneNode<TNode extends ISceneNode = ISceneNode>(
    node: TNode,
    props: UseSceneNodeProps<TNode>
): void {
    const { parent } = useParentNode();

    // 1. React 19 ref forwarding / imperative assignment
    useImperativeHandle(props.ref, () => node, [node, props.ref]);

    // 2. Scene graph hierarchy attachment and deterministic unmount cleanup
    useEffect(() => {
        parent.addChild(node);
        return () => {
            parent.removeChild(node);
            node.destroy();
        };
    }, [parent, node]);

    // 3. Non-allocating transform & property reconciliation
    const prevPositionRef = useRef<Vector3Tuple | null>(null);
    const prevRotationRef = useRef<EulerTuple | null>(null);
    const prevScaleRef = useRef<Vector3Tuple | number | null>(null);

    useEffect(() => {
        // Name reconciliation
        if (props.name !== undefined && node.name !== props.name) {
            node.name = props.name;
        }

        // Visibility reconciliation
        if (props.visible !== undefined && node.visible !== props.visible) {
            node.visible = props.visible;
        }

        // Position reconciliation
        if (props.position !== undefined) {
            const [x, y, z] = props.position;
            const prev = prevPositionRef.current;
            if (!prev || prev[0] !== x || prev[1] !== y || prev[2] !== z) {
                node.transform.setPosition(x, y, z);
                if (!prev) {
                    prevPositionRef.current = [x, y, z];
                } else {
                    prev[0] = x;
                    prev[1] = y;
                    prev[2] = z;
                }
            }
        } else if (prevPositionRef.current !== null) {
            node.transform.setPosition(DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_ORIGIN);
            prevPositionRef.current = null;
        }

        // Rotation reconciliation (Euler angles: pitch, yaw, roll)
        if (props.rotation !== undefined) {
            const [pitch, yaw, roll] = props.rotation;
            const prev = prevRotationRef.current;
            if (!prev || prev[0] !== pitch || prev[1] !== yaw || prev[2] !== roll) {
                node.transform.setRotationEuler(pitch, yaw, roll);
                if (!prev) {
                    prevRotationRef.current = [pitch, yaw, roll];
                } else {
                    prev[0] = pitch;
                    prev[1] = yaw;
                    prev[2] = roll;
                }
            }
        } else if (prevRotationRef.current !== null) {
            node.transform.setRotationEuler(DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_ORIGIN);
            prevRotationRef.current = null;
        }

        // Scale reconciliation (scalar or 3-component tuple)
        if (props.scale !== undefined) {
            if (typeof props.scale === "number") {
                const prev = prevScaleRef.current;
                if (typeof prev !== "number" || prev !== props.scale) {
                    node.transform.setUniformScale(props.scale);
                    prevScaleRef.current = props.scale;
                }
            } else {
                const [sx, sy, sz] = props.scale;
                const prev = prevScaleRef.current;
                if (!Array.isArray(prev) || prev[0] !== sx || prev[1] !== sy || prev[2] !== sz) {
                    node.transform.setScale(sx, sy, sz);
                    if (!Array.isArray(prev)) {
                        prevScaleRef.current = [sx, sy, sz];
                    } else {
                        prev[0] = sx;
                        prev[1] = sy;
                        prev[2] = sz;
                    }
                }
            }
        } else if (prevScaleRef.current !== null) {
            node.transform.setUniformScale(DEFAULT_TRANSFORM_UNIT_SCALE);
            prevScaleRef.current = null;
        }
    }, [node, props.name, props.visible, props.position, props.rotation, props.scale]);
}
