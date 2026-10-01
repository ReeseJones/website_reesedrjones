import { VertexLayoutSpec } from "../webgl/vertex_layout";
import { UniformDeclaration } from "../webgl/shader_program";

/**
 * Declarative vertex layout specification for fullscreen quad rendering in the celestial cloud horizon pass.
 * Attributes:
 * - 0: a_position (vec2 screen space clip coordinates)
 */
export const QUAD_VERTEX_LAYOUT: VertexLayoutSpec = {
    attributes: [
        {
            nameOrLocation: 0,
            description: "2D Screen-space clip position coordinates (a_position)",
            size: 2,
        },
    ],
};

/**
 * Declared uniform schema for the celestial cloud horizon shader.
 */
export const GALACTIC_CLOUD_UNIFORM_DECLARATIONS: UniformDeclaration[] = [
    { name: "u_aspect", type: "float", description: "Canvas viewport aspect ratio (width / height)" },
    { name: "u_fovScale", type: "float", description: "Tangent FOV scale factor for view-ray reconstruction" },
    { name: "u_pitch", type: "float", description: "Base camera pitch rotation angle in radians" },
    { name: "u_yaw", type: "float", description: "Base camera yaw rotation angle in radians" },
    { name: "u_roll", type: "float", description: "Base camera roll rotation angle in radians" },
    { name: "u_pitchOffset", type: "float", description: "Parallax pitch offset from pointer/device tilt" },
    { name: "u_yawOffset", type: "float", description: "Parallax yaw offset from pointer/device tilt" },
    { name: "u_horizonIntensity", type: "float", description: "Background cloud glow opacity intensity" },
    { name: "u_horizonThickness", type: "float", description: "Background cloud vertical falloff thickness" },
    { name: "u_horizonColorCenter", type: "vec3", description: "RGB color vector for inner horizon center" },
    { name: "u_horizonColorOuter", type: "vec3", description: "RGB color vector for outer horizon gradient edge" },
];
