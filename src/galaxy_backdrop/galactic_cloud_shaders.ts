/**
 * GLSL ES 3.00 shader sources for the Celestial Horizon background pass.
 * Implements full-screen quad view-ray reconstruction and a multi-stop celestial horizon gradient band.
 */

export const GALACTIC_CLOUD_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 aPosition;

uniform float uAspect;
uniform float uFovScale;
uniform float uPitch;
uniform float uYaw;
uniform float uRoll;
uniform float uPitchOffset;
uniform float uYawOffset;

out vec3 vRay;

// Euler angle 3D rotation matrix
mat3 createRotationMatrix(float pitch, float yaw, float roll) {
    float cp = cos(pitch);
    float sp = sin(pitch);
    float cy = cos(yaw);
    float sy = sin(yaw);
    float cr = cos(roll);
    float sr = sin(roll);

    mat3 rx = mat3(
        1.0, 0.0, 0.0,
        0.0, cp, -sp,
        0.0, sp, cp
    );

    mat3 ry = mat3(
        cy, 0.0, sy,
        0.0, 1.0, 0.0,
        -sy, 0.0, cy
    );

    mat3 rz = mat3(
        cr, -sr, 0.0,
        sr, cr, 0.0,
        0.0, 0.0, 1.0
    );

    return ry * rx * rz;
}

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);

    // Reconstruct view ray vector in world space
    vec3 dir = vec3(aPosition.x * uAspect * uFovScale, aPosition.y * uFovScale, -1.0);
    mat3 rot = createRotationMatrix(uPitch + uPitchOffset, uYaw + uYawOffset, uRoll);
    vRay = rot * dir;
}
`;

export const GALACTIC_CLOUD_FRAGMENT_SHADER = `#version 300 es
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
`;
