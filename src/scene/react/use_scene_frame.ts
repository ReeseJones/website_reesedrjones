import { useEffect, useRef } from "react";
import { useScene } from "./scene_context";
import { DEFAULT_FRAME_SUBSCRIBER_PRIORITY } from "../core/animation_frame_manager_constants";
import type { SceneFrameCallback } from "../core/scene_types";

/**
 * Subscribes a behavior or simulation callback to the <Scene /> component's
 * independent, demand-driven requestAnimationFrame simulation loop.
 *
 * Stores the callback in a ref so inline arrow callbacks never trigger
 * re-subscription across React renders.
 *
 * @param callback Function invoked on each simulation tick with { scene, activeCamera, timeInfo }
 * @param priority Execution priority (lower numbers run first; defaults to 0)
 */
export function useSceneFrame(
    callback: SceneFrameCallback,
    priority: number = DEFAULT_FRAME_SUBSCRIBER_PRIORITY
): void {
    const { subscribeFrame } = useScene();
    const callbackRef = useRef<SceneFrameCallback>(callback);
    callbackRef.current = callback;

    useEffect(() => {
        return subscribeFrame((state) => {
            callbackRef.current(state);
        }, priority);
    }, [subscribeFrame, priority]);
}
