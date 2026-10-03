#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_viewProjectionMatrix;
uniform mat4 u_modelMatrix;

out vec2 v_uv;
out vec3 v_normal;

void main() {
    v_uv = a_uv;
    v_normal = a_normal;
    gl_Position = u_viewProjectionMatrix * u_modelMatrix * vec4(a_position, 1.0);
}

