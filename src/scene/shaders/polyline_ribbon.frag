#version 300 es
precision highp float;

in float v_side;
in float v_progress;

uniform vec4 u_color;
uniform vec4 u_glowColor;
uniform float u_glowIntensity;
uniform float u_time;
uniform float u_dashSpeed;
uniform float u_dashFrequency;

out vec4 fragColor;

const float CORE_EXPONENT = 16.0;
const float HALO_EXPONENT = 2.5;

void main() {
    float v2 = v_side * v_side;

    // Sub-pixel anti-aliasing feathering at ribbon edges
    float feather = max(fwidth(v_side) * 1.5, 0.001);
    float edgeAlpha = smoothstep(1.0, 1.0 - feather, abs(v_side));

    // Core energy beam and atmospheric halo falloffs
    float coreFalloff = exp(-CORE_EXPONENT * v2);
    float haloFalloff = exp(-HALO_EXPONENT * v2);

    // Traveling dash pulse along the route
    float pulse = 1.0;
    if (u_dashFrequency > 0.0 || u_dashSpeed != 0.0) {
        float phase = v_progress * u_dashFrequency - u_time * u_dashSpeed;
        float dashPattern = smoothstep(-0.2, 0.3, sin(phase));
        pulse = mix(0.15, 1.0 + u_glowIntensity, dashPattern);
    }

    // Color composition with dash pulse modulation
    vec3 baseColor = mix(u_color.rgb, u_glowColor.rgb, coreFalloff);
    vec3 finalRgb = baseColor * (haloFalloff * pulse);
    float finalAlpha = max(haloFalloff * u_color.a, coreFalloff * u_glowColor.a) * edgeAlpha * min(pulse, 1.0);

    fragColor = vec4(finalRgb, finalAlpha);
}
