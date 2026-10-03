#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;

uniform mat4 u_viewProjectionMatrix;
uniform mat4 u_modelMatrix;
uniform float u_rotationY;

out vec3 v_texCoord;

void main() {
    // Apply Y-axis orientation rotation to the direction vector
    float s = sin(u_rotationY);
    float c = cos(u_rotationY);
    mat3 rotY = mat3(
        c,   0.0, -s,
        0.0, 1.0,  0.0,
        s,   0.0,  c
    );
    v_texCoord = rotY * a_position;

    // Transform and project
    vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
    vec4 clipPos = u_viewProjectionMatrix * worldPos;

    // xyww clip-space depth trick places the skybox at max depth (z/w = 1.0)
    gl_Position = clipPos.xyww;
}
