import React from "react";
import { DEFAULT_GALAXY_SCENE_PRIORITY } from "./galaxy_scene_constants";
import { DEFAULT_GALAXY_PARAMETERS } from "./parameters/index";
import type { GalaxySceneProps } from "./galaxy_scene_types";

/**
 * Declarative 3D galaxy backdrop scene composed of <rj-scene>,
 * <rj-galaxy-camera>, <rj-galactic-cloud>, and <rj-galaxy-stars>.
 */
export function GalaxyScene({
    controller,
    params: rawParams,
    priority = DEFAULT_GALAXY_SCENE_PRIORITY,
    clearDepth = false,
}: GalaxySceneProps): React.JSX.Element {
    const activeParams = controller?.params ?? rawParams ?? DEFAULT_GALAXY_PARAMETERS;

    return (
        <rj-scene priority={priority} clear-depth={clearDepth}>
            <rj-galaxy-camera params={activeParams} make-default />
            <rj-galactic-cloud params={activeParams} />
            <rj-galaxy-stars params={activeParams} />
        </rj-scene>
    );
}
