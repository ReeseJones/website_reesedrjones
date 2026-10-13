import React, { useRef } from "react";
import { Scene } from "../scene/react/scene_component";
import { DEFAULT_GALAXY_PARAMETERS } from "./parameters/index";
import { GalaxyCameraRig } from "./galaxy_camera_rig";
import { GalacticCloudModel } from "./galactic_cloud_model";
import { GalaxyStarsModel } from "./galaxy_stars_model";
import { DEFAULT_GALAXY_SCENE_PRIORITY } from "./galaxy_scene_constants";
import type { GalaxyParallaxState, GalaxySceneProps } from "./galaxy_scene_types";

/**
 * Declarative 3D galaxy backdrop scene composed of <Scene />, <GalaxyCameraRig />,
 * <GalacticCloudModel />, and <GalaxyStarsModel />.
 */
export function GalaxyScene({
    controller,
    params: rawParams,
    priority = DEFAULT_GALAXY_SCENE_PRIORITY,
    clearDepth = false,
}: GalaxySceneProps): React.JSX.Element {
    const activeParams = controller?.params ?? rawParams ?? DEFAULT_GALAXY_PARAMETERS;
    const parallaxRef = useRef<GalaxyParallaxState>({
        pitchOffset: 0,
        yawOffset: 0,
    });

    return (
        <Scene priority={priority} clearDepth={clearDepth}>
            <GalaxyCameraRig params={activeParams} parallaxRef={parallaxRef} />
            <GalacticCloudModel params={activeParams} parallaxRef={parallaxRef} />
            <GalaxyStarsModel params={activeParams} />
        </Scene>
    );
}
