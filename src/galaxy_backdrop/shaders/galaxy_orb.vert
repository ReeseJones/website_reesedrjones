#version 300 es
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
    // Inner stars have slightly higher angular velocity aligned with rotation direction
    float rotDir = u_rotationSpeed < 0.0 ? -1.0 : 1.0;
    float diffOffset = rotDir * (u_differentialSpeed / max(1.2, a_radius)) * u_time;
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
