import React, { useEffect, useMemo, useRef } from "react";
import { SceneNode } from "../core/scene_node";
import { ParentNodeContext } from "./scene_context";
import { useSceneNode } from "./use_scene_node";
import type { GroupProps, IParentNodeContextValue } from "./scene_react_types";

/**
 * Declarative <Group /> component mapping to an intermediate SceneNode in the graph.
 * Allows spatial grouping, transform inheritance, and hierarchical nesting.
 */
export function Group(props: GroupProps): React.JSX.Element {
    const nodeRef = useRef<SceneNode | null>(null);
    if (!nodeRef.current) {
        nodeRef.current = new SceneNode(props.name);
    }
    const node = nodeRef.current;

    useSceneNode(node, props);

    useEffect(() => {
        return () => {
            nodeRef.current = null;
        };
    }, []);

    const contextValue = useMemo<IParentNodeContextValue>(() => ({
        parent: node,
    }), [node]);

    return (
        <ParentNodeContext.Provider value={contextValue}>
            {props.children}
        </ParentNodeContext.Provider>
    );
}
