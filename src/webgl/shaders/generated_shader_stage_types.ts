/* Auto-generated shader stage registry types. Do not edit directly. */

import type {
    GalacticCloudVertInputs,
    GalacticCloudVertUniforms,
    GalacticCloudVertOutputs,
} from "../../galaxy_backdrop/shaders/galactic_cloud.vert";
import type {
    GalaxyOrbVertInputs,
    GalaxyOrbVertUniforms,
    GalaxyOrbVertOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_orb.vert";
import type {
    GalaxyPinprickVertInputs,
    GalaxyPinprickVertUniforms,
    GalaxyPinprickVertOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_pinprick.vert";
import type {
    MeshStandardVertInputs,
    MeshStandardVertUniforms,
    MeshStandardVertOutputs,
} from "../../scene/shaders/mesh_standard.vert";
import type {
    PolylineRibbonVertInputs,
    PolylineRibbonVertUniforms,
    PolylineRibbonVertOutputs,
} from "../../scene/shaders/polyline_ribbon.vert";
import type {
    SkyboxVertInputs,
    SkyboxVertUniforms,
    SkyboxVertOutputs,
} from "../../scene/shaders/skybox.vert";
import type {
    SpriteBillboardVertInputs,
    SpriteBillboardVertUniforms,
    SpriteBillboardVertOutputs,
} from "../../scene/shaders/sprite_billboard.vert";
import type {
    GalacticCloudFragInputs,
    GalacticCloudFragUniforms,
    GalacticCloudFragOutputs,
} from "../../galaxy_backdrop/shaders/galactic_cloud.frag";
import type {
    GalaxyOrbFragInputs,
    GalaxyOrbFragUniforms,
    GalaxyOrbFragOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_orb.frag";
import type {
    GalaxyPinprickFragInputs,
    GalaxyPinprickFragUniforms,
    GalaxyPinprickFragOutputs,
} from "../../galaxy_backdrop/shaders/galaxy_pinprick.frag";
import type {
    PolylineRibbonFragInputs,
    PolylineRibbonFragUniforms,
    PolylineRibbonFragOutputs,
} from "../../scene/shaders/polyline_ribbon.frag";
import type {
    SkyboxFragInputs,
    SkyboxFragUniforms,
    SkyboxFragOutputs,
} from "../../scene/shaders/skybox.frag";
import type {
    SpriteSdfPinFragInputs,
    SpriteSdfPinFragUniforms,
    SpriteSdfPinFragOutputs,
} from "../../scene/shaders/sprite_sdf_pin.frag";
import type {
    SpriteTextureFragInputs,
    SpriteTextureFragUniforms,
    SpriteTextureFragOutputs,
} from "../../scene/shaders/sprite_texture.frag";
import type {
    UnlitFragInputs,
    UnlitFragUniforms,
    UnlitFragOutputs,
} from "../../scene/shaders/unlit.frag";

export const VERTEX_SHADER_KEYS = [
    "galactic_cloud",
    "galaxy_orb",
    "galaxy_pinprick",
    "mesh_standard",
    "polyline_ribbon",
    "skybox",
    "sprite_billboard",
] as const;
export type VertexShaderKey = (typeof VERTEX_SHADER_KEYS)[number];

export const FRAGMENT_SHADER_KEYS = [
    "galactic_cloud",
    "galaxy_orb",
    "galaxy_pinprick",
    "polyline_ribbon",
    "skybox",
    "sprite_sdf_pin",
    "sprite_texture",
    "unlit",
] as const;
export type FragmentShaderKey = (typeof FRAGMENT_SHADER_KEYS)[number];

export interface VertexInputMap {
    galactic_cloud: GalacticCloudVertInputs;
    galaxy_orb: GalaxyOrbVertInputs;
    galaxy_pinprick: GalaxyPinprickVertInputs;
    mesh_standard: MeshStandardVertInputs;
    polyline_ribbon: PolylineRibbonVertInputs;
    skybox: SkyboxVertInputs;
    sprite_billboard: SpriteBillboardVertInputs;
}

export interface VertexUniformMap {
    galactic_cloud: GalacticCloudVertUniforms;
    galaxy_orb: GalaxyOrbVertUniforms;
    galaxy_pinprick: GalaxyPinprickVertUniforms;
    mesh_standard: MeshStandardVertUniforms;
    polyline_ribbon: PolylineRibbonVertUniforms;
    skybox: SkyboxVertUniforms;
    sprite_billboard: SpriteBillboardVertUniforms;
}

export interface VertexOutputMap {
    galactic_cloud: GalacticCloudVertOutputs;
    galaxy_orb: GalaxyOrbVertOutputs;
    galaxy_pinprick: GalaxyPinprickVertOutputs;
    mesh_standard: MeshStandardVertOutputs;
    polyline_ribbon: PolylineRibbonVertOutputs;
    skybox: SkyboxVertOutputs;
    sprite_billboard: SpriteBillboardVertOutputs;
}

export interface FragmentInputMap {
    galactic_cloud: GalacticCloudFragInputs;
    galaxy_orb: GalaxyOrbFragInputs;
    galaxy_pinprick: GalaxyPinprickFragInputs;
    polyline_ribbon: PolylineRibbonFragInputs;
    skybox: SkyboxFragInputs;
    sprite_sdf_pin: SpriteSdfPinFragInputs;
    sprite_texture: SpriteTextureFragInputs;
    unlit: UnlitFragInputs;
}

export interface FragmentUniformMap {
    galactic_cloud: GalacticCloudFragUniforms;
    galaxy_orb: GalaxyOrbFragUniforms;
    galaxy_pinprick: GalaxyPinprickFragUniforms;
    polyline_ribbon: PolylineRibbonFragUniforms;
    skybox: SkyboxFragUniforms;
    sprite_sdf_pin: SpriteSdfPinFragUniforms;
    sprite_texture: SpriteTextureFragUniforms;
    unlit: UnlitFragUniforms;
}

export interface FragmentOutputMap {
    galactic_cloud: GalacticCloudFragOutputs;
    galaxy_orb: GalaxyOrbFragOutputs;
    galaxy_pinprick: GalaxyPinprickFragOutputs;
    polyline_ribbon: PolylineRibbonFragOutputs;
    skybox: SkyboxFragOutputs;
    sprite_sdf_pin: SpriteSdfPinFragOutputs;
    sprite_texture: SpriteTextureFragOutputs;
    unlit: UnlitFragOutputs;
}
