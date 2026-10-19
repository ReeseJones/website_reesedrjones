#version 300 es
layout(location = 0) in vec2 aPosition;

uniform float uAspect;
uniform float uFovScale;
uniform mat3 uCameraRotation;

out vec3 vRay;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);

    // Reconstruct view ray vector in camera space
    vec3 dir = vec3(aPosition.x * uAspect * uFovScale, aPosition.y * uFovScale, -1.0);
    vRay = uCameraRotation * dir;
}
