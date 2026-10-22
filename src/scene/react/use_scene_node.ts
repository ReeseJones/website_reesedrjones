import { useEffect, useImperativeHandle, useRef } from "react";
import type React from "react";
import { useParentNode } from "./scene_context";
import { DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_UNIT_SCALE } from "./scene_react_constants";
import type { ISceneNode } from "../core/scene_node_types";
import type { Vector3Like } from "../../maths/vector_types";
import type { EulerAngles } from "../core/transform_types";
import type { SceneNodeProps } from "./scene_react_types";

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
    useImperativeHandle(props.ref, () => node, [node]);

    // 2. Scene graph hierarchy attachment and deterministic unmount cleanup
    useEffect(() => {
        parent.addChild(node);
        return () => {
            parent.removeChild(node);
            node.destroy();
        };
    }, [parent, node]);

    // 3. Non-allocating transform & property reconciliation
    const prevPositionRef = useRef<Vector3Like | null>(null);
    const prevRotationRef = useRef<EulerAngles | null>(null);
    const prevScaleRef = useRef<Vector3Like | number | null>(null);

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
            const x = Array.isArray(props.position) ? props.position[0] : props.position.x;
            const y = Array.isArray(props.position) ? props.position[1] : props.position.y;
            const z = Array.isArray(props.position) ? props.position[2] : props.position.z;
            const prev = prevPositionRef.current;
            if (!prev || prev.x !== x || prev.y !== y || prev.z !== z) {
                node.transform.setPosition(x, y, z);
                if (!prev) {
                    prevPositionRef.current = { x, y, z };
                } else {
                    prev.x = x;
                    prev.y = y;
                    prev.z = z;
                }
            }
        } else if (prevPositionRef.current !== null) {
            node.transform.setPosition(DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_ORIGIN);
            prevPositionRef.current = null;
        }

        // Rotation reconciliation (Euler angles: pitch, yaw, roll)
        if (props.rotation !== undefined) {
            const pitch = Array.isArray(props.rotation) ? props.rotation[0] : props.rotation.pitch;
            const yaw = Array.isArray(props.rotation) ? props.rotation[1] : props.rotation.yaw;
            const roll = Array.isArray(props.rotation) ? props.rotation[2] : props.rotation.roll;
            const prev = prevRotationRef.current;
            if (!prev || prev.pitch !== pitch || prev.yaw !== yaw || prev.roll !== roll) {
                node.transform.setRotationEuler(pitch, yaw, roll);
                if (!prev) {
                    prevRotationRef.current = { pitch, yaw, roll };
                } else {
                    prev.pitch = pitch;
                    prev.yaw = yaw;
                    prev.roll = roll;
                }
            }
        } else if (prevRotationRef.current !== null) {
            node.transform.setRotationEuler(DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_ORIGIN, DEFAULT_TRANSFORM_ORIGIN);
            prevRotationRef.current = null;
        }

        // Scale reconciliation (scalar, Vector3Like, or 3-component tuple)
        if (props.scale !== undefined) {
            if (typeof props.scale === "number") {
                const prev = prevScaleRef.current;
                if (typeof prev !== "number" || prev !== props.scale) {
                    node.transform.setUniformScale(props.scale);
                    prevScaleRef.current = props.scale;
                }
            } else {
                const sx = Array.isArray(props.scale) ? props.scale[0] : props.scale.x;
                const sy = Array.isArray(props.scale) ? props.scale[1] : props.scale.y;
                const sz = Array.isArray(props.scale) ? props.scale[2] : props.scale.z;
                const prev = prevScaleRef.current;
                if (typeof prev === "number" || !prev || prev.x !== sx || prev.y !== sy || prev.z !== sz) {
                    node.transform.setScale(sx, sy, sz);
                    if (!prev || typeof prev === "number") {
                        prevScaleRef.current = { x: sx, y: sy, z: sz };
                    } else {
                        prev.x = sx;
                        prev.y = sy;
                        prev.z = sz;
                    }
                }
            }
        } else if (prevScaleRef.current !== null) {
            node.transform.setUniformScale(DEFAULT_TRANSFORM_UNIT_SCALE);
            prevScaleRef.current = null;
        }
    }, [node, props.name, props.visible, props.position, props.rotation, props.scale]);
}
