#version 300 es
precision highp float;

in vec2 v_uv;
in vec3 v_normal;

uniform vec4 u_color;
uniform float u_useTexture;
uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
    vec4 baseColor = u_color;
    if (u_useTexture > 0.5) {
        baseColor *= texture(u_texture, v_uv);
    }
    fragColor = baseColor;
}

