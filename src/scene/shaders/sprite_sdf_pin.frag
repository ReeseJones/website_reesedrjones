#version 300 es
precision highp float;

in vec2 v_uv;

uniform vec2 u_size;
uniform vec4 u_tintColor;
uniform vec4 u_innerDotColor;
uniform float u_innerRadius;
uniform float u_haloWidth;

out vec4 fragColor;

// Canonical 2D Rounded Cone SDF: smooth teardrop connecting tip (rTip at origin) to head (rHead at headY)
float sdTeardropPin(vec2 p, float rTip, float rHead, float headY) {
    vec2 q = vec2(abs(p.x), p.y);
    float b = (rTip - rHead) / headY;
    float a = sqrt(1.0 - b * b);
    float k = dot(q, vec2(-b, a));

    if (k < 0.0) return length(q) - rTip;
    if (k > a * headY) return length(q - vec2(0.0, headY)) - rHead;

    return dot(q, vec2(a, b)) - rTip;
}

void main() {
    // 1. Aspect-corrected normalized local coordinates:
    // Scale horizontal coordinate by aspect ratio (width / height) so circles and shapes remain isotropic
    float aspect = (u_size.y > 0.0 && u_size.x > 0.0) ? (u_size.x / u_size.y) : 1.0;
    vec2 p = vec2((v_uv.x - 0.5) * aspect, v_uv.y);

    // 2. Teardrop pin geometry parameters scaled isotropically to quad bounds:
    float headRadius = min(aspect * 0.44, 0.28);
    float headCenterY = clamp(1.0 - headRadius - 0.05, 0.4, 0.75);
    const float tipRadius = 0.015;

    float dPin = sdTeardropPin(p, tipRadius, headRadius, headCenterY);

    // 3. Inner core dot centered inside the head bulb
    float innerR = u_innerRadius > 0.0 ? u_innerRadius : (headRadius * 0.38);
    float dInner = length(p - vec2(0.0, headCenterY)) - innerR;

    // 4. Safe anti-aliasing (edge0 < edge1 guaranteed)
    float pixelDelta = max(fwidth(dPin), 0.001);
    float pinAlpha = clamp(0.5 - dPin / pixelDelta, 0.0, 1.0);

    float innerPixelDelta = max(fwidth(dInner), 0.001);
    float innerAlpha = clamp(0.5 - dInner / innerPixelDelta, 0.0, 1.0);

    // 5. Straight alpha color composition (eliminates dark edge fringe in non-premultiplied alpha)
    vec3 baseColor = mix(u_tintColor.rgb, u_innerDotColor.rgb, innerAlpha * u_innerDotColor.a);
    float finalAlpha = pinAlpha * u_tintColor.a;

    // 6. Soft halo / drop shadow exponential falloff
    if (u_haloWidth > 0.0) {
        float haloFalloff = max(u_haloWidth * 0.25, 0.005);
        float haloAlpha = exp(-max(dPin, 0.0) / haloFalloff) * (1.0 - pinAlpha) * 0.4;
        baseColor = mix(vec3(0.0), baseColor, pinAlpha);
        finalAlpha = max(finalAlpha, haloAlpha);
    }

    if (finalAlpha <= 0.001) {
        discard;
    }

    fragColor = vec4(baseColor, finalAlpha);
}
