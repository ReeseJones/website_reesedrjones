import React, { useMemo } from "react";
import { DEFAULT_GALAXY_SCENE_PRIORITY } from "./galaxy_scene_constants";
import { DEFAULT_GALAXY_PARAMETERS } from "./parameters/index";
import type { GalaxySceneProps } from "./galaxy_scene_types";
import { BillboardMode } from "../scene/sprites/sprite_instance_types";
import { SpritePinMaterial } from "../scene/sprites/sprite_pin_material";
import { SpriteTextureMaterial } from "../scene/sprites/sprite_texture_material";
import { ImageTexture } from "../webgl/textures/image_texture";
import type { Vector2Like, Vector3Like } from "../maths/vector_types";
import faviconUrl from "url:../images/favicon-32x32.png";

import { generateGalacticArcRoute } from "./galaxy_route";

const ARC_ROUTE = generateGalacticArcRoute();
const CENTER_PIN_POSITION: Vector3Like = ARC_ROUTE.startWaypoint;
const CENTER_PIN_SIZE: Vector2Like = { x: 36, y: 48 };

const TEXTURE_PIN_POSITION: Vector3Like = ARC_ROUTE.endWaypoint;
const TEXTURE_PIN_SIZE: Vector2Like = { x: 32, y: 32 };
const TEXTURE_PIN_ANCHOR: Vector2Like = { x: 0.5, y: 0.5 };

const GALACTIC_ROUTE_WAYPOINTS: readonly Vector3Like[] = ARC_ROUTE.points;
const GALACTIC_ROUTE_WIDTH = 32;
const GALACTIC_ROUTE_DASH_SPEED = 2.5;
const GALACTIC_ROUTE_DASH_FREQUENCY = 4.0;
const GALACTIC_ROUTE_GLOW_INTENSITY = 0.75;

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
                    points={GALACTIC_ROUTE_WAYPOINTS}
                    line-width={GALACTIC_ROUTE_WIDTH}
                    dash-speed={GALACTIC_ROUTE_DASH_SPEED}
                    dash-frequency={GALACTIC_ROUTE_DASH_FREQUENCY}
                    glow-intensity={GALACTIC_ROUTE_GLOW_INTENSITY}
                />
                <rj-sprite-instance
                    name="GalaxyCenterPin"
                    position={CENTER_PIN_POSITION}
                    size={CENTER_PIN_SIZE}
                    material={centerPinMaterial}
                    billboardMode={BillboardMode.Cylindrical}
                />
                <rj-sprite-instance
                    name="GalaxyTexturePin"
                    position={TEXTURE_PIN_POSITION}
                    size={TEXTURE_PIN_SIZE}
                    anchor={TEXTURE_PIN_ANCHOR}
                    material={texturePinMaterial}
                    billboardMode={BillboardMode.Cylindrical}
                />
            </rj-galaxy-stars>
        </rj-scene>
    );
}
