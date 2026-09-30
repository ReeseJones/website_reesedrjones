export const GALAXY_ORB_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in float a_radius;
layout(location = 1) in float a_baseAngle;
layout(location = 2) in float a_zOffset;
layout(location = 3) in float a_size;
layout(location = 4) in float a_spectralType;
layout(location = 5) in float a_driftPhase;

uniform mat4 u_viewProjectionMatrix;
uniform mat4 u_modelViewMatrix;
uniform float u_time;
uniform float u_rotationSpeed;
uniform float u_differentialSpeed;
uniform float u_driftSpeed;
uniform float u_driftAmplitude;
uniform float u_pointScale;
uniform float u_minPointSize;
uniform float u_maxPointSize;
uniform float u_viewportHeight;
uniform float u_nearFadeDistance;

out float v_spectralType;
out float v_fade;
out float v_coreFactor;
out float v_pointDist;

void main() {
    // 1. Angular motion with differential rotation
    // Inner stars have slightly higher angular velocity; arms rotate as a cohesive wave
    float diffOffset = (u_differentialSpeed / max(1.2, a_radius)) * u_time;
    float theta = a_baseAngle + (u_rotationSpeed * u_time) + diffOffset;

    // 2. Micro-drift and stellar scintillation
    float driftTime = u_time * u_driftSpeed + a_driftPhase;
    float dr = sin(driftTime * 1.6) * u_driftAmplitude;
    float dz = cos(driftTime * 2.3) * (u_driftAmplitude * 0.6);
    float r = max(0.02, a_radius + dr);

    // Galaxy disk lies on the X-Z plane with Y as vertical axis
    float posX = r * cos(theta);
    float posZ = r * sin(theta);
    float posY = a_zOffset + dz;

    vec4 worldPos = vec4(posX, posY, posZ, 1.0);
    vec4 viewPos = u_modelViewMatrix * worldPos;
    gl_Position = u_viewProjectionMatrix * worldPos;

    // 3. Perspective Size Attenuation
    // As foreground arms sweep near the camera (-viewPos.z gets small), points expand into large glowing discs
    float dist = max(0.06, -viewPos.z);
    v_pointDist = dist;

    float pSize = (a_size * u_pointScale * (u_viewportHeight / 900.0)) / dist;
    gl_PointSize = clamp(pSize, u_minPointSize, u_maxPointSize);

    // 4. Smooth Near-Plane Dissolve
    // Prevent harsh popping when a star sweeps within the camera near-clipping threshold
    v_fade = smoothstep(0.08, u_nearFadeDistance, dist);

    // 5. Core Proximity
    v_coreFactor = clamp(1.0 - (a_radius / 3.2), 0.0, 1.0);
    v_spectralType = a_spectralType;
}
`;

export const GALAXY_ORB_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float v_spectralType;
in float v_fade;
in float v_coreFactor;
in float v_pointDist;

uniform vec3 u_coreColor;
uniform vec3 u_coreBlazeColor;
uniform vec3 u_armInnerColor;
uniform vec3 u_armOuterColor;
uniform vec3 u_accentColor;
uniform float u_coreGlowBoost;

out vec4 fragColor;

void main() {
    // Distance from center of point sprite [0.0, 0.5]
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);

    if (distSq > 0.25) {
        discard;
    }

    // Soft Gaussian profile: combining an outer airy halo with a brilliant pinpoint core
    float softGlow = exp(-distSq * 14.0);
    float sharpCore = exp(-distSq * 56.0);
    float intensity = mix(softGlow, sharpCore, 0.38);

    // Spectral Classification & Palette Blending
    // 0.0 - 0.25: Core golden amber to blazing white-hot
    // 0.25 - 0.55: Transition to bright electric cyan
    // 0.55 - 0.80: Cobalt blue outer arm stars
    // 0.80 - 1.00: Deep violet nebula/dust accents
    vec3 color;
    if (v_spectralType < 0.25) {
        float t = v_spectralType / 0.25;
        color = mix(u_coreBlazeColor, u_coreColor, t);
    } else if (v_spectralType < 0.55) {
        float t = (v_spectralType - 0.25) / 0.30;
        color = mix(u_coreColor, u_armInnerColor, t);
    } else if (v_spectralType < 0.80) {
        float t = (v_spectralType - 0.55) / 0.25;
        color = mix(u_armInnerColor, u_armOuterColor, t);
    } else {
        float t = (v_spectralType - 0.80) / 0.20;
        color = mix(u_armOuterColor, u_accentColor, t);
    }

    // Blazing Core Intensity Boost
    float blaze = 1.0 + (v_coreFactor * (u_coreGlowBoost - 1.0));
    vec3 finalColor = color * blaze;

    // Discs close to the camera receive a soft opacity reduction to feel like luminous volumetric orbs
    float closeDiscSoftness = smoothstep(0.08, 2.5, v_pointDist);
    float alpha = intensity * v_fade * mix(0.40, 1.0, closeDiscSoftness);

    // Premultiplied additive blend output
    fragColor = vec4(finalColor * alpha, alpha);
}
`;

export const GALAXY_PINPRICK_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in float a_radius;
layout(location = 1) in float a_baseAngle;
layout(location = 2) in float a_zOffset;
layout(location = 3) in float a_size;
layout(location = 4) in float a_spectralType;
layout(location = 5) in float a_driftPhase;

uniform mat4 u_viewProjectionMatrix;
uniform mat4 u_modelViewMatrix;
uniform float u_time;
uniform float u_rotationSpeed;
uniform float u_differentialSpeed;
uniform float u_driftSpeed;
uniform float u_driftAmplitude;
uniform float u_pointScale;
uniform float u_minPointSize;
uniform float u_maxPointSize;
uniform float u_viewportHeight;
uniform float u_nearFadeDistance;

out float v_spectralType;
out float v_fade;
out float v_coreFactor;
out float v_pointDist;

void main() {
    // 1. Angular motion with differential rotation
    float diffOffset = (u_differentialSpeed / max(1.2, a_radius)) * u_time;
    float theta = a_baseAngle + (u_rotationSpeed * u_time) + diffOffset;

    // 2. Micro-drift and stellar scintillation
    float driftTime = u_time * u_driftSpeed + a_driftPhase;
    float dr = sin(driftTime * 1.6) * u_driftAmplitude;
    float dz = cos(driftTime * 2.3) * (u_driftAmplitude * 0.6);
    float r = max(0.02, a_radius + dr);

    // Galaxy disk lies on the X-Z plane with Y as vertical axis
    float posX = r * cos(theta);
    float posZ = r * sin(theta);
    float posY = a_zOffset + dz;

    vec4 worldPos = vec4(posX, posY, posZ, 1.0);
    vec4 viewPos = u_modelViewMatrix * worldPos;
    gl_Position = u_viewProjectionMatrix * worldPos;

    // 3. Pin-prick Point Sizing
    // Pin-prick stars remain microscopic points across all distances without ballooning into discs.
    // Point size is governed directly by intrinsic stellar magnitude (a_size) and clamped tightly.
    float dist = max(0.05, -viewPos.z);
    v_pointDist = dist;

    // Very subtle distance response (dist^-0.05) ensures nearby stars maintain sharp subpixel focus
    // without perceptually swelling into discs.
    float distSubtle = pow(clamp(dist, 0.4, 30.0), -0.05);
    float pSize = a_size * u_pointScale * (u_viewportHeight / 900.0) * distSubtle;
    gl_PointSize = clamp(pSize, u_minPointSize, u_maxPointSize);

    // 4. Smooth Near-Plane Dissolve
    // Stars softly dissolve right as they cross the camera near threshold to prevent clipping pops
    v_fade = smoothstep(0.05, u_nearFadeDistance, dist);

    // 5. Core Proximity
    v_coreFactor = clamp(1.0 - (a_radius / 3.2), 0.0, 1.0);
    v_spectralType = a_spectralType;
}
`;

export const GALAXY_PINPRICK_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float v_spectralType;
in float v_fade;
in float v_coreFactor;
in float v_pointDist;

uniform vec3 u_coreColor;
uniform vec3 u_coreBlazeColor;
uniform vec3 u_armInnerColor;
uniform vec3 u_armOuterColor;
uniform vec3 u_accentColor;
uniform float u_coreGlowBoost;

out vec4 fragColor;

void main() {
    // Distance from center of point sprite [-0.5, 0.5]
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);

    if (distSq > 0.25) {
        discard;
    }

    // Pin-prick Gaussian needle:
    // A steep exponential falloff concentrates photon energy into the central subpixel,
    // reading visually as a razor-sharp, sparkling needle of light while smoothly reaching 0
    // at the boundaries to prevent quad clipping or temporal crawling.
    float intensity = exp(-distSq * 72.0);

    // Spectral Classification & Palette Blending
    vec3 color;
    if (v_spectralType < 0.25) {
        float t = v_spectralType / 0.25;
        color = mix(u_coreBlazeColor, u_coreColor, t);
    } else if (v_spectralType < 0.55) {
        float t = (v_spectralType - 0.25) / 0.30;
        color = mix(u_coreColor, u_armInnerColor, t);
    } else if (v_spectralType < 0.80) {
        float t = (v_spectralType - 0.55) / 0.25;
        color = mix(u_armInnerColor, u_armOuterColor, t);
    } else {
        float t = (v_spectralType - 0.80) / 0.20;
        color = mix(u_armOuterColor, u_accentColor, t);
    }

    // Depth via Photometric Luminosity (instead of geometric size expansion):
    // Closer stars become brighter and punchier in photon flux rather than growing larger.
    float proximityLuminance = 1.0 + (0.75 / max(v_pointDist, 0.45));

    // Foreground stars transition toward brilliant optical saturation
    float closeWhitening = clamp((1.5 - v_pointDist) * 0.30, 0.0, 0.50);
    vec3 starColor = mix(color, u_coreBlazeColor, closeWhitening);

    // Blazing Core Multiplier
    float blaze = 1.0 + (v_coreFactor * (u_coreGlowBoost - 1.0));
    vec3 finalColor = starColor * blaze * proximityLuminance;

    // Subtle core softening to prevent additive over-saturation in the dense galactic bulge
    float coreSoftening = mix(1.0, 0.65, v_coreFactor);
    float alpha = intensity * v_fade * coreSoftening;

    // Premultiplied additive blend output
    fragColor = vec4(finalColor * alpha, alpha);
}
`;

// Default active shaders (pin-prick experiment active by default)
export const GALAXY_VERTEX_SHADER = GALAXY_PINPRICK_VERTEX_SHADER;
export const GALAXY_FRAGMENT_SHADER = GALAXY_PINPRICK_FRAGMENT_SHADER;
