import { VertexLayoutSpec } from "../webgl/vertex_layout";
import { UniformDeclaration } from "../webgl/shader_program";

/**
 * Declarative vertex layout configuration for star particles in the galaxy backdrop.
 * Matches layout locations defined in galaxy_orb.vert and galaxy_pinprick.vert shaders.
 */
export const STAR_VERTEX_LAYOUT: VertexLayoutSpec = {
    attributes: [
        {
            nameOrLocation: 0,
            description: "Orbital Radius from Galactic Core (a_radius)",
            size: 1,
        },
        {
            nameOrLocation: 1,
            description: "Base Angle / Initial Spiral Arm Theta (a_baseAngle)",
            size: 1,
        },
        {
            nameOrLocation: 2,
            description: "Vertical Z Offset / Disk Height Displacement (a_zOffset)",
            size: 1,
        },
        {
            nameOrLocation: 3,
            description: "Base Star Point Size Scale (a_size)",
            size: 1,
        },
        {
            nameOrLocation: 4,
            description: "Spectral Type / Temperature Color Index (a_spectralType)",
            size: 1,
        },
        {
            nameOrLocation: 5,
            description: "Micro-drift Scintillation Phase Offset (a_driftPhase)",
            size: 1,
        },
    ],
};

/**
 * Declared uniforms schema for the galaxy backdrop shaders (orb and pinprick).
 */
export const GALAXY_UNIFORM_DECLARATIONS: UniformDeclaration[] = [
    { name: "u_viewProjectionMatrix", type: "mat4", description: "Combined 4x4 View-Projection Camera Matrix" },
    { name: "u_modelViewMatrix", type: "mat4", description: "4x4 Model-View Transformation Matrix" },
    { name: "u_time", type: "float", description: "Total elapsed animation time in seconds" },
    { name: "u_rotationSpeed", type: "float", description: "Base galaxy disk angular velocity" },
    { name: "u_differentialSpeed", type: "float", description: "Keplerian-style differential rotation falloff speed" },
    { name: "u_driftSpeed", type: "float", description: "Stellar micro-drift speed multiplier" },
    { name: "u_driftAmplitude", type: "float", description: "Stellar micro-drift position perturbation amplitude" },
    { name: "u_pointScale", type: "float", description: "Global point sprite rendering scale" },
    { name: "u_minPointSize", type: "float", description: "Minimum point sprite size in physical pixels" },
    { name: "u_maxPointSize", type: "float", description: "Maximum point sprite size in physical pixels" },
    { name: "u_viewportHeight", type: "float", description: "Backing store viewport height in physical pixels" },
    { name: "u_nearFadeDistance", type: "float", description: "Near plane camera fade out distance threshold" },
    { name: "u_coreColor", type: "vec3", description: "RGB color vector for galactic core stars" },
    { name: "u_coreBlazeColor", type: "vec3", description: "RGB color vector for high-density core center" },
    { name: "u_armInnerColor", type: "vec3", description: "RGB color vector for inner spiral arms" },
    { name: "u_armOuterColor", type: "vec3", description: "RGB color vector for outer spiral arm tips" },
    { name: "u_accentColor", type: "vec3", description: "RGB color vector for hot star spectral accents" },
    { name: "u_coreGlowBoost", type: "float", description: "Galactic core glow intensity multiplier" },
];
