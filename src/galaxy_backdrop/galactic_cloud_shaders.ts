import galacticCloudVert from "./shaders/galactic_cloud.vert";
import galacticCloudFrag from "./shaders/galactic_cloud.frag";

/**
 * GLSL ES 3.00 shader sources for the Celestial Horizon background pass.
 * Implements full-screen quad view-ray reconstruction and a multi-stop celestial horizon gradient band.
 */
export const GALACTIC_CLOUD_VERTEX_SHADER = galacticCloudVert;
export const GALACTIC_CLOUD_FRAGMENT_SHADER = galacticCloudFrag;
