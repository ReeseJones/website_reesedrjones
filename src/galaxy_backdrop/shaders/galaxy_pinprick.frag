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
