#version 300 es
precision highp float;

in vec2 v_uv;
in vec3 v_normal;

uniform vec4 u_color;
uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
    fragColor = u_color * texture(u_texture, v_uv);
}
