import React, { useMemo } from "react";
import { DEFAULT_GALAXY_SCENE_PRIORITY } from "./galaxy_scene_constants";
import { DEFAULT_GALAXY_PARAMETERS } from "./parameters/index";
import type { GalaxySceneProps } from "./galaxy_scene_types";
import { BillboardMode } from "../scene/sprites/sprite_instance_types";
import { SpritePinMaterial } from "../scene/sprites/sprite_pin_material";
import { SpriteTextureMaterial } from "../scene/sprites/sprite_texture_material";
import { ImageTexture } from "../webgl/textures/image_texture";
import faviconUrl from "url:../images/favicon-32x32.png";

import { generateGalacticArcRoute } from "./galaxy_route";

const ARC_ROUTE = generateGalacticArcRoute({ startRadius: 1.8 });

/**
 * Declarative 3D galaxy backdrop scene composed of <rj-scene>,
 * <rj-galaxy-camera>, <rj-galactic-cloud>, <rj-galaxy-stars>, and <rj-sprite-instance>.
 */
export function GalaxyScene({
    controller,
    params: rawParams,
    priority = DEFAULT_GALAXY_SCENE_PRIORITY,
    clearDepth = false,
}: GalaxySceneProps): React.JSX.Element {
    const activeParams = controller?.params ?? rawParams ?? DEFAULT_GALAXY_PARAMETERS;

    const centerPinMaterial = useMemo(
        () =>
            new SpritePinMaterial({
                tint: { r: 1.0, g: 0.2, b: 0.2, a: 1.0 },
                innerColor: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                alwaysOnTop: true,
            }),
        []
    );

    const texturePinMaterial = useMemo(() => {
        const texture = new ImageTexture(faviconUrl, {
            generateMipmaps: false,
            minFilter: "linear",
            magFilter: "linear",
        });
        return new SpriteTextureMaterial({
            texture,
            tint: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
            alwaysOnTop: true,
            alphaCutoff: 0.05,
        });
    }, []);

    return (
        <rj-scene priority={priority} clear-depth={clearDepth}>
            <rj-galaxy-camera params={activeParams} make-default />
            <rj-galactic-cloud params={activeParams} />
            <rj-galaxy-stars params={activeParams}>
                <rj-polyline
                    name="GalacticTransitRoute"
                    points={ARC_ROUTE.points}
                    line-width={16}
                    dash-speed={1}
                    dash-frequency={5}
                    glow-intensity={0.3}
                />
                <rj-sprite-instance
                    name="GalaxyCenterPin"
                    position={ARC_ROUTE.startWaypoint}
                    size={{ x: 36, y: 48 }}
                    material={centerPinMaterial}
                    billboardMode={BillboardMode.Cylindrical}
                />
                <rj-sprite-instance
                    name="GalaxyTexturePin"
                    position={ARC_ROUTE.endWaypoint}
                    size={{ x: 32, y: 32 }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    material={texturePinMaterial}
                    billboardMode={BillboardMode.Cylindrical}
                />
            </rj-galaxy-stars>
        </rj-scene>
    );
}
