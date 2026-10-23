#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_texture;
uniform vec4 u_tintColor;
uniform float u_alphaCutoff;

out vec4 fragColor;

void main() {
    vec4 texColor = texture(u_texture, v_uv);
    vec4 finalColor = texColor * u_tintColor;

    if (finalColor.a <= 0.001 || (u_alphaCutoff > 0.0 && finalColor.a < u_alphaCutoff)) {
        discard;
    }

    fragColor = finalColor;
}
