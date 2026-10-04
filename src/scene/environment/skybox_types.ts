import type { ICubeTexture } from "../../webgl/textures/cube_texture_types";
import type { IMeshGeometry } from "../models/mesh_geometry_types";
import type { IModelInstance } from "../models/model_instance_types";
import type { SkyboxMaterialOptions } from "./skybox_material_types";

/**
 * Configuration options for creating a Skybox scene node.
 * Completely decoupled from IWebGLContextManager.
 */
export interface SkyboxOptions extends SkyboxMaterialOptions {
    /** Optional custom mesh geometry. If omitted, defaults to unit CubeGeometry */
    geometry?: IMeshGeometry;
    /** Descriptive scene node label (defaults to "Skybox") */
    name?: string;
    /** Optional explicit node identifier */
    id?: string;
    /** Render queue sort order. Defaults to -100 so it renders first as background */
    renderOrder?: number;
}

/**
 * Scene graph Skybox citizen interface.
 */
export interface ISkybox extends IModelInstance {
    /** Brightness exposure multiplier */
    exposure: number;
    /** RGB color tint */
    tint: [number, number, number];
    /** Y-axis azimuth orientation rotation in radians */
    rotationY: number;
    /** Active cubemap texture */
    cubeTexture: ICubeTexture | null;
}
