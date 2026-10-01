#version 300 es
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
