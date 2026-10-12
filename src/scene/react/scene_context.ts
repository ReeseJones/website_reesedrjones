import { createContext, useContext } from "react";
import type { ISceneContextValue, IParentNodeContextValue } from "./scene_react_types";

/**
 * React Context providing the active root IScene instance and camera registration.
 */
export const SceneContext = createContext<ISceneContextValue | null>(null);

/**
 * React Context providing the immediate parent ISceneNode in the scene hierarchy.
 */
export const ParentNodeContext = createContext<IParentNodeContextValue | null>(null);

/**
 * Hook to access the root SceneContext providing the active IScene, active camera,
 * and camera registration interface.
 * Throws a descriptive error if used outside a <Scene> provider.
 */
export function useScene(): ISceneContextValue {
    const context = useContext(SceneContext);
    if (!context) {
        throw new Error("useScene must be used within a <Scene> component.");
    }
    return context;
}

/**
 * Hook to access the immediate parent ISceneNode in the scene graph hierarchy.
 * Throws a descriptive error if used outside a scene node provider (<Scene>, <Group>, etc.).
 */
export function useParentNode(): IParentNodeContextValue {
    const context = useContext(ParentNodeContext);
    if (!context) {
        throw new Error("useParentNode must be used within a scene node provider (<Scene>, <Group>, etc.).");
    }
    return context;
}
