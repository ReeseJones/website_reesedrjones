#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;

uniform mat4 u_viewProjectionMatrix;
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_cameraPosition;
uniform vec2 u_viewportSize;
uniform vec2 u_anchor;
uniform vec2 u_size;
uniform int u_billboardMode;
uniform int u_sizeMode;
uniform vec2 u_sizeClamping;

out vec2 v_uv;

void main() {
    v_uv = a_uv;

    // 1. Direct register fetch of anchor 3D world position (column 3 of model matrix)
    vec3 anchorWorld = u_modelMatrix[3].xyz;

    // 2. Local 2D quad offset from anchor pivot
    vec2 localOffset = (a_position - u_anchor) * u_size;

    // 3. Compute billboard basis vectors in world space
    vec3 rightVec;
    vec3 upVec;

    if (u_billboardMode == 1) {
        // Cylindrical mode: quad remains vertical along world Y axis
        upVec = vec3(0.0, 1.0, 0.0);
        vec3 toCam = anchorWorld - u_cameraPosition;
        vec3 r = cross(upVec, toCam);
        float lenR = length(r);
        rightVec = lenR > 0.0001 ? (r / lenR) : vec3(1.0, 0.0, 0.0);
    } else {
        // Spherical mode: quad faces camera plane directly (extracted from view matrix rows)
        rightVec = normalize(vec3(u_viewMatrix[0][0], u_viewMatrix[1][0], u_viewMatrix[2][0]));
        upVec = normalize(vec3(u_viewMatrix[0][1], u_viewMatrix[1][1], u_viewMatrix[2][1]));
    }

    // 4. Output position based on sizing mode
    if (u_sizeMode == 1) {
        // WorldSpace mode: sized in 3D world units
        vec3 worldPos = anchorWorld + (localOffset.x * rightVec) + (localOffset.y * upVec);
        gl_Position = u_viewProjectionMatrix * vec4(worldPos, 1.0);
    } else {
        // ScreenSpace (mode 0) and ClampedScreenSpace (mode 2)
        float scaleFactor = 1.0;
        if (u_sizeMode == 2) {
            float dist = max(distance(anchorWorld, u_cameraPosition), 0.0001);
            float focalLengthPixels = u_projectionMatrix[1][1] * u_viewportSize.y * 0.5;
            float apparentPixels = (u_size.y * focalLengthPixels) / dist;
            float clampedPixels = clamp(apparentPixels, u_sizeClamping.x, u_sizeClamping.y);
            scaleFactor = clampedPixels / max(u_size.y, 0.0001);
        }

        vec4 anchorClip = u_viewProjectionMatrix * vec4(anchorWorld, 1.0);
        if (anchorClip.w <= 0.0) {
            gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
            return;
        }
        vec2 rightScreen = vec2(1.0, 0.0);
        vec2 upScreen = vec2(0.0, 1.0);

        if (u_billboardMode == 1) {
            vec4 upProj = u_viewProjectionMatrix * vec4(anchorWorld + upVec, 1.0);
            vec2 upScreenVec = (upProj.xy / upProj.w) - (anchorClip.xy / anchorClip.w);
            upScreenVec.x *= u_viewportSize.x / max(u_viewportSize.y, 1.0);
            float lenUp = length(upScreenVec);
            if (lenUp > 0.0001) {
                upScreen = upScreenVec / lenUp;
                rightScreen = vec2(upScreen.y, -upScreen.x);
            }
        }

        vec2 screenOffset = (localOffset * scaleFactor).x * rightScreen + (localOffset * scaleFactor).y * upScreen;
        vec2 deltaClip = (2.0 * screenOffset / u_viewportSize) * anchorClip.w;
        gl_Position = vec4(anchorClip.xy + deltaClip, anchorClip.z, anchorClip.w);
    }
}
