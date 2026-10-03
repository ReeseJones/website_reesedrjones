#version 300 es
precision highp float;

in vec3 v_texCoord;

uniform samplerCube u_envMap;
uniform vec3 u_tint;
uniform float u_exposure;

out vec4 fragColor;

void main() {
    vec4 envColor = texture(u_envMap, normalize(v_texCoord));
    vec3 finalColor = envColor.rgb * u_tint * u_exposure;
    fragColor = vec4(finalColor, envColor.a);
}
