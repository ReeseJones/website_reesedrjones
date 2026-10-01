#version 300 es
precision highp float;

in vec3 vRay;

uniform float uHorizonIntensity;
uniform float uHorizonThickness;
uniform vec3 uHorizonColorCenter;
uniform vec3 uHorizonColorOuter;

out vec4 fragColor;

void main() {
    vec3 ray = normalize(vRay);

    float dist = abs(ray.y);
    float normalizedDist = clamp(dist / max(uHorizonThickness, 0.001), 0.0, 1.0);

    // Multi-stop color gradient interpolation from center line to outer atmosphere
    float colorFactor = smoothstep(0.0, 0.65, normalizedDist);
    vec3 gradColor = mix(uHorizonColorCenter, uHorizonColorOuter, colorFactor);

    // Smoothstep falloff to black / 0 opacity at outer boundary
    float alphaFade = smoothstep(1.0, 0.0, normalizedDist) * uHorizonIntensity;

    fragColor = vec4(gradColor, clamp(alphaFade, 0.0, 1.0));
}
