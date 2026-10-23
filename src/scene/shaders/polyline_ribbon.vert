#version 300 es
precision highp float;

layout(location = 0) in vec3 a_current;
layout(location = 1) in vec3 a_previous;
layout(location = 2) in vec3 a_next;
layout(location = 3) in vec2 a_sideAndProgress;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec2 u_viewportResolution;
uniform float u_lineWidth;
uniform float u_miterLimit;

out float v_side;
out float v_progress;

const float NEAR_EPSILON = 0.001;
const float COS_THRESHOLD = 0.1;

void main() {
    float side = a_sideAndProgress.x;
    float progress = a_sideAndProgress.y;

    v_side = side;
    v_progress = progress;

    mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;

    vec4 cCurr = mvp * vec4(a_current, 1.0);
    vec4 cPrev = mvp * vec4(a_previous, 1.0);
    vec4 cNext = mvp * vec4(a_next, 1.0);

    // Near-plane horizon clipping correction
    if (cCurr.w > NEAR_EPSILON) {
        if (cPrev.w <= NEAR_EPSILON) {
            float t = (NEAR_EPSILON - cCurr.w) / (cPrev.w - cCurr.w);
            cPrev = mix(cCurr, cPrev, t);
        }
        if (cNext.w <= NEAR_EPSILON) {
            float t = (NEAR_EPSILON - cCurr.w) / (cNext.w - cCurr.w);
            cNext = mix(cCurr, cNext, t);
        }
    } else {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    // Convert homogeneous coordinates to 2D pixel coordinates
    vec2 sCurr = (cCurr.xy / cCurr.w) * (u_viewportResolution * 0.5);
    vec2 sPrev = (cPrev.xy / cPrev.w) * (u_viewportResolution * 0.5);
    vec2 sNext = (cNext.xy / cNext.w) * (u_viewportResolution * 0.5);

    // Screen tangents
    vec2 dirIn = sCurr - sPrev;
    vec2 dirOut = sNext - sCurr;

    float lenIn = length(dirIn);
    float lenOut = length(dirOut);

    vec2 tIn = lenIn > 0.0001 ? (dirIn / lenIn) : vec2(0.0);
    vec2 tOut = lenOut > 0.0001 ? (dirOut / lenOut) : vec2(0.0);

    if (lenIn <= 0.0001 && lenOut > 0.0001) {
        tIn = tOut;
    } else if (lenOut <= 0.0001 && lenIn > 0.0001) {
        tOut = tIn;
    } else if (lenIn <= 0.0001 && lenOut <= 0.0001) {
        tIn = vec2(1.0, 0.0);
        tOut = vec2(1.0, 0.0);
    }

    // 2D counter-clockwise perpendicular normals
    vec2 nIn = vec2(-tIn.y, tIn.x);
    vec2 nOut = vec2(-tOut.y, tOut.x);

    // Miter normal (bisector)
    vec2 nMiter = nIn + nOut;
    float lenMiter = length(nMiter);
    if (lenMiter > 0.0001) {
        nMiter /= lenMiter;
    } else {
        nMiter = nIn;
    }

    // Miter length calculation & spike clamping
    float miterDot = dot(nMiter, nIn);
    float miterLength = 1.0 / max(miterDot, COS_THRESHOLD);
    float scale = min(miterLength, u_miterLimit);

    // Pixel offset
    vec2 offsetPx = nMiter * (side * (u_lineWidth * 0.5) * scale);

    // Convert pixel displacement back to homogeneous clip space
    vec2 offsetClip = (2.0 * offsetPx / u_viewportResolution) * cCurr.w;

    gl_Position = vec4(cCurr.xy + offsetClip, cCurr.z, cCurr.w);
}
