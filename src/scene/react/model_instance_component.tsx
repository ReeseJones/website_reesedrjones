import React, { useEffect, useMemo, useRef } from "react";
import { ModelInstance as ProgrammaticModelInstance } from "../models/model_instance";
import type { IModelInstance } from "../models/model_instance_types";
import { ParentNodeContext } from "./scene_context";
import { useSceneNode } from "./use_scene_node";
import type { ModelInstanceProps, IParentNodeContextValue } from "./scene_react_types";

/**
 * Declarative <ModelInstance /> component binding mesh geometry, material styling,
 * and render queue ordering to the 3D scene graph hierarchy.
 */
export function ModelInstance(props: ModelInstanceProps): React.JSX.Element {
    const instanceRef = useRef<ProgrammaticModelInstance | null>(null);
    if (!instanceRef.current) {
        instanceRef.current = new ProgrammaticModelInstance(
            props.geometry,
            props.material,
            props.name
        );
        if (props.renderOrder !== undefined) {
            instanceRef.current.renderOrder = props.renderOrder;
        }
    }
    const instance = instanceRef.current;

    useSceneNode<IModelInstance>(instance, props);

    useEffect(() => {
        if (instance.geometry !== props.geometry) {
            instance.geometry = props.geometry;
        }
        if (instance.material !== props.material) {
            instance.material = props.material;
        }
        if (props.renderOrder !== undefined && instance.renderOrder !== props.renderOrder) {
            instance.renderOrder = props.renderOrder;
        }
    }, [instance, props.geometry, props.material, props.renderOrder]);

    useEffect(() => {
        return () => {
            instanceRef.current = null;
        };
    }, []);

    const contextValue = useMemo<IParentNodeContextValue>(() => ({
        parent: instance,
    }), [instance]);

    return (
        <ParentNodeContext.Provider value={contextValue}>
            {props.children}
        </ParentNodeContext.Provider>
    );
}
